import * as SecureStore from 'expo-secure-store';
import {
  getActiveEnvironmentKey,
  getEnvironment,
} from '../config/environments';

function getSessionKey(environmentKey = getActiveEnvironmentKey()) {
  return getEnvironment(environmentKey).sessionKey;
}

export async function saveSession(session, environmentKey = getActiveEnvironmentKey()) {
  const environment = getEnvironment(environmentKey);
  const sessionToSave = {
    ...session,
    environmentKey: environment.key,
    environmentLabel: environment.label,
  };

  await SecureStore.setItemAsync(environment.sessionKey, JSON.stringify(sessionToSave));
}

export async function loadSession(environmentKey = getActiveEnvironmentKey()) {
  const sessionKey = getSessionKey(environmentKey);
  const raw = await SecureStore.getItemAsync(sessionKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    await SecureStore.deleteItemAsync(sessionKey);
    return null;
  }
}

export async function clearSession(environmentKey = getActiveEnvironmentKey()) {
  await SecureStore.deleteItemAsync(getSessionKey(environmentKey));
}
