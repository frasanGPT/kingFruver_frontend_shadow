import { apiGet, apiPost, apiPatch } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getVentas(filters = {}, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const params = new URLSearchParams();

  if (filters.estado) {
    params.append('estado', filters.estado);
  }

  if (filters.sedeId) {
    params.append('sedeId', filters.sedeId);
  }

  if (filters.usuarioId) {
    params.append('usuarioId', filters.usuarioId);
  }

  if (filters.metodoPago) {
    params.append('metodoPago', filters.metodoPago);
  }

  if (filters.cajaId) {
    params.append('cajaId', filters.cajaId);
  }

  const query = params.toString();
  const path = query ? `/api/ventas?${query}` : '/api/ventas';

  return apiGet(path, {
    timeoutMs: 20000,
    headers,
  });
}

export async function createVenta(payload, token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiPost('/api/ventas', payload, {
    timeoutMs: 20000,
    headers,
  });
}

export async function devolverVenta({ ventaId, motivo, notas, token }) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return apiPatch(`/api/ventas/${ventaId}/devolver`, {
    motivo,
    notas,
  }, {
    timeoutMs: 20000,
    headers,
  });
}

export async function devolverVentaParcial({ ventaId, motivo, notas, items, token }) {
  const payload = {
    motivo,
    notas,
    items,
  };

  return apiPatch(`/api/ventas/${ventaId}/devolver-parcial`, payload, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}

export async function aplicarAjusteContableVentaCerrada({
  ventaId,
  tipo,
  motivo,
  notas,
  items,
  token,
}) {
  const payload = {
    ventaId,
    tipo,
    motivo,
    notas,
    items,
  };

  return apiPost('/api/ajustes-contables/devolucion-venta-cerrada', payload, {
    headers: buildAuthHeaders(token),
  });
}

export async function getVentaDetalle({ ventaId, token }) {
  return apiGet(`/api/ventas/${ventaId}`, {
    headers: buildAuthHeaders(token),
    timeoutMs: 15000,
  });
}
