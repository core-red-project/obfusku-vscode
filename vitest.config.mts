import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "vscode", replacement: path.resolve(import.meta.dirname, "tests/mocks/vscode.ts") },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
