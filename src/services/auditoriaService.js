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
  eventTypes,
  status,
  module,
  actorEmail,
  limit,
  page,
  from,
  to,
} = {}) {
  const params = new URLSearchParams();

  if (eventType) params.set('eventType', eventType);
  if (eventTypes) params.set('eventTypes', Array.isArray(eventTypes) ? eventTypes.join(',') : String(eventTypes));
  if (status) params.set('status', status);
  if (module) params.set('module', module);
  if (actorEmail) params.set('actorEmail', actorEmail);
  if (limit) params.set('limit', String(limit));
  if (page) params.set('page', String(page));
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const query = params.toString();
  const path = query ? `/api/auditoria?${query}` : '/api/auditoria';

  return apiGet(path, {
    headers: buildAuthHeaders(token),
    timeoutMs: 20000,
  });
}
