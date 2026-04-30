import { apiGet, apiPost } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getProveedores({ token, activo } = {}) {
  const params = new URLSearchParams();

  if (activo === true) params.set('activo', 'true');
  if (activo === false) params.set('activo', 'false');

  const query = params.toString();
  const path = query ? `/api/proveedores?${query}` : '/api/proveedores';

  return apiGet(path, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function createProveedor({ proveedor, token }) {
  return apiPost('/api/proveedores', proveedor, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
