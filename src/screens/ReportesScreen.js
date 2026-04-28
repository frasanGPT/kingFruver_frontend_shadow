import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import StateNoticeCard from '../components/StateNoticeCard';
import { getArqueos } from '../services/arqueoService';
import { getCajas } from '../services/cajaService';
import { loadSession } from '../services/sessionService';
import { getVentas } from '../services/ventaService';

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO')}`;
}

function formatDateTime(value) {
  if (!value) {
    return 'sin valor';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'sin valor';
  }

  return date.toLocaleString('es-CO');
}

function cleanCajaDisplayName(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 'sin caja';
  }

  return raw.replace(/\s\d{9,}$/, '');
}

function getArqueoSemantic(diferencia) {
  const value = Number(diferencia || 0);

  if (value > 0) {
    return {
      text: `Sobrante: ${formatCurrency(value)}`,
      variant: 'success',
    };
  }

  if (value < 0) {
    return {
      text: `Faltante: ${formatCurrency(Math.abs(value))}`,
      variant: 'danger',
    };
  }

  return {
    text: 'Cuadre perfecto: $0',
    variant: 'info',
  };
}


function buildDateRangeText(rows, getDateValue) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'sin datos';
  }

  const validDates = rows
    .map((row) => new Date(getDateValue(row) || 0))
    .filter((date) => Number.isNaN(date.getTime()) === false)
    .sort((a, b) => a.getTime() - b.getTime());

  if (validDates.length === 0) {
    return 'sin datos';
  }

  const minDate = validDates[0];
  const maxDate = validDates[validDates.length - 1];

  return `${formatDateTime(minDate.toISOString())} → ${formatDateTime(maxDate.toISOString())}`;
}

