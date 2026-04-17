import { apiGet } from './apiClient';

export async function getInventarioDisponible({ sedeId, token }) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const params = new URLSearchParams();

  if (sedeId) {
    params.append('sedeId', sedeId);
  }

  params.append('activo', 'true');

  const query = params.toString();
  const path = query ? `/api/inventario?${query}` : '/api/inventario';

  return apiGet(path, {
    timeoutMs: 20000,
    headers,
  });
}
