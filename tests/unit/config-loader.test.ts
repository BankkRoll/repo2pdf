import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { ConfigLoader } from "../../src/config/config-loader";
import fs from "fs";

// Mock fs and cosmiconfig
jest.mock("fs");
jest.mock("cosmiconfig", () => ({
  cosmiconfig: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({
      config: {
        repository: {
          branch: "develop",
        },
        style: {
          theme: "monokai",
        },
      },
    }),
  })),
}));

describe("ConfigLoader", () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.REPO2PDF_TOKEN;
    delete process.env.REPO2PDF_BRANCH;
    delete process.env.REPO2PDF_DEBUG;

    // Mock fs.existsSync and fs.mkdirSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should load default config when no options provided", async () => {
    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig();

    expect(config).toEqual(
      expect.objectContaining({
        repository: expect.objectContaining({
          branch: "develop", // From mocked config file
        }),
        style: expect.objectContaining({
          theme: "monokai", // From mocked config file
        }),
      }),
    );
  });

  it("should merge CLI options with higher priority", async () => {
    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig({
      repository: {
        url: "https://github.com/user/repo",
        branch: "feature/test",
      },
    });

    expect(config).toEqual(
      expect.objectContaining({
        repository: expect.objectContaining({
          url: "https://github.com/user/repo",
          branch: "feature/test", // CLI option overrides config file
        }),
        style: expect.objectContaining({
          theme: "monokai", // From mocked config file
        }),
      }),
    );
  });

  it("should load environment variables", async () => {
    process.env.REPO2PDF_TOKEN = "test-token";
    process.env.REPO2PDF_BRANCH = "env-branch";
    process.env.REPO2PDF_DEBUG = "true";

    const configLoader = ConfigLoader.getInstance();
    const config = await configLoader.loadConfig();

    expect(config).toEqual(
      expect.objectContaining({
        repository: expect.objectContaining({
          token: "test-token", // From env var
          branch: "develop", // Config file overrides env var
        }),
        debug: true, // From env var
      }),
    );
  });

  it("should create output directory if it does not exist", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const configLoader = ConfigLoader.getInstance();
    await configLoader.loadConfig({
      output: {
        outputPath: "/path/to/output.pdf",
      },
    });

    expect(fs.mkdirSync).toHaveBeenCalledWith("/path/to", { recursive: true });
  });

  it("should throw error if repository URL or local path is not provided", async () => {
    const configLoader = ConfigLoader.getInstance();

    await expect(
      configLoader.loadConfig({
        repository: {
          url: "",
          localPath: "",
        },
      }),
    ).rejects.toThrow("Repository URL or local path must be provided");
  });

  it("should throw error if output path is not provided", async () => {
    const configLoader = ConfigLoader.getInstance();

    await expect(
      configLoader.loadConfig({
        repository: {
          url: "https://github.com/user/repo",
        },
        output: {
          outputPath: "",
        },
      }),
    ).rejects.toThrow("Output path must be provided");
  });
});
