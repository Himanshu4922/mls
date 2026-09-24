import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Unit tests for pure helpers (lib/**). Components are verified in the browser. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
