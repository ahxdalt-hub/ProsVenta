import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Script-style verification suites (run directly via `npx tsx <file>` per
    // their own headers) use console-based assertions instead of describe/it,
    // which vitest reports as "No test suite found". They are NOT failing
    // tests — they are standalone scripts, so vitest skips them here.
    exclude: [
      "src/features/intelligence/provider-foundation.test.ts",
      "src/features/intelligence/foundation.test.ts",
      "src/features/intelligence/company-enrichment/company-enrichment.test.ts",
      "src/features/intelligence/person-enrichment/person-enrichment.test.ts",
      "src/features/intelligence/quality/quality.test.ts",
      "src/features/intelligence/recommendations/auto-recommendations.test.ts",
      "src/features/intelligence/workflows/engine.test.ts",
      "**/node_modules/**",
    ],
  },
});

