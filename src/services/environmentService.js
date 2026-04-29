import * as SecureStore from 'expo-secure-store';
import {
  ENVIRONMENT_KEYS,
  getActiveEnvironment,
  getActiveEnvironmentKey,
  getEnvironment,
  getEnvironmentList,
  setActiveEnvironmentKey,
} from '../config/environments';

const ACTIVE_ENVIRONMENT_STORAGE_KEY = 'kingfruver_active_environment_v1';

export async function loadActiveEnvironment() {
  const storedKey = await SecureStore.getItemAsync(ACTIVE_ENVIRONMENT_STORAGE_KEY);
  const environment = setActiveEnvironmentKey(storedKey || ENVIRONMENT_KEYS.SHADOW);

  return environment;
}

export async function saveActiveEnvironment(environmentKey) {
  const environment = setActiveEnvironmentKey(environmentKey);
  await SecureStore.setItemAsync(ACTIVE_ENVIRONMENT_STORAGE_KEY, environment.key);

  return environment;
}

export async function clearActiveEnvironment() {
  await SecureStore.deleteItemAsync(ACTIVE_ENVIRONMENT_STORAGE_KEY);
  return setActiveEnvironmentKey(ENVIRONMENT_KEYS.SHADOW);
}

export {
  ENVIRONMENT_KEYS,
  getActiveEnvironment,
  getActiveEnvironmentKey,
  getEnvironment,
  getEnvironmentList,
  setActiveEnvironmentKey,
};