export default function ReportesScreen({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [screenResult, setScreenResult] = useState('Cargando resumen operativo...');
  const [sedeId, setSedeId] = useState('');
  const [token, setToken] = useState('');
  const [rawVentas, setRawVentas] = useState([]);
  const [rawArqueos, setRawArqueos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [arqueos, setArqueos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [selectedCajaId, setSelectedCajaId] = useState('');
  const [selectedMetodoPago, setSelectedMetodoPago] = useState('todos');
  const [selectedTimeRange, setSelectedTimeRange] = useState('todo');

  const totalVentas = useMemo(() => {
    return ventas.reduce((acc, venta) => acc + Number(venta.total || 0), 0);
  }, [ventas]);

  const ventasCompletadas = useMemo(() => {
    return ventas.filter((venta) => venta.estado === 'completada').length;
  }, [ventas]);

  const ventasPorMetodo = useMemo(() => {
    return {
      efectivo: ventas
        .filter((venta) => venta.metodoPago === 'efectivo')
        .reduce((acc, venta) => acc + Number(venta.total || 0), 0),
      transferencia: ventas
        .filter((venta) => venta.metodoPago === 'transferencia')
        .reduce((acc, venta) => acc + Number(venta.total || 0), 0),
      mixto: ventas
        .filter((venta) => venta.metodoPago === 'mixto')
        .reduce((acc, venta) => acc + Number(venta.total || 0), 0),
      otro: ventas
        .filter((venta) => venta.metodoPago === 'otro')
        .reduce((acc, venta) => acc + Number(venta.total || 0), 0),
    };
  }, [ventas]);

  const ultimoArqueo = useMemo(() => {
    return arqueos.length > 0 ? arqueos[0] : null;
  }, [arqueos]);

  const ultimaVenta = useMemo(() => {
    return ventas.length > 0 ? ventas[0] : null;
  }, [ventas]);

  const sedeDisplayName = useMemo(() => {
    const sedeDesdeVentas = ventas.find((venta) => venta?.sedeId)?.sedeId;
    if (sedeDesdeVentas) {
      return (
        sedeDesdeVentas.nombre ||
        sedeDesdeVentas.codigo ||
        'Sede configurada'
      );
    }

    const sedeDesdeArqueos = arqueos.find((arqueo) => arqueo?.sedeId)?.sedeId;
    if (sedeDesdeArqueos) {
      return (
        sedeDesdeArqueos.nombre ||
        sedeDesdeArqueos.codigo ||
        'Sede configurada'
      );
    }

      const sedeDesdeCajas = cajas.find((caja) => caja?.sedeId)?.sedeId;
      if (sedeDesdeCajas) {
        return (
          sedeDesdeCajas.nombre ||
          sedeDesdeCajas.codigo ||
          'Sede configurada'
        );
      }

      return sedeId ? 'Sede configurada' : 'sin sede';
  }, [ventas, arqueos, cajas, sedeId]);

  const ultimaActividad = useMemo(() => {
    const fechas = [];

    if (ultimaVenta?.createdAt) {
      fechas.push(new Date(ultimaVenta.createdAt).getTime());
    }

    if (ultimoArqueo?.fechaArqueo) {
      fechas.push(new Date(ultimoArqueo.fechaArqueo).getTime());
    } else if (ultimoArqueo?.createdAt) {
      fechas.push(new Date(ultimoArqueo.createdAt).getTime());
    }

    if (fechas.length === 0) {
      return 'sin actividad';
    }

    const latest = Math.max(...fechas);
    return formatDateTime(new Date(latest).toISOString());
  }, [ultimaVenta, ultimoArqueo]);

  const arqueoSemantic = useMemo(() => {
    return getArqueoSemantic(ultimoArqueo?.diferenciaEfectivo || 0);
  }, [ultimoArqueo]);

  const selectedCajaName = useMemo(() => {
    if (!selectedCajaId) {
      return 'todas';
    }

    const caja = cajas.find((item) => item._id === selectedCajaId);
    return caja ? `${cleanCajaDisplayName(caja.nombre)} (${caja.codigo})` : 'caja filtrada';
  }, [cajas, selectedCajaId]);

  const ventasDateRangeText = useMemo(() => {
    return buildDateRangeText(rawVentas, (venta) => venta?.createdAt);
  }, [rawVentas]);

  const arqueosDateRangeText = useMemo(() => {
    return buildDateRangeText(
      rawArqueos,
      (arqueo) => arqueo?.fechaArqueo || arqueo?.createdAt
    );
  }, [rawArqueos]);

  function applyVisibleTimeFilter(timeRange, ventasRows, arqueosRows) {
    const now = new Date();

    function filterRows(rows, getDateValue) {
      if (timeRange === 'todo') {
        return rows;
      }

      if (timeRange === 'hoy') {
        return rows.filter((row) => {
          const date = new Date(getDateValue(row) || 0);

          return (
            Number.isNaN(date.getTime()) === false &&
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
          );
        });
      }

      const limit = now.getTime() - 24 * 60 * 60 * 1000;

      return rows.filter((row) => {
        const date = new Date(getDateValue(row) || 0);
        return Number.isNaN(date.getTime()) === false && date.getTime() >= limit;
      });
    }

    const ventasFiltradas = filterRows(ventasRows, (venta) => venta?.createdAt);
    const arqueosFiltrados = filterRows(
      arqueosRows,
      (arqueo) => arqueo?.fechaArqueo || arqueo?.createdAt
    );

    setVentas(ventasFiltradas);
    setArqueos(arqueosFiltrados);
  }

  async function loadReportes(nextFilters = {}) {
    try {
      setLoading(true);
      setScreenResult('Cargando resumen operativo real...');

      const session = await loadSession();

      if (!session?.token) {
        setScreenResult('No hay sesión guardada. Entra a Home, valida acceso y vuelve.');
        setVentas([]);
        setArqueos([]);
        setCajas([]);
        return;
      }

      const effectiveToken = session.token;
      const effectiveSedeId = session.sedeId || '';
      const effectiveCajaId =
        Object.prototype.hasOwnProperty.call(nextFilters, 'selectedCajaId')
          ? nextFilters.selectedCajaId
          : selectedCajaId;
      const effectiveMetodoPago =
        Object.prototype.hasOwnProperty.call(nextFilters, 'selectedMetodoPago')
          ? nextFilters.selectedMetodoPago
          : selectedMetodoPago;
      const effectiveTimeRange =
        Object.prototype.hasOwnProperty.call(nextFilters, 'selectedTimeRange')
          ? nextFilters.selectedTimeRange
          : selectedTimeRange;

      setToken(effectiveToken);
      setSedeId(effectiveSedeId);

      const [ventasResponse, arqueosResponse, cajasResponse] = await Promise.all([
        getVentas(
          {
            sedeId: effectiveSedeId,
            ...(effectiveCajaId ? { cajaId: effectiveCajaId } : {}),
            ...(effectiveMetodoPago !== 'todos'
              ? { metodoPago: effectiveMetodoPago }
              : {}),
          },
          effectiveToken
        ),
        getArqueos(
          {
            sedeId: effectiveSedeId,
            ...(effectiveCajaId ? { cajaId: effectiveCajaId } : {}),
          },
          effectiveToken
        ),
        getCajas({
          sedeId: effectiveSedeId,
          activo: true,
          token: effectiveToken,
        }),
      ]);

      const ventasRows = ventasResponse?.data || [];
      const arqueosRows = arqueosResponse?.data || [];
      const cajasRows = cajasResponse?.data || [];

      setRawVentas(ventasRows);
      setRawArqueos(arqueosRows);
      applyVisibleTimeFilter(effectiveTimeRange, ventasRows, arqueosRows);
      setCajas(cajasRows);

      setScreenResult(
        `Resumen cargado. Ventas: ${ventasRows.length}. Arqueos: ${arqueosRows.length}.`
      );
    } catch (error) {
      setVentas([]);
      setArqueos([]);
      setCajas([]);
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReportes();
  }, []);

  function handleSelectMetodoPago(method) {
    setSelectedMetodoPago(method);
    loadReportes({ selectedMetodoPago: method });
  }

  function handleSelectCaja(cajaId) {
    setSelectedCajaId(cajaId);
    loadReportes({ selectedCajaId: cajaId });
  }

  function handleSelectTimeRange(timeRange) {
    setSelectedTimeRange(timeRange);
    loadReportes({ selectedTimeRange: timeRange });
  }

  function handleClearFilters() {
    setSelectedCajaId('');
    setSelectedMetodoPago('todos');
    setSelectedTimeRange('todo');
    loadReportes({
      selectedCajaId: '',
      selectedMetodoPago: 'todos',
    });
  }

  return (
    <AppShell
      title="Reportes"
      subtitle="Base operativa"
      description="Resumen real usando ventas y arqueos del backend shadow."
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de carga</Text>
        <Text style={styles.resultText}>{screenResult}</Text>
        {loading ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        <Pressable style={styles.reloadButton} onPress={() => loadReportes()}>
          <Text style={styles.reloadButtonText}>Recargar resumen</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filtros</Text>

        <Text style={styles.filterLabel}>Tiempo</Text>
        <View style={styles.filterRow}>
          {[
            { value: 'todo', label: 'todo' },
            { value: 'hoy', label: 'hoy' },
            { value: '24h', label: 'últimas 24h' },
          ].map((timeItem) => {
            const active = selectedTimeRange === timeItem.value;

            return (
              <Pressable
                key={timeItem.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => handleSelectTimeRange(timeItem.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {timeItem.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.filterLabel}>Método de pago</Text>
        <View style={styles.filterRow}>
          {['todos', 'efectivo', 'transferencia', 'mixto', 'otro'].map((method) => {
            const active = selectedMetodoPago === method;

            return (
              <Pressable
                key={method}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => handleSelectMetodoPago(method)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {method}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.filterLabel}>Caja</Text>
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              selectedCajaId === '' && styles.filterChipActive,
            ]}
            onPress={() => handleSelectCaja('')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCajaId === '' && styles.filterChipTextActive,
              ]}
            >
              todas
            </Text>
          </Pressable>

          {cajas.map((caja) => {
            const active = selectedCajaId === caja._id;

            return (
              <Pressable
                key={caja._id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => handleSelectCaja(caja._id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {cleanCajaDisplayName(caja.nombre)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.activeFiltersBox}>
          <Text style={styles.activeFiltersText}>
            Tiempo: {selectedTimeRange === 'hoy' ? 'hoy' : selectedTimeRange === '24h' ? 'últimas 24h' : 'todo'}
          </Text>
          <Text style={styles.activeFiltersText}>
            Caja: {selectedCajaName}
          </Text>
          <Text style={styles.activeFiltersText}>
            Método de pago: {selectedMetodoPago}
          </Text>
          <Text style={styles.activeFiltersText}>
            Sesión activa: {token ? 'sí' : 'no'}
          </Text>
        </View>

        <Pressable style={styles.clearButton} onPress={handleClearFilters}>
          <Text style={styles.clearButtonText}>Limpiar filtros</Text>
        </Pressable>
      </View>

      {ventas.length === 0 && arqueos.length === 0 ? (
        <StateNoticeCard
          title="Sin actividad en el rango"
          description="No hay ventas ni arqueos en este rango de tiempo."
        />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rango de fechas cargado</Text>
        <Text style={styles.metricBlock}>Ventas: {ventasDateRangeText}</Text>
        <Text style={styles.metricBlock}>Arqueos: {arqueosDateRangeText}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen general</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Sede</Text>
            <Text style={styles.summaryChipValue}>{sedeDisplayName}</Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Ventas</Text>
            <Text style={styles.summaryChipValue}>{ventasCompletadas}</Text>
          </View>

          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipLabel}>Arqueos</Text>
            <Text style={styles.summaryChipValue}>{arqueos.length}</Text>
          </View>
        </View>

        <Text style={styles.totalText}>Total vendido: {formatCurrency(totalVentas)}</Text>
        <Text style={styles.activityText}>Última actividad: {ultimaActividad}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Última venta</Text>

        {!ultimaVenta ? (
          <Text style={styles.emptyText}>No hay ventas disponibles para el filtro actual.</Text>
        ) : (
          <>
            <Text style={styles.metricBlock}>
              Fecha: {formatDateTime(ultimaVenta.createdAt)}
            </Text>
            <Text style={styles.metricBlock}>
              Caja: {ultimaVenta?.cajaId?.nombre || 'sin valor'} ({ultimaVenta?.cajaId?.codigo || 'sin valor'})
            </Text>
            <Text style={styles.metricBlock}>
              Método de pago: {ultimaVenta.metodoPago || 'sin valor'}
            </Text>
            <Text style={styles.metricBlock}>
              Items: {Array.isArray(ultimaVenta.items) ? ultimaVenta.items.length : 0}
            </Text>
            <Text style={styles.metricBlock}>
              Total: {formatCurrency(ultimaVenta.total || 0)}
            </Text>
            <Text style={styles.metricBlock}>
              ventaId: {ultimaVenta._id || 'sin valor'}
            </Text>

            {Array.isArray(ultimaVenta.items) && ultimaVenta.items.length > 0 ? (
              <View style={styles.detailListBox}>
                <Text style={styles.detailListTitle}>Detalle de la venta</Text>

                {ultimaVenta.items.map((item, index) => (
                  <Text key={`ultima-venta-item-${index}`} style={styles.metricBlock}>
                    {item.productoNombre}: {item.cantidad} {item.unidadVenta} x {formatCurrency(item.precioUnitario)} = {formatCurrency(item.subtotal)}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ventas por método de pago</Text>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Efectivo</Text>
          <Text style={styles.metricValue}>{formatCurrency(ventasPorMetodo.efectivo)}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Transferencia</Text>
          <Text style={styles.metricValue}>{formatCurrency(ventasPorMetodo.transferencia)}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Mixto</Text>
          <Text style={styles.metricValue}>{formatCurrency(ventasPorMetodo.mixto)}</Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Otro</Text>
          <Text style={styles.metricValue}>{formatCurrency(ventasPorMetodo.otro)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Último arqueo</Text>

        {!ultimoArqueo ? (
          <Text style={styles.emptyText}>No hay arqueos disponibles para el filtro actual.</Text>
        ) : (
          <>
            <Text style={styles.metricBlock}>
              Caja: {ultimoArqueo?.cajaId?.nombre || 'sin valor'} ({ultimoArqueo?.cajaId?.codigo || 'sin valor'})
            </Text>
            <Text style={styles.metricBlock}>
              Fecha: {formatDateTime(ultimoArqueo.fechaArqueo || ultimoArqueo.createdAt)}
            </Text>
            <Text style={styles.metricBlock}>
              arqueoId: {ultimoArqueo._id || 'sin valor'}
            </Text>

            <StatusBadge
              label={arqueoSemantic.text}
              variant={arqueoSemantic.variant}
            />

            <View style={styles.detailListBox}>
              <Text style={styles.detailListTitle}>Detalle del arqueo</Text>

              <Text style={styles.metricBlock}>
                Esperado efectivo: {formatCurrency(ultimoArqueo.esperadoEfectivo || 0)}
              </Text>
              <Text style={styles.metricBlock}>
                Contado efectivo: {formatCurrency(ultimoArqueo.contadoEfectivo || 0)}
              </Text>
              <Text style={styles.metricBlock}>
                Diferencia: {formatCurrency((ultimoArqueo.contadoEfectivo || 0) - (ultimoArqueo.esperadoEfectivo || 0))}
              </Text>
              <Text style={styles.metricBlock}>
                Transferencia: {formatCurrency(ultimoArqueo.totalTransferencia || 0)}
              </Text>
              <Text style={styles.metricBlock}>
                Mixto: {formatCurrency(ultimoArqueo.totalMixto || 0)}
              </Text>
              <Text style={styles.metricBlock}>
                Otro: {formatCurrency(ultimoArqueo.totalOtro || 0)}
              </Text>
            </View>
          </>
        )}
      </View>

      <Pressable style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Volver al inicio</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111827',
  },
  loader: {
    marginTop: 12,
  },
  reloadButton: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  filterRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  activeFiltersBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  activeFiltersText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111827',
  },
  clearButton: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  summaryChipLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryChipValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  activityText: {
    fontSize: 14,
    color: '#4b5563',
  },
  metricRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  metricBlock: {
    fontSize: 14,
    lineHeight: 22,
    color: '#111827',
    marginBottom: 6,
  },
  detailListBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  detailListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  semanticBoxBase: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    marginTop: 4,
  },
  semanticTextBase: {
    fontSize: 14,
    fontWeight: '700',
  },
  semanticPositiveBox: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  semanticPositiveText: {
    color: '#166534',
  },
  semanticNegativeBox: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  semanticNegativeText: {
    color: '#b91c1c',
  },
  semanticNeutralBox: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  semanticNeutralText: {
    color: '#1d4ed8',
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
  },
  button: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
