/**
 * Logger utility for repo2pdf
 */
export class Logger {
  private debugMode = false;

  /**
   * Set debug mode
   */
  public setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }

  /**
   * Log an info message
   */
  public info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Log an error message
   */
  public error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Log a debug message (only in debug mode)
   */
  public debug(message: string, ...args: any[]): void {
    if (this.debugMode) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log a success message
   */
  public success(message: string, ...args: any[]): void {
    console.log(`[SUCCESS] ${message}`, ...args);
  }

  /**
   * Log a progress message
   */
  public progress(message: string, current: number, total: number): void {
    const percent = Math.round((current / total) * 100);
    console.log(`[PROGRESS] ${message}: ${current}/${total} (${percent}%)`);
  }
}

// Export a singleton instance
export const logger = new Logger();
