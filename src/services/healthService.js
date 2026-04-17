import { apiGet } from './apiClient';

export async function getHealth() {
  return apiGet('/health', { timeoutMs: 20000 });
}
