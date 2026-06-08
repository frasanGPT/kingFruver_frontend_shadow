const appJson = require("./app.json");

const ENV_KEYS = {
  SHADOW: "shadow",
  PROD: "prod",
};

function readEnv(name) {
  if (typeof process === "undefined" || !process.env) {
    return "";
  }

  return String(process.env[name] || "").trim().toLowerCase();
}

function getAppEnv() {
  const raw =
    readEnv("KINGFRUVER_APP_ENV") ||
    readEnv("EXPO_PUBLIC_KINGFRUVER_APP_ENV") ||
    ENV_KEYS.SHADOW;

  return raw === "production" ? ENV_KEYS.PROD : raw;
}

const EAS_PROJECT_IDS = {
  SHADOW: "ff03708c-5676-44f7-a768-7c0615effa55",
  PROD: "32b0262a-e429-44f8-a367-7e4d51d3eed1",
};

function withProdEasProjectId(extra) {
  return {
    ...(extra || {}),
    eas: {
      ...((extra || {}).eas || {}),
      projectId: EAS_PROJECT_IDS.PROD,
    },
  };
}

module.exports = () => {
  const baseConfig = appJson.expo || {};
  const appEnv = getAppEnv();
  const isProd = appEnv === ENV_KEYS.PROD;

  if (!isProd) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    name: "kingFruver",
    slug: "kingfruver",
    ios: {
      ...(baseConfig.ios || {}),
      bundleIdentifier: "com.kingfruver.app",
    },
    android: {
      ...(baseConfig.android || {}),
      package: "com.kingfruver.app",
    },
    extra: withProdEasProjectId(baseConfig.extra),
  };
};
