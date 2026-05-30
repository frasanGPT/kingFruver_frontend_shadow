import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppShell from '../components/AppShell';
import StateNoticeCard from '../components/StateNoticeCard';
import StatusBadge from '../components/StatusBadge';
import { getActiveEnvironment } from '../config/environments';
import { getAuditoria } from '../services/auditoriaService';
import { getKardex } from '../services/kardexService';
import { loadSession } from '../services/sessionService';

function formatDateTime(value) {
  if (!value) return 'sin valor';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'sin valor';
  }

  return date.toLocaleString('es-CO');
}

function shortId(value) {
  const raw = String(value || '').trim();
  return raw.length > 8 ? raw.slice(-8) : raw || 'sin valor';
}

function getMovimientoVariant(tipoMovimiento) {
  if (tipoMovimiento === 'ENTRADA_COMPRA') return 'success';
  if (tipoMovimiento === 'SALIDA_VENTA') return 'danger';
  if (tipoMovimiento === 'ANULACION') return 'warning';
  return 'info';
}

function getAuditVariant(status, eventType) {
  if (eventType === 'VENTAS.RETURN_SUCCESS') return 'warning';
  if (eventType === 'VENTAS.RETURN_FAILED') return 'danger';

  if (status === 'success') return 'success';
  if (status === 'failed' || status === 'error') return 'danger';
  return 'info';
}

function getAuditTitle(eventType) {
  if (eventType === 'VENTAS.RETURN_SUCCESS') {
    return 'Devolución de venta completada';
  }

  if (eventType === 'VENTAS.RETURN_FAILED') {
    return 'Error devolviendo venta';
  }

  return eventType || 'Evento sin tipo';
}

function formatQuantity(value, unit) {
  return `${Number(value || 0).toLocaleString('es-CO')} ${unit || ''}`.trim();
}

