/**
 * Vitest global setup: generate deterministic fixtures once before the suite.
 *
 * This guarantees the network-free fixtures (edge cases, multi-language,
 * synthetic-large) exist for every run without committing thousands of files.
 */

import { generateAllFixtures } from "./fixtures/generate-fixtures";

export default function setup(): void {
  generateAllFixtures();
}
