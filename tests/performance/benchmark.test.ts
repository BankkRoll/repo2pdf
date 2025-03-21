import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { CacheManager } from "../../src/utils/cache-manager";
import { ConfigLoader } from "../../src/config/config-loader";
import { Repo2PDF } from "../../src/index";
import fs from "fs";
import path from "path";

// This is a performance benchmark test
// Skip this test in CI environments or when running quick tests

const SKIP_BENCHMARK_TESTS = process.env.SKIP_BENCHMARK_TESTS === "true";

// Use a small, public repository for benchmarking
const BENCHMARK_REPO = "https://github.com/octocat/Hello-World";
const BENCHMARK_BRANCH = "master";
const OUTPUT_DIR = path.join(__dirname, "../../benchmark-output");

// Benchmark configurations
const BENCHMARK_CONFIGS = [
  {
    name: "Default",
    config: {},
  },
  {
    name: "With Cache",
    config: {
      repository: {
        useCache: true,
      },
      cache: {
        enabled: true,
      },
    },
  },
  {
    name: "With Incremental Processing",
    config: {
      processing: {
        useIncrementalProcessing: true,
        incrementalChunkSize: 2,
      },
    },
  },
  {
    name: "With Cache and Incremental Processing",
    config: {
      repository: {
        useCache: true,
      },
      cache: {
        enabled: true,
      },
      processing: {
        useIncrementalProcessing: true,
        incrementalChunkSize: 2,
      },
    },
  },
];

// Number of iterations for each benchmark
const ITERATIONS = 3;

describe("Performance Benchmark", () => {
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

  it("should run performance benchmarks", async () => {
    if (SKIP_BENCHMARK_TESTS) {
      console.log("Skipping benchmark tests");
      return;
    }

    const results: Record<string, { times: number[]; sizes: number[] }> = {};

    // Run benchmarks for each configuration
    for (const benchConfig of BENCHMARK_CONFIGS) {
      console.log(`Running benchmark: ${benchConfig.name}`);
      results[benchConfig.name] = { times: [], sizes: [] };

      // Clear cache before each benchmark configuration
      const cacheManager = CacheManager.getInstance();
      cacheManager.clearAllCache();

      // Run multiple iterations
      for (let i = 0; i < ITERATIONS; i++) {
        console.log(`  Iteration ${i + 1}/${ITERATIONS}`);

        const outputPath = path.join(
          OUTPUT_DIR,
          `benchmark-${benchConfig.name.toLowerCase().replace(/\s+/g, "-")}-${i + 1}.pdf`,
        );

        const configLoader = ConfigLoader.getInstance();
        const config = await configLoader.loadConfig({
          repository: {
            url: BENCHMARK_REPO,
            branch: BENCHMARK_BRANCH,
            vcsType: "github",
            ...benchConfig.config.repository,
          },
          output: {
            format: "pdf",
            outputPath,
            singleFile: true,
          },
          processing: {
            ...benchConfig.config.processing,
          },
          cache: {
            ...benchConfig.config.cache,
          },
        });

        const startTime = Date.now();
        const repo2pdf = new Repo2PDF(config);
        const result = await repo2pdf.convert();
        const endTime = Date.now();

        const executionTime = endTime - startTime;
        results[benchConfig.name].times.push(executionTime);
        results[benchConfig.name].sizes.push(result.fileSize);

        console.log(
          `    Time: ${executionTime}ms, Size: ${result.fileSize} bytes`,
        );
      }

      // Calculate statistics
      const times = results[benchConfig.name].times;
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const stdDev = Math.sqrt(
        times.map((t) => Math.pow(t - avgTime, 2)).reduce((a, b) => a + b, 0) /
          times.length,
      );

      console.log(`  Results for ${benchConfig.name}:`);
      console.log(`    Average Time: ${avgTime.toFixed(2)}ms`);
      console.log(`    Min Time: ${minTime}ms`);
      console.log(`    Max Time: ${maxTime}ms`);
      console.log(`    Standard Deviation: ${stdDev.toFixed(2)}ms`);
    }

    // Compare results
    console.log("\nComparison:");
    const baselineAvg =
      results["Default"].times.reduce((a, b) => a + b, 0) /
      results["Default"].times.length;

    for (const benchConfig of BENCHMARK_CONFIGS) {
      if (benchConfig.name === "Default") continue;

      const avg =
        results[benchConfig.name].times.reduce((a, b) => a + b, 0) /
        results[benchConfig.name].times.length;
      const improvement = ((baselineAvg - avg) / baselineAvg) * 100;

      console.log(
        `  ${benchConfig.name} vs Default: ${improvement > 0 ? "+" : ""}${improvement.toFixed(2)}%`,
      );
    }

    // Basic assertions to verify benchmark ran successfully
    expect(Object.keys(results).length).toBe(BENCHMARK_CONFIGS.length);
    for (const benchConfig of BENCHMARK_CONFIGS) {
      expect(results[benchConfig.name].times.length).toBe(ITERATIONS);
      expect(results[benchConfig.name].sizes.length).toBe(ITERATIONS);
    }
  }, 300000); // Increase timeout to 5 minutes
});
