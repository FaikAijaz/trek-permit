import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This app fetches with plain `fetch` on mount/param-change (no
      // React Query/SWR — not worth the dependency for a small internal
      // tool), which is exactly the "fetch-then-setState-in-an-effect"
      // shape this rule flags. The setState calls it's warning about
      // happen after an `await`, not synchronously in the effect body —
      // a standard, deliberate pattern here, not the render-loop risk
      // the rule exists to catch.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
