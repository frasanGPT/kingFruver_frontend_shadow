import { apiGet } from './apiClient';

function buildAuthHeaders(token) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function getAuditoria({
  token,
  eventType,
  status,
  module,
  actorEmail,
  limit,
} = {}) {
  const params = new URLSearchParams();

  if (eventType) params.set('eventType', eventType);
  if (status) params.set('status', status);
  if (module) params.set('module', module);
  if (actorEmail) params.set('actorEmail', actorEmail);
  if (limit) params.set('limit', String(limit));

  const query = params.toString();
  const path = query ? `/api/auditoria?${query}` : '/api/auditoria';

  return apiGet(path, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
