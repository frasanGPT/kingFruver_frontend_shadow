import { apiGet, apiPost } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getCompras({ token, estado, sedeId, proveedorId } = {}) {
  const params = new URLSearchParams();

  if (estado) params.set('estado', estado);
  if (sedeId) params.set('sedeId', sedeId);
  if (proveedorId) params.set('proveedorId', proveedorId);

  const query = params.toString();
  const path = query ? `/api/compras?${query}` : '/api/compras';

  return apiGet(path, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function createCompra({ compra, token }) {
  return apiPost('/api/compras', compra, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
