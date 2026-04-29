export const ENVIRONMENT_KEYS = {
  SHADOW: 'shadow',
  PROD: 'prod',
};

export const ENVIRONMENTS = {
  [ENVIRONMENT_KEYS.SHADOW]: {
    key: ENVIRONMENT_KEYS.SHADOW,
    label: 'Shadow',
    badgeLabel: 'Ambiente Shadow',
    apiBaseUrl: 'https://kingfruver-api-shadow.onrender.com',
    sessionKey: 'kingfruver_shadow_session_v1',
    adminEmail: 'admin.shadow@kingfruver.local',
    defaultSedeId: '69aa0d3cd908c9f5f152fc2c',
    defaultSedeLabel: 'Sede Shadow (SH01)',
    defaultCajaId: '69aecd84319a254c552951a8',
    defaultCajaLabel: 'Caja Shadow (CJSH01)',
    theme: {
      backgroundColor: '#fff5f5',
    },
    copy: {
      backendLabel: 'backend shadow',
      loginProgress: 'Iniciando sesión en shadow...',
      healthReady: 'Listo para verificar conexion con el backend shadow.',
      healthLoading: 'Conectando con backend shadow...\\nEsto puede tardar unos segundos si el servicio esta despertando.',
    },
  },
  [ENVIRONMENT_KEYS.PROD]: {
    key: ENVIRONMENT_KEYS.PROD,
    label: 'Producción',
    badgeLabel: 'Ambiente Producción',
    apiBaseUrl: 'https://kingfruver-api-prod.onrender.com',
    sessionKey: 'kingfruver_prod_session_v1',
    adminEmail: 'admin@kingfruver.local',
    defaultSedeId: '69bdc02f237e6e9192eaa88e',
    defaultSedeLabel: 'Sede Prod (PR01)',
    defaultCajaId: '69bdc6190f59aefa2a2876e1',
    defaultCajaLabel: 'Caja Prod (CJPR01)',
    theme: {
      backgroundColor: '#f4f6f8',
    },
    copy: {
      backendLabel: 'backend producción',
      loginProgress: 'Iniciando sesión en producción...',
      healthReady: 'Listo para verificar conexion con el backend producción.',
      healthLoading: 'Conectando con backend producción...\\nEsto puede tardar unos segundos si el servicio esta despertando.',
    },
  },
};

let activeEnvironmentKey = ENVIRONMENT_KEYS.SHADOW;

export function getEnvironment(environmentKey) {
  return ENVIRONMENTS[environmentKey] || ENVIRONMENTS[ENVIRONMENT_KEYS.SHADOW];
}

export function getEnvironmentList() {
  return [
    ENVIRONMENTS[ENVIRONMENT_KEYS.SHADOW],
    ENVIRONMENTS[ENVIRONMENT_KEYS.PROD],
  ];
}

export function getActiveEnvironmentKey() {
  return activeEnvironmentKey;
}

export function getActiveEnvironment() {
  return getEnvironment(activeEnvironmentKey);
}

export function setActiveEnvironmentKey(environmentKey) {
  const nextEnvironment = getEnvironment(environmentKey);
  activeEnvironmentKey = nextEnvironment.key;

  return nextEnvironment;
}

export function getApiBaseUrl() {
  return getActiveEnvironment().apiBaseUrl;
}
