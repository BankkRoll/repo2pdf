import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { SecureTokenManager } from "../../src/utils/secure-token-manager";
import fs from "fs";
import os from "os";
import path from "path";

// Mock fs, path, os, and crypto
jest.mock("fs");
jest.mock("path");
jest.mock("os");
jest.mock("crypto");

describe("SecureTokenManager", () => {
  let tokenManager: SecureTokenManager;
  const mockTokenStorePath = "/mock/home/.repo2pdf/tokens";

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock os functions
    (os.homedir as jest.Mock).mockReturnValue("/mock/home");
    (os.hostname as jest.Mock).mockReturnValue("test-host");
    (os.userInfo as jest.Mock).mockReturnValue({ username: "test-user" });
    (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}]); // 3 CPUs
    (os.platform as jest.Mock).mockReturnValue("test-platform");
    (os.release as jest.Mock).mockReturnValue("test-release");

    // Mock path.join to return predictable paths
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
      if (filePath.includes("test-repo")) {
        return "mock-iv:mock-auth-tag:mock-encrypted-token";
      }
      throw new Error("File not found");
    });
    (fs.readdirSync as jest.Mock).mockReturnValue(["test-repo.token"]);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

    // Mock crypto functions
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue(Buffer.from("mock-key")),
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

    const mockCipher = {
      update: jest.fn().mockReturnValue("mock-encrypted"),
      final: jest.fn().mockReturnValue(""),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from("mock-auth-tag")),
    };
    (crypto.createCipheriv as jest.Mock).mockReturnValue(mockCipher);

    const mockDecipher = {
      update: jest.fn().mockReturnValue("mock-token"),
      final: jest.fn().mockReturnValue(""),
      setAuthTag: jest.fn(),
    };
    (crypto.createDecipheriv as jest.Mock).mockReturnValue(mockDecipher);
    (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from("mock-iv"));

    // Get token manager instance
    tokenManager = SecureTokenManager.getInstance();
  });

  afterEach(() => {
    // Reset the singleton instance
    (SecureTokenManager as any).instance = undefined;
  });

  it("should be a singleton", () => {
    const instance1 = SecureTokenManager.getInstance();
    const instance2 = SecureTokenManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should create token store directory if it doesn't exist", () => {
    // Mock directory doesn't exist
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    // Re-initialize token manager
    tokenManager = SecureTokenManager.getInstance();

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      mockTokenStorePath,
      expect.objectContaining({ recursive: true, mode: 0o700 }),
    );
  });

  it("should store a token", () => {
    tokenManager.storeToken("https://github.com/test/repo", "test-token");

    // Should encrypt the token
    expect(crypto.createCipheriv).toHaveBeenCalled();

    // Should write to file
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("token"),
      expect.any(String),
      expect.objectContaining({ mode: 0o600 }),
    );
  });

  it("should retrieve a token from memory cache", () => {
    // Store token first
    tokenManager.storeToken("https://github.com/test/repo", "test-token");

    // Clear mocks to verify cache hit
    jest.clearAllMocks();

    const token = tokenManager.getToken("https://github.com/test/repo");

    expect(token).toBe("test-token");

    // Should not read from file
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it("should retrieve a token from disk", () => {
    // Ensure token is not in memory cache
    (tokenManager as any).tokens.clear();

    const token = tokenManager.getToken("https://github.com/test/repo");

    // Should read from file
    expect(fs.readFileSync).toHaveBeenCalled();

    // Should decrypt the token
    expect(crypto.createDecipheriv).toHaveBeenCalled();

    expect(token).toBe("mock-token");
  });

  it("should remove a token", () => {
    // Store token first
    tokenManager.storeToken("https://github.com/test/repo", "test-token");

    tokenManager.removeToken("https://github.com/test/repo");

    // Should remove from memory
    expect(
      (tokenManager as any).tokens.has("https://github.com/test/repo"),
    ).toBe(false);

    // Should remove from disk
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("token"),
    );
  });

  it("should clear all tokens", () => {
    // Store token first
    tokenManager.storeToken("https://github.com/test/repo", "test-token");

    tokenManager.clearAllTokens();

    // Should clear memory
    expect((tokenManager as any).tokens.size).toBe(0);

    // Should remove all token files
    expect(fs.readdirSync).toHaveBeenCalledWith(mockTokenStorePath);
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining("token"),
    );
  });

  it("should normalize repository URLs", () => {
    // Store token with URL that has trailing slash and .git suffix
    tokenManager.storeToken("https://github.com/test/repo.git/", "test-token");

    // Should be able to retrieve with normalized URL
    const token = tokenManager.getToken("https://github.com/test/repo");

    expect(token).toBe("test-token");
  });

  it("should handle errors when storing tokens", () => {
    // Mock fs.writeFileSync to throw an error
    (fs.writeFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Write error");
    });

    // Should not throw
    expect(() => {
      tokenManager.storeToken("https://github.com/test/repo", "test-token");
    }).not.toThrow();

    // Should still store in memory
    expect(
      (tokenManager as any).tokens.get("https://github.com/test/repo"),
    ).toBe("test-token");
  });

  it("should handle errors when retrieving tokens", () => {
    // Mock fs.readFileSync to throw an error
    (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Read error");
    });

    // Should not throw
    expect(() => {
      tokenManager.getToken("https://github.com/test/repo");
    }).not.toThrow();

    // Should return undefined
    expect(
      tokenManager.getToken("https://github.com/test/repo"),
    ).toBeUndefined();
  });
});
