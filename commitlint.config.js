module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "scraper",
        "cron",
        "auth",
        "products",
        "notification",
        "ui",
        "db",
        "docker",
        "ci",
        "deps",
        "tests",
        "hooks",
        "config",
      ],
    ],
    "scope-empty": [1, "never"],
  },
};
