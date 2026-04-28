import nextConfig from "eslint-config-next/core-web-vitals";

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

const eslintConfig = [
  { ignores: [".next/**", "dist/**", "node_modules/**"] },
  ...nextConfig,
  {
    files: ["tests/**/*.ts"],
    languageOptions: { globals: jestGlobals },
  },
];

export default eslintConfig;
