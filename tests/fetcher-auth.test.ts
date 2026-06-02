/**
 * Fetcher Authentication & Default-Branch Resolution Tests
 *
 * Verifies, with ALL HTTP mocked (offline/deterministic), that the remote
 * fetchers:
 *   - construct the correct Authorization / PRIVATE-TOKEN headers
 *   - resolve the repository/project default branch when no branch is given
 *
 * Bitbucket & GitLab go through global `fetch`, which we stub with
 * vi.stubGlobal. GitHub goes through Octokit, which is mocked at the module
 * level so no real GitHub HTTP is ever performed.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

// Mock @octokit/rest so NO real GitHub HTTP ever happens. Every `new Octokit()`
// returns a controllable fake; the constructor records the options it was
// given (so we can assert the auth token was passed through) on a shared array.
const octokitConstructorCalls: Array<{ auth?: string } | undefined> = [];
const reposGetMock = vi.fn().mockResolvedValue({
  data: { default_branch: "default-from-mock", owner: { login: "owner" } },
  status: 200,
});
const rateLimitGetMock = vi
  .fn()
  .mockResolvedValue({ data: { rate: { remaining: 5000, reset: 0 } } });

vi.mock("@octokit/rest", () => {
  class Octokit {
    public repos = { get: reposGetMock };
    public rateLimit = { get: rateLimitGetMock };
    public auth?: string;
    constructor(opts?: { auth?: string }) {
      octokitConstructorCalls.push(opts);
      this.auth = opts?.auth;
    }
  }
  return { Octokit };
});

import { BitbucketFetcher } from "../src/fetchers/bitbucket-fetcher";
import { GitLabFetcher } from "../src/fetchers/gitlab-fetcher";
import { GitHubFetcher } from "../src/fetchers/github-fetcher";
import type { RepositoryOptions } from "../src/types/config.types";

/**
 * Build a minimal Response-like object that satisfies the code paths the
 * fetchers exercise (ok/status/json/text/arrayBuffer/headers.get).
 */
function makeResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {},
): Response {
  const headerMap = init.headers ?? {};
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: {
      get: (name: string) => headerMap[name] ?? headerMap[name.toLowerCase()] ?? null,
    },
  } as unknown as Response;
}

/**
 * Extract the headers object passed to a fetch() call.
 * Each call is [url, { headers }].
 */
function headersOfCall(call: any[]): Record<string, string> {
  return (call?.[1]?.headers ?? {}) as Record<string, string>;
}

