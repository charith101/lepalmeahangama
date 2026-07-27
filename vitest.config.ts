import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/utils.ts", "src/lib/validations.ts", "src/lib/auth.ts", "src/lib/actions/*.ts"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
    server: {
      deps: {
        inline: ["@supabase/ssr"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
