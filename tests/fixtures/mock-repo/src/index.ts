/**
 * Main entry point for mock repository
 * Used for testing repo2pdf
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function add(a: number, b: number): number {
  return a + b;
}

// Single line comment
export const VERSION = "1.0.0";

/*
 * Multi-line comment
 * Should be removed when removeComments is enabled
 */
export class Calculator {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }

  subtract(n: number): this {
    this.value -= n;
    return this;
  }

  getResult(): number {
    return this.value;
  }
}
