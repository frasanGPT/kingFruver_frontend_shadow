import { apiGet } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getKardex({
  token,
  sedeId,
  productoNombre,
  unidadBase,
  tipoMovimiento,
  referenciaTipo,
} = {}) {
  const params = new URLSearchParams();

  if (sedeId) params.set('sedeId', sedeId);
  if (productoNombre) params.set('productoNombre', productoNombre);
  if (unidadBase) params.set('unidadBase', unidadBase);
  if (tipoMovimiento) params.set('tipoMovimiento', tipoMovimiento);
  if (referenciaTipo) params.set('referenciaTipo', referenciaTipo);

  const query = params.toString();
  const path = query ? `/api/kardex?${query}` : '/api/kardex';

  return apiGet(path, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
