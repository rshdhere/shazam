import { nextJsConfig } from "@shazam/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: [".venv/**", "app/.well-known/workflow/**"] },
  ...nextJsConfig,
];
