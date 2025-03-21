import crypto from "crypto";
import fs from "fs";
import { logger } from "./logger";
import os from "os";
import path from "path";

/**
 * Secure token manager for handling API tokens
 * Stores tokens securely using encryption with a machine-specific key
 */
export class SecureTokenManager {
  private static instance: SecureTokenManager;
  private tokenStorePath: string;
  private algorithm = "aes-256-gcm";
  private encryptionKey: Buffer;
  private tokens: Map<string, string> = new Map();

  private constructor() {
    // Create token store directory in user's home directory
    this.tokenStorePath = path.join(os.homedir(), ".repo2pdf", "tokens");
    this.ensureTokenStoreExists();

    // Generate encryption key based on machine-specific information
    this.encryptionKey = this.generateEncryptionKey();

    // Load tokens
    this.loadTokens();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SecureTokenManager {
    if (!SecureTokenManager.instance) {
      SecureTokenManager.instance = new SecureTokenManager();
    }
    return SecureTokenManager.instance;
  }

  /**
   * Store a token for a specific repository
   */
  public storeToken(repoUrl: string, token: string): void {
    try {
      if (!token) {
        return;
      }

      // Encrypt token
      const encrypted = this.encrypt(token);

      // Store in memory
      this.tokens.set(this.normalizeRepoUrl(repoUrl), token);

      // Store on disk
      const tokenFile = path.join(
        this.tokenStorePath,
        this.getTokenFileName(repoUrl),
      );
      fs.writeFileSync(tokenFile, encrypted, { mode: 0o600 }); // Restrictive permissions

      logger.debug(`Stored token for ${repoUrl}`);
    } catch (error) {
      logger.warn(
        `Failed to store token securely: ${(error as Error).message}`,
      );
      // Fall back to in-memory only storage
      this.tokens.set(this.normalizeRepoUrl(repoUrl), token);
    }
  }

  /**
   * Get a token for a specific repository
   */
  public getToken(repoUrl: string): string | undefined {
    const normalizedUrl = this.normalizeRepoUrl(repoUrl);

    // Check in-memory cache first
    if (this.tokens.has(normalizedUrl)) {
      return this.tokens.get(normalizedUrl);
    }

    try {
      // Try to load from disk
      const tokenFile = path.join(
        this.tokenStorePath,
        this.getTokenFileName(repoUrl),
      );

      if (fs.existsSync(tokenFile)) {
        const encrypted = fs.readFileSync(tokenFile, "utf-8");
        const token = this.decrypt(encrypted);

        // Cache in memory
        this.tokens.set(normalizedUrl, token);

        return token;
      }
    } catch (error) {
      logger.warn(`Failed to retrieve token: ${(error as Error).message}`);
    }

    return undefined;
  }

  /**
   * Remove a token for a specific repository
   */
  public removeToken(repoUrl: string): void {
    const normalizedUrl = this.normalizeRepoUrl(repoUrl);

    // Remove from memory
    this.tokens.delete(normalizedUrl);

    try {
      // Remove from disk
      const tokenFile = path.join(
        this.tokenStorePath,
        this.getTokenFileName(repoUrl),
      );

      if (fs.existsSync(tokenFile)) {
        fs.unlinkSync(tokenFile);
        logger.debug(`Removed token for ${repoUrl}`);
      }
    } catch (error) {
      logger.warn(`Failed to remove token: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all stored tokens
   */
  public clearAllTokens(): void {
    // Clear memory
    this.tokens.clear();

    try {
      // Clear disk
      if (fs.existsSync(this.tokenStorePath)) {
        const files = fs.readdirSync(this.tokenStorePath);

        for (const file of files) {
          if (file.endsWith(".token")) {
            fs.unlinkSync(path.join(this.tokenStorePath, file));
          }
        }
      }

      logger.debug("Cleared all tokens");
    } catch (error) {
      logger.warn(`Failed to clear tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure token store directory exists
   */
  private ensureTokenStoreExists(): void {
    try {
      if (!fs.existsSync(this.tokenStorePath)) {
        fs.mkdirSync(this.tokenStorePath, { recursive: true, mode: 0o700 }); // Restrictive permissions
      }
    } catch (error) {
      logger.warn(
        `Failed to create token store directory: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Load tokens from disk
   */
  private loadTokens(): void {
    try {
      if (fs.existsSync(this.tokenStorePath)) {
        const files = fs.readdirSync(this.tokenStorePath);

        for (const file of files) {
          if (file.endsWith(".token")) {
            try {
              const repoUrl = this.getRepoUrlFromFileName(file);
              const encrypted = fs.readFileSync(
                path.join(this.tokenStorePath, file),
                "utf-8",
              );
              const token = this.decrypt(encrypted);

              this.tokens.set(this.normalizeRepoUrl(repoUrl), token);
            } catch (error) {
              logger.warn(
                `Failed to load token from ${file}: ${(error as Error).message}`,
              );
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to load tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a machine-specific encryption key
   */
  private generateEncryptionKey(): Buffer {
    try {
      // Use machine-specific information to generate a consistent key
      const hostname = os.hostname();
      const username = os.userInfo().username;
      const cpus = os.cpus().length;
      const platform = os.platform();
      const release = os.release();

      // Create a hash of machine information
      const machineInfo = `${hostname}:${username}:${cpus}:${platform}:${release}`;
      const hash = crypto.createHash("sha256").update(machineInfo).digest();

      return hash;
    } catch (error) {
      // Fallback to a static key (less secure but better than nothing)
      logger.warn(
        `Failed to generate machine-specific key: ${(error as Error).message}`,
      );
      return crypto.createHash("sha256").update("repo2pdf-static-key").digest();
    }
  }

  /**
   * Encrypt a token
   */
  private encrypt(text: string): string {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );

    // Encrypt the text
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Return IV + Auth Tag + Encrypted Text
    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt a token
   */
  private decrypt(encryptedText: string): string {
    // Split the encrypted text into IV, Auth Tag, and Encrypted Text
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt the text
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Normalize repository URL for consistent storage
   */
  private normalizeRepoUrl(repoUrl: string): string {
    // Remove trailing slashes and .git suffix
    return repoUrl
      .replace(/\/+$/, "")
      .replace(/\.git$/, "")
      .toLowerCase();
  }

  /**
   * Generate a file name for storing a token
   */
  private getTokenFileName(repoUrl: string): string {
    // Create a hash of the normalized URL
    const hash = crypto
      .createHash("md5")
      .update(this.normalizeRepoUrl(repoUrl))
      .digest("hex");
    return `${hash}.token`;
  }

  /**
   * Extract repository URL from a token file name
   */
  private getRepoUrlFromFileName(fileName: string): string {
    // This is a best-effort function since we can't reverse the hash
    // We'll return a placeholder that will be normalized
    return fileName.replace(".token", "");
  }
}
