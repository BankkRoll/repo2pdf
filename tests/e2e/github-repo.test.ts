import { Repo2PDF, convertRepository } from "../../src/index";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { ConfigLoader } from "../../src/config/config-loader";
import fs from "fs";
import path from "path";

// This is an end-to-end test that uses a real GitHub repository
// It will make actual API calls and generate real output files
// Skip this test in CI environments or when running quick tests

const SKIP_E2E_TESTS = process.env.SKIP_E2E_TESTS === "true";

// Use a small, public repository for testing
const TEST_REPO = "https://github.com/octocat/Hello-World";
const TEST_BRANCH = "master";
const OUTPUT_DIR = path.join(__dirname, "../../test-output");

describe("GitHub Repository E2E Test", () => {
  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up output files
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
      }
      fs.rmdirSync(OUTPUT_DIR);
    }
  });

  it("should convert a real GitHub repository to PDF", async () => {
    if (SKIP_E2E_TESTS) {
      console.log("Skipping E2E tests");
      return;
    }

    const outputPath = path.join(OUTPUT_DIR, "github-repo.pdf");

    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig({
      repository: {
        url: TEST_REPO,
        branch: TEST_BRANCH,
        vcsType: "github",
        useCache: true,
      },
      output: {
        format: "pdf",
        outputPath,
        singleFile: true,
      },
      processing: {
        useIncrementalProcessing: true,
      },
      cache: {
        enabled: true,
      },
    });

    const repo2pdf = new Repo2PDF(config);
    const result = await repo2pdf.convert();

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputPath);
    expect(result.format).toBe("pdf");
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.generationTime).toBeGreaterThan(0);

    // Check if the file exists
    expect(fs.existsSync(outputPath)).toBe(true);

    // Check if the file has content
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(0);
  }, 60000); // Increase timeout to 60 seconds

  it("should convert a real GitHub repository to HTML", async () => {
    if (SKIP_E2E_TESTS) {
      console.log("Skipping E2E tests");
      return;
    }

    const outputPath = path.join(OUTPUT_DIR, "github-repo.html");

    const result = await convertRepository({
      repository: {
        url: TEST_REPO,
        branch: TEST_BRANCH,
        vcsType: "github",
      },
      output: {
        format: "html",
        outputPath,
        singleFile: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputPath);
    expect(result.format).toBe("html");
    expect(result.fileSize).toBeGreaterThan(0);

    // Check if the file exists
    expect(fs.existsSync(outputPath)).toBe(true);

    // Check if the file has content
    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("Hello-World");
  }, 60000); // Increase timeout to 60 seconds
});
