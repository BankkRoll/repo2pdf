/**
 * Security regression tests.
 *
 * Two distinct concerns are covered:
 *  1. Path containment for the LocalFetcher — a relative path that escapes the
 *     repository root must not resolve to a file outside the base path.
 *  2. Token-leak prevention — when a remote API responds with an error whose
 *     body echoes the caller's credential, the thrown error must surface only a
 *     safe summary (status + public message) and never the raw secret.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalFetcher } from "../src/fetchers/local-fetcher";
import { GitLabFetcher } from "../src/fetchers/gitlab-fetcher";
import { BitbucketFetcher } from "../src/fetchers/bitbucket-fetcher";
import { MOCK_REPO_PATH } from "./helpers/test-utils";

describe("security: LocalFetcher path containment", () => {
  it("fetches a normal in-repo relative path", async () => {
    const fetcher = new LocalFetcher();
    await fetcher.initialize({ url: "", localPath: MOCK_REPO_PATH });

    const file = await fetcher.fetchFile("src/index.ts");

    expect(file.path).toBe("src/index.ts");
    expect(file.type).toBe("code");
    expect(typeof file.content).toBe("string");
  });

  it("rejects a path that traverses out of the repository root", async () => {
    const fetcher = new LocalFetcher();
    await fetcher.initialize({ url: "", localPath: MOCK_REPO_PATH });

    await expect(
      fetcher.fetchFile("../../some-outside-path"),
    ).rejects.toThrow();
  });

  it("rejects a classic ../../../etc/passwd traversal", async () => {
    const fetcher = new LocalFetcher();
    await fetcher.initialize({ url: "", localPath: MOCK_REPO_PATH });

    await expect(fetcher.fetchFile("../../../etc/passwd")).rejects.toThrow();
  });

  it("rejects traversal to a real out-of-tree file (no content leak)", async () => {
    const fetcher = new LocalFetcher();
    await fetcher.initialize({ url: "", localPath: MOCK_REPO_PATH });

    // ../../../package.json is a real file ABOVE the mock-repo root. Without a
    // containment guard this would succeed and leak out-of-tree content.
    await expect(fetcher.fetchFile("../../../package.json")).rejects.toThrow(
      /escapes repository root/,
    );
  });
});

describe("security: remote fetcher token-leak prevention", () => {
  const LEAKY_BODY = '{"message":"bad","token":"glpat-SECRET"}';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stub401 = () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(LEAKY_BODY, {
            status: 401,
            statusText: "Unauthorized",
          }),
      ),
    );
  };

  it("GitLab makeApiRequest does not leak the token from a 401 body", async () => {
    stub401();

    const fetcher = new GitLabFetcher();
    await fetcher.initialize({
      url: "https://gitlab.com/group/project",
      branch: "main",
      token: "glpat-SECRET",
    });

    let message = "";
    try {
      await fetcher.fetchFile("README.md");
      throw new Error("expected fetchFile to reject");
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("401");
    expect(message).toContain("bad");
    expect(message).not.toContain("glpat-SECRET");
    expect(message).not.toContain("token");
  });

  it("Bitbucket makeApiRequest does not leak the token from a 401 body", async () => {
    stub401();

    const fetcher = new BitbucketFetcher();
    await fetcher.initialize({
      url: "https://bitbucket.org/workspace/repo",
      branch: "main",
      token: "app-user:app-password-SECRET",
    });

    let message = "";
    try {
      await fetcher.fetchFile("README.md");
      throw new Error("expected fetchFile to reject");
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("401");
    expect(message).toContain("bad");
    expect(message).not.toContain("glpat-SECRET");
    expect(message).not.toContain("SECRET");
    expect(message).not.toContain("token");
  });
});
