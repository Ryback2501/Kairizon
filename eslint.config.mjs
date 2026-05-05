import tseslint from "typescript-eslint";
import globals from "globals";

const jestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
  jest: "readonly",
};

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".next/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: tseslint.configs.recommended,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node, ...jestGlobals },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