export default function KardexAuditoriaScreen({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [screenResult, setScreenResult] = useState('Cargando kardex y auditoría...');
  const [token, setToken] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [kardexRows, setKardexRows] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [auditPagination, setAuditPagination] = useState(null);
  const [loadingMoreAudit, setLoadingMoreAudit] = useState(false);
  const [selectedTab, setSelectedTab] = useState('kardex');
  const [selectedMovimiento, setSelectedMovimiento] = useState('todos');
  const [selectedAuditModule, setSelectedAuditModule] = useState('todos');
  const [selectedAuditStatus, setSelectedAuditStatus] = useState('todos');

  const activeEnvironment = getActiveEnvironment();

  const filteredKardexRows = useMemo(() => {
    if (selectedMovimiento === 'todos') {
      return kardexRows;
    }

    return kardexRows.filter((row) => row.tipoMovimiento === selectedMovimiento);
  }, [kardexRows, selectedMovimiento]);

  const filteredAuditRows = useMemo(() => {
    let rows = auditRows;

    if (selectedAuditModule !== 'todos') {
      rows = rows.filter((row) => row.module === selectedAuditModule);
    }

    if (selectedAuditStatus === 'success') {
      rows = rows.filter((row) => String(row.status || '').toLowerCase() === 'success');
    }

    if (selectedAuditStatus === 'failed') {
      rows = rows.filter((row) => String(row.status || '').toLowerCase() === 'failed' || String(row.status || '').toLowerCase() === 'error');
    }

    if (selectedAuditStatus === 'returns') {
      rows = rows.filter((row) => ['VENTAS.RETURN_SUCCESS', 'VENTAS.RETURN_FAILED'].includes(row.eventType));
    }

    return rows;
  }, [auditRows, selectedAuditModule, selectedAuditStatus]);

  const entradaCompraCount = useMemo(() => {
    return kardexRows.filter((row) => row.tipoMovimiento === 'ENTRADA_COMPRA').length;
  }, [kardexRows]);

  const salidaVentaCount = useMemo(() => {
    return kardexRows.filter((row) => row.tipoMovimiento === 'SALIDA_VENTA').length;
  }, [kardexRows]);

  const anulacionCount = useMemo(() => {
    return kardexRows.filter((row) => row.tipoMovimiento === 'ANULACION').length;
  }, [kardexRows]);

  const auditModules = useMemo(() => {
    return Array.from(new Set(auditRows.map((row) => row.module).filter(Boolean))).sort();
  }, [auditRows]);

  async function loadData() {
    try {
      setLoading(true);
      setScreenResult(`Cargando información desde ${activeEnvironment.copy.backendLabel}...`);

      const session = await loadSession(activeEnvironment.key);

      if (!session?.token) {
        setToken('');
        setSedeId('');
        setKardexRows([]);
        setAuditRows([]);
        setAuditPagination(null);
        setScreenResult('No hay sesión guardada. Entra a Home, valida acceso y vuelve.');
        return;
      }

      const effectiveSedeId = session.sedeId || activeEnvironment.defaultSedeId || '';

      setToken(session.token);
      setSedeId(effectiveSedeId);

      const [kardexResponse, auditoriaResponse] = await Promise.all([
        getKardex({ token: session.token, sedeId: effectiveSedeId }),
        getAuditoria({ token: session.token, limit: 10, page: 1 }),
      ]);

      const nextKardexRows = Array.isArray(kardexResponse?.data) ? kardexResponse.data : [];
      const nextAuditRows = Array.isArray(auditoriaResponse?.data) ? auditoriaResponse.data : [];

      setKardexRows(nextKardexRows);
      setAuditRows(nextAuditRows);
      setAuditPagination(auditoriaResponse?.pagination || null);
      setScreenResult(
        `Kardex: ${nextKardexRows.length}. Eventos de auditoría cargados: ${nextAuditRows.length}.`
      );
    } catch (error) {
      setKardexRows([]);
      setAuditRows([]);
      setAuditPagination(null);
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadMoreAuditRows() {
    if (loadingMoreAudit || !auditPagination?.hasNextPage || !token) {
      return;
    }

    try {
      setLoadingMoreAudit(true);
      const nextPage = Number(auditPagination.page || 1) + 1;
      const response = await getAuditoria({ token, limit: auditPagination.limit || 10, page: nextPage });
      const nextRows = Array.isArray(response?.data) ? response.data : [];

      setAuditRows((current) => [...current, ...nextRows]);
      setAuditPagination(response?.pagination || null);
    } catch (error) {
      setScreenResult(`Error cargando más auditoría: ${error.message}`);
    } finally {
      setLoadingMoreAudit(false);
    }
  }


  return (
    <AppShell
      title="Kardex y auditoría"
      subtitle={`Admin · ${activeEnvironment.label}`}
      description={`Consulta movimientos de inventario y eventos críticos desde ${activeEnvironment.copy.backendLabel}.`}
      environment={activeEnvironment}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado</Text>
        <Text style={styles.resultText}>{screenResult}</Text>
        <Text style={styles.metricBlock}>Sesión activa: {token ? 'sí' : 'no'}</Text>
        <Text style={styles.metricBlock}>Sede: {sedeId || 'sin valor'}</Text>

        {loading ? <ActivityIndicator style={styles.loader} /> : null}

        <Pressable style={styles.button} onPress={loadData} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Cargando...' : 'Recargar'}</Text>
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabButton, selectedTab === 'kardex' ? styles.tabButtonActive : null]}
          onPress={() => setSelectedTab('kardex')}
        >
          <Text
            style={[
              styles.tabButtonText,
              selectedTab === 'kardex' ? styles.tabButtonTextActive : null,
            ]}
          >
            Kardex
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, selectedTab === 'auditoria' ? styles.tabButtonActive : null]}
          onPress={() => setSelectedTab('auditoria')}
        >
          <Text
            style={[
              styles.tabButtonText,
              selectedTab === 'auditoria' ? styles.tabButtonTextActive : null,
            ]}
          >
            Auditoría
          </Text>
        </Pressable>
      </View>

      {selectedTab === 'kardex' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen Kardex</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Total</Text>
                <Text style={styles.summaryChipValue}>{kardexRows.length}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Entradas</Text>
                <Text style={styles.summaryChipValue}>{entradaCompraCount}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Salidas</Text>
                <Text style={styles.summaryChipValue}>{salidaVentaCount}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Anulaciones</Text>
                <Text style={styles.summaryChipValue}>{anulacionCount}</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {['todos', 'ENTRADA_COMPRA', 'SALIDA_VENTA', 'ANULACION'].map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.filterButton,
                    selectedMovimiento === item ? styles.filterButtonActive : null,
                  ]}
                  onPress={() => setSelectedMovimiento(item)}
                >
                  <Text style={styles.filterButtonText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filteredKardexRows.length === 0 ? (
            <StateNoticeCard
              title="Sin movimientos"
              description="No hay movimientos de kardex para el filtro actual."
            />
          ) : (
            filteredKardexRows.slice(0, 25).map((row) => (
              <View key={row._id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{row.productoNombre || 'Producto sin nombre'}</Text>
                  <StatusBadge
                    label={row.tipoMovimiento || 'sin tipo'}
                    variant={getMovimientoVariant(row.tipoMovimiento)}
                  />
                </View>

                <Text style={styles.metricBlock}>Fecha: {formatDateTime(row.createdAt)}</Text>
                <Text style={styles.metricBlock}>Unidad base: {row.unidadBase || 'sin valor'}</Text>
                <Text style={styles.metricBlock}>
                  Movimiento: {formatQuantity(row.cantidadMovimiento, row.unidadBase)}
                </Text>
                <Text style={styles.metricBlock}>
                  Saldo: {formatQuantity(row.saldoAnterior, row.unidadBase)} → {formatQuantity(row.saldoNuevo, row.unidadBase)}
                </Text>
                <Text style={styles.metricBlock}>Referencia: {row.referenciaTipo || 'sin valor'} · {shortId(row.referenciaId)}</Text>
                <Text style={styles.metricBlock}>kardexId: {shortId(row._id)}</Text>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen auditoría</Text>
            <Text style={styles.metricBlock}>Eventos cargados: {auditRows.length}</Text>
            <Text style={styles.metricBlock}>
              Página auditoría: {auditPagination?.page || 1} de {auditPagination?.totalPages || 1}
            </Text>
            <Text style={styles.metricBlock}>
              Total backend filtrable: {auditPagination?.total ?? auditRows.length}
            </Text>

            <View style={styles.filterRow}>
              <Pressable
                style={[
                  styles.filterButton,
                  selectedAuditModule === 'todos' ? styles.filterButtonActive : null,
                ]}
                onPress={() => setSelectedAuditModule('todos')}
              >
                <Text style={styles.filterButtonText}>todos</Text>
              </Pressable>

              {auditModules.slice(0, 6).map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.filterButton,
                    selectedAuditModule === item ? styles.filterButtonActive : null,
                  ]}
                  onPress={() => setSelectedAuditModule(item)}
                >
                  <Text style={styles.filterButtonText}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterRow}>
              {['todos', 'success', 'failed', 'returns'].map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.filterButton,
                    selectedAuditStatus === item ? styles.filterButtonActive : null,
                  ]}
                  onPress={() => setSelectedAuditStatus(item)}
                >
                  <Text style={styles.filterButtonText}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.metricBlock}>Eventos filtrados: {filteredAuditRows.length}</Text>
            <Text style={styles.metricBlock}>Eventos visibles: {filteredAuditRows.length}</Text>
          </View>

          {filteredAuditRows.length === 0 ? (
            <StateNoticeCard
              title="Sin eventos"
              description="No hay eventos de auditoría para el filtro actual."
            />
          ) : (
            filteredAuditRows.map((row) => (
              <View key={row._id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    {getAuditTitle(row.eventType)}
                  </Text>
                  <StatusBadge
                    label={row.status || 'sin estado'}
                    variant={getAuditVariant(row.status, row.eventType)}
                  />
                </View>

                <Text style={styles.metricBlock}>Fecha: {formatDateTime(row.createdAt)}</Text>
                <Text style={styles.metricBlock}>Módulo: {row.module || 'sin valor'}</Text>
                <Text style={styles.metricBlock}>Acción: {row.action || 'sin valor'}</Text>
                <Text style={styles.metricBlock}>
                  Actor: {row.actor?.email || row.actor?.nombre || 'sin actor'}
                </Text>
                <Text style={styles.metricBlock}>Detalle: {row.humanText || row.message || 'sin detalle'}</Text>
                <Text style={styles.metricBlock}>auditId: {shortId(row._id)}</Text>
              </View>
            ))
          )}

          {selectedTab === 'auditoria' && auditPagination?.hasNextPage ? (
            <Pressable
              style={[styles.button, loadingMoreAudit ? styles.buttonDisabled : null]}
              onPress={loadMoreAuditRows}
              disabled={loadingMoreAudit}
            >
              <Text style={styles.buttonText}>
                {loadingMoreAudit ? 'Cargando más...' : 'Ver más eventos'}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}

      <Pressable style={styles.secondaryButton} onPress={onBack}>
        <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111827',
    marginBottom: 10,
  },
  metricBlock: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
    marginBottom: 4,
  },
  loader: {
    marginTop: 12,
  },
  button: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  tabsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    backgroundColor: '#d1fae5',
  },
  filterButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  summaryChip: {
    flexGrow: 1,
    minWidth: 90,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  summaryChipLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryChipValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
});