/** Extract the URL (first arg) of a fetch() call. */
function urlOfCall(call: any[]): string {
  return String(call?.[0] ?? "");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BitbucketFetcher auth header construction", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Default: any request returns a repo doc with a mainbranch so that
    // initialize()'s resolveDefaultBranch() succeeds.
    fetchMock = vi.fn(async () =>
      makeResponse({ mainbranch: { name: "main" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("uses Basic base64 auth when the token contains a colon (app password)", async () => {
    const fetcher = new BitbucketFetcher();
    const options: RepositoryOptions = {
      url: "https://bitbucket.org/myworkspace/myrepo",
      vcsType: "bitbucket",
      branch: "main",
      token: "user:apppass",
    };

    await fetcher.initialize(options);
    // Make at least one authenticated request so headers are captured.
    await fetcher.validateRepository();

    expect(fetchMock).toHaveBeenCalled();
    const headers = headersOfCall(fetchMock.mock.calls[0]);
    const expected = "Basic " + Buffer.from("user:apppass").toString("base64");
    expect(headers["Authorization"]).toBe(expected);
    // Every captured call should carry the same Authorization header.
    for (const call of fetchMock.mock.calls) {
      expect(headersOfCall(call)["Authorization"]).toBe(expected);
    }
  });

  it("uses Bearer auth when the token has no colon (workspace/access token)", async () => {
    const fetcher = new BitbucketFetcher();
    const options: RepositoryOptions = {
      url: "https://bitbucket.org/myworkspace/myrepo",
      vcsType: "bitbucket",
      branch: "main",
      token: "workspacetoken",
    };

    await fetcher.initialize(options);
    await fetcher.validateRepository();

    const headers = headersOfCall(fetchMock.mock.calls[0]);
    expect(headers["Authorization"]).toBe("Bearer workspacetoken");
  });

  it("omits Authorization entirely when no token is provided", async () => {
    const fetcher = new BitbucketFetcher();
    await fetcher.initialize({
      url: "https://bitbucket.org/myworkspace/myrepo",
      vcsType: "bitbucket",
      branch: "main",
    });
    await fetcher.validateRepository();

    const headers = headersOfCall(fetchMock.mock.calls[0]);
    expect(headers["Authorization"]).toBeUndefined();
  });
});

describe("BitbucketFetcher default-branch detection", () => {
  it("resolves the default branch from mainbranch.name and uses it for src requests", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      // The repo metadata endpoint (no /src/) returns the default branch.
      if (/\/repositories\/[^/]+\/[^/]+$/.test(u)) {
        return makeResponse({ mainbranch: { name: "develop" } });
      }
      // src/<branch>/<path> listing endpoint — empty directory.
      return makeResponse({ values: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const fetcher = new BitbucketFetcher();
    // NOTE: no `branch` provided -> must be resolved from the API.
    await fetcher.initialize({
      url: "https://bitbucket.org/myworkspace/myrepo",
      vcsType: "bitbucket",
    });

    await fetcher.fetchRepository();

    // The very first call must be the repo metadata lookup.
    expect(urlOfCall(fetchMock.mock.calls[0])).toBe(
      "https://api.bitbucket.org/2.0/repositories/myworkspace/myrepo",
    );

    // Subsequent src listing requests must target the resolved "develop" branch.
    const srcCalls = fetchMock.mock.calls
      .map(urlOfCall)
      .filter((u) => u.includes("/src/"));
    expect(srcCalls.length).toBeGreaterThan(0);
    for (const u of srcCalls) {
      expect(u).toContain("/src/develop/");
    }
    // And never the fallback "main".
    expect(srcCalls.some((u) => u.includes("/src/main/"))).toBe(false);
  });

  it("falls back to 'main' when the repo metadata request fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (/\/repositories\/[^/]+\/[^/]+$/.test(u)) {
        // Non-ok, non-retryable status -> makeApiRequest throws ->
        // resolveDefaultBranch swallows and returns "main".
        return makeResponse("not found", { ok: false, status: 404 });
      }
      return makeResponse({ values: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const fetcher = new BitbucketFetcher();
    await fetcher.initialize({
      url: "https://bitbucket.org/myworkspace/myrepo",
      vcsType: "bitbucket",
    });

    // The resolved branch must be the "main" fallback.
    expect((fetcher as any).branch).toBe("main");

    // validateRepository hits /repositories (which 404s) -> false, so fetch
    // the listing directly to inspect the branch in the URL.
    await fetcher.fetchFile("README.md").catch(() => undefined);
    const srcCalls = fetchMock.mock.calls
      .map(urlOfCall)
      .filter((u) => u.includes("/src/"));
    expect(srcCalls.length).toBeGreaterThan(0);
    for (const u of srcCalls) {
      expect(u).toContain("/src/main/");
    }
  });
});

describe("GitLabFetcher auth header construction", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/projects/") && !u.includes("/repository/")) {
        return makeResponse({ default_branch: "main" });
      }
      // /user rate-limit probe and anything else.
      return makeResponse(
        {},
        { headers: { "RateLimit-Remaining": "600", "RateLimit-Reset": "0" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends the PRIVATE-TOKEN header with the raw token value", async () => {
    const fetcher = new GitLabFetcher();
    await fetcher.initialize({
      url: "https://gitlab.com/mygroup/myproject",
      vcsType: "gitlab",
      branch: "main",
      token: "abc",
    });

    expect(fetchMock).toHaveBeenCalled();
    // Every captured request must carry the PRIVATE-TOKEN header.
    for (const call of fetchMock.mock.calls) {
      expect(headersOfCall(call)["PRIVATE-TOKEN"]).toBe("abc");
    }
  });

  it("omits PRIVATE-TOKEN when no token is provided", async () => {
    const fetcher = new GitLabFetcher();
    await fetcher.initialize({
      url: "https://gitlab.com/mygroup/myproject",
      vcsType: "gitlab",
      branch: "main",
    });

    for (const call of fetchMock.mock.calls) {
      expect(headersOfCall(call)["PRIVATE-TOKEN"]).toBeUndefined();
    }
  });
});

describe("GitLabFetcher default-branch detection", () => {
  it("resolves default_branch from /projects/{id} and uses it for tree/file requests", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      // Project metadata endpoint (no /repository/) -> default branch.
      if (u.includes("/projects/") && !u.includes("/repository/")) {
        return makeResponse({ default_branch: "trunk" });
      }
      if (u.includes("/repository/tree")) {
        // Empty tree (single page) so fetchRepository completes quickly.
        return makeResponse([], { headers: { "X-Total-Pages": "1" } });
      }
      // /user probe and fallthrough.
      return makeResponse(
        {},
        { headers: { "RateLimit-Remaining": "600", "RateLimit-Reset": "0" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const fetcher = new GitLabFetcher();
    // No branch -> resolve from API.
    await fetcher.initialize({
      url: "https://gitlab.com/mygroup/myproject",
      vcsType: "gitlab",
    });

    await fetcher.fetchRepository();

    // The project path is URL-encoded as a single id segment.
    const encodedId = encodeURIComponent("mygroup/myproject");
    expect(urlOfCall(fetchMock.mock.calls[0])).toBe(
      `https://gitlab.com/api/v4/projects/${encodedId}`,
    );

    const treeCalls = fetchMock.mock.calls
      .map(urlOfCall)
      .filter((u) => u.includes("/repository/tree"));
    expect(treeCalls.length).toBeGreaterThan(0);
    for (const u of treeCalls) {
      expect(u).toContain("ref=trunk");
    }
    expect(treeCalls.some((u) => u.includes("ref=main"))).toBe(false);
  });

  it("falls back to 'main' when /projects/{id} metadata request fails", async () => {
    // The project metadata endpoint 404s (non-retryable) so makeApiRequest
    // throws inside resolveDefaultBranch, which swallows it and returns "main".
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/projects/") && !u.includes("/repository/")) {
        return makeResponse("not found", { ok: false, status: 404 });
      }
      // /user probe and anything else succeed (so initialize() completes).
      return makeResponse(
        {},
        { headers: { "RateLimit-Remaining": "600", "RateLimit-Reset": "0" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const fetcher = new GitLabFetcher();
    await fetcher.initialize({
      url: "https://gitlab.com/mygroup/myproject",
      vcsType: "gitlab",
    });

    // The resolved branch must be the "main" fallback.
    expect((fetcher as any).branch).toBe("main");
  });
});

describe("GitHubFetcher auth & default-branch detection (Octokit mocked)", () => {
  beforeEach(() => {
    octokitConstructorCalls.length = 0;
    reposGetMock.mockReset().mockResolvedValue({
      data: { default_branch: "default-from-mock", owner: { login: "owner" } },
      status: 200,
    });
    rateLimitGetMock
      .mockReset()
      .mockResolvedValue({ data: { rate: { remaining: 5000, reset: 0 } } });
  });

  it("passes the token to the Octokit constructor (authenticated client)", async () => {
    reposGetMock.mockResolvedValue({
      data: { default_branch: "main2", owner: { login: "owner" } },
      status: 200,
    });

    const fetcher = new GitHubFetcher();
    // No branch -> initialize must call resolveDefaultBranch -> repos.get.
    await fetcher.initialize({
      url: "https://github.com/owner/repo",
      vcsType: "github",
      token: "ghp_token123",
    });

    // initialize() recreates Octokit with { auth: token } when a token is
    // present. The most recent construction must carry our token.
    const authedCall = octokitConstructorCalls.find(
      (c) => c?.auth === "ghp_token123",
    );
    expect(authedCall).toBeDefined();
    expect(authedCall?.auth).toBe("ghp_token123");
  });

  it("constructs an Octokit WITHOUT auth when no token is provided", async () => {
    const fetcher = new GitHubFetcher();
    await fetcher.initialize({
      url: "https://github.com/owner/repo",
      vcsType: "github",
      branch: "explicit",
    });

    // The no-token branch builds `new Octokit()` (opts undefined / no auth).
    expect(
      octokitConstructorCalls.some((c) => c === undefined || c?.auth === undefined),
    ).toBe(true);
    // Explicit branch is honored without any repos.get default-branch lookup.
    expect((fetcher as any).branch).toBe("explicit");
  });

  it("resolves the default branch via repos.get default_branch", async () => {
    reposGetMock.mockResolvedValue({
      data: { default_branch: "main2", owner: { login: "owner" } },
      status: 200,
    });

    const fetcher = new GitHubFetcher();
    await fetcher.initialize({
      url: "https://github.com/owner/repo",
      vcsType: "github",
    });

    expect((fetcher as any).branch).toBe("main2");
    expect(reposGetMock).toHaveBeenCalledWith({ owner: "owner", repo: "repo" });
  });

  it("falls back to 'main' when repos.get rejects", async () => {
    reposGetMock.mockRejectedValue(new Error("boom"));

    const fetcher = new GitHubFetcher();
    await fetcher.initialize({
      url: "https://github.com/owner/repo",
      vcsType: "github",
    });

    expect((fetcher as any).branch).toBe("main");
  });
});
