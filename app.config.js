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

function removeEasProjectId(extra) {
  const nextExtra = { ...(extra || {}) };

  if (nextExtra.eas && typeof nextExtra.eas === "object") {
    const { projectId, ...remainingEas } = nextExtra.eas;

    if (Object.keys(remainingEas).length > 0) {
      nextExtra.eas = remainingEas;
    } else {
      delete nextExtra.eas;
    }
  }

  return nextExtra;
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
    extra: removeEasProjectId(baseConfig.extra),
  };
};
