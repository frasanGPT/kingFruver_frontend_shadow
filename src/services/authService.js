import { apiPost } from './apiClient';

export async function loginWithPassword({ email, password }) {
  return apiPost(
    '/api/auth/login',
    { email, password },
    { timeoutMs: 20000 }
  );
}
