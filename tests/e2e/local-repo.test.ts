import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { ConfigLoader } from "../../src/config/config-loader";
import { Repo2PDF } from "../../src/index";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// This is an end-to-end test that uses a local repository
// Skip this test in CI environments or when running quick tests

const SKIP_E2E_TESTS = process.env.SKIP_E2E_TESTS === "true";

const TEST_REPO_DIR = path.join(__dirname, "../../test-repo");
const OUTPUT_DIR = path.join(__dirname, "../../test-output");

describe("Local Repository E2E Test", () => {
  beforeAll(async () => {
    if (SKIP_E2E_TESTS) {
      return;
    }

    // Create test repository
    if (!fs.existsSync(TEST_REPO_DIR)) {
      fs.mkdirSync(TEST_REPO_DIR, { recursive: true });

      // Initialize git repository
      await execAsync("git init", { cwd: TEST_REPO_DIR });

      // Create some test files
      fs.writeFileSync(
        path.join(TEST_REPO_DIR, "README.md"),
        "# Test Repository\n\nThis is a test repository for repo2pdf.",
      );
      fs.writeFileSync(
        path.join(TEST_REPO_DIR, "index.js"),
        'console.log("Hello, world!");\n\nfunction test() {\n  return "test";\n}\n\nmodule.exports = test;',
      );
      fs.mkdirSync(path.join(TEST_REPO_DIR, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(TEST_REPO_DIR, "src", "utils.js"),
        "function add(a, b) {\n  return a + b;\n}\n\nmodule.exports = { add };",
      );

      // Create a binary file
      const buffer = Buffer.alloc(100, 0);
      fs.writeFileSync(path.join(TEST_REPO_DIR, "binary.bin"), buffer);

      // Commit the files
      await execAsync("git add .", { cwd: TEST_REPO_DIR });
      await execAsync('git config user.email "test@example.com"', {
        cwd: TEST_REPO_DIR,
      });
      await execAsync('git config user.name "Test User"', {
        cwd: TEST_REPO_DIR,
      });
      await execAsync('git commit -m "Initial commit"', { cwd: TEST_REPO_DIR });
    }

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

    // Clean up test repository
    if (fs.existsSync(TEST_REPO_DIR)) {
      const deleteDir = (dirPath: string) => {
        if (fs.existsSync(dirPath)) {
          fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteDir(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(dirPath);
        }
      };

      deleteDir(TEST_REPO_DIR);
    }
  });

  it("should convert a local repository to PDF", async () => {
    if (SKIP_E2E_TESTS) {
      console.log("Skipping E2E tests");
      return;
    }

    const outputPath = path.join(OUTPUT_DIR, "local-repo.pdf");

    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig({
      repository: {
        localPath: TEST_REPO_DIR,
        vcsType: "local",
      },
      output: {
        format: "pdf",
        outputPath,
        singleFile: true,
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

  it("should convert a local repository to HTML with incremental processing", async () => {
    if (SKIP_E2E_TESTS) {
      console.log("Skipping E2E tests");
      return;
    }

    const outputPath = path.join(OUTPUT_DIR, "local-repo.html");

    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig({
      repository: {
        localPath: TEST_REPO_DIR,
        vcsType: "local",
      },
      output: {
        format: "html",
        outputPath,
        singleFile: true,
      },
      processing: {
        useIncrementalProcessing: true,
        incrementalChunkSize: 1, // Process one file at a time
      },
    });

    const repo2pdf = new Repo2PDF(config);
    const result = await repo2pdf.convert();

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputPath);
    expect(result.format).toBe("html");
    expect(result.fileSize).toBeGreaterThan(0);

    // Check if the file exists
    expect(fs.existsSync(outputPath)).toBe(true);

    // Check if the file has content
    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("Test Repository");
    expect(content).toContain("console.log");
  }, 60000); // Increase timeout to 60 seconds
});
