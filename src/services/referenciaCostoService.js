import { apiGet, apiPost, apiPatch } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getReferenciasCosto({ token, inventarioId, sedeId, estado } = {}) {
  const params = new URLSearchParams();

  if (inventarioId) params.set('inventarioId', inventarioId);
  if (sedeId) params.set('sedeId', sedeId);
  if (estado) params.set('estado', estado);

  const query = params.toString();
  const path = query ? `/api/referencias-costo?${query}` : '/api/referencias-costo';

  return apiGet(path, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function getReferenciaCostoById({ id, token }) {
  return apiGet(`/api/referencias-costo/${id}`, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function createReferenciaCosto({ referencia, token }) {
  return apiPost('/api/referencias-costo', referencia, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function reviewReferenciaCosto({ id, payload, token }) {
  return apiPatch(`/api/referencias-costo/${id}/revisar`, payload, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function applyReferenciaCosto({ id, payload, token }) {
  return apiPatch(`/api/referencias-costo/${id}/aplicar`, payload, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
