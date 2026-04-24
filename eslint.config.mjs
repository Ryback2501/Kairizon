import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: [".next/**", "dist/**", "node_modules/**", "tests/**"] },
  ...nextConfig,
];

export default eslintConfig;
