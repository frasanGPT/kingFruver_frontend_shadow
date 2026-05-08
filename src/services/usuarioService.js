import { apiGet, apiPatch } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getUsuarios(token) {
  return apiGet('/api/usuarios', {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function blockUsuario(id, token) {
  return apiPatch(`/api/usuarios/${id}/block`, {}, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function unblockUsuario(id, token) {
  return apiPatch(`/api/usuarios/${id}/unblock`, {}, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
