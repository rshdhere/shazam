import { config as baseConfig } from "@shazam/eslint-config/base";
import { config as reactInternalConfig } from "@shazam/eslint-config/react-internal";
import { nextJsConfig } from "@shazam/eslint-config/next-js";

export default [...baseConfig, ...reactInternalConfig, ...nextJsConfig];
