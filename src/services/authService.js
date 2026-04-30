import { apiPost } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function loginWithPassword({ email, password }) {
  return apiPost(
    '/api/auth/login',
    { email, password },
    { timeoutMs: 20000 }
  );
}

export async function changePassword({ passwordActual, passwordNueva, token }) {
  return apiPost(
    '/api/auth/change-password',
    { passwordActual, passwordNueva },
    {
      headers: buildAuthHeaders(token),
      timeoutMs: 20000,
    }
  );
}
