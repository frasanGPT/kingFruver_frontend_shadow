import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppShell from '../components/AppShell';
import StateNoticeCard from '../components/StateNoticeCard';
import { loadSession } from '../services/sessionService';
import {
  applyReferenciaCosto,
  createReferenciaCosto,
  getReferenciasCosto,
  reviewReferenciaCosto,
} from '../services/referenciaCostoService';
import { getInventarioDisponible } from '../services/inventarioService';
import { getRoleCode } from '../utils/accessControl';

function normalizeReferencia(item) {
  return {
    id: item && item._id ? item._id : '',
    inventarioId: item && item.inventarioId ? item.inventarioId : '',
    productoNombre: item && item.productoNombre ? item.productoNombre : 'Sin producto',
    unidadBase: item && item.unidadBase ? item.unidadBase : '',
    estado: item && item.estado ? item.estado : 'sin estado',
    cantidadNueva: Number(item && item.cantidadNueva ? item.cantidadNueva : 0),
    costoPromedioAnterior: Number(item && item.costoPromedioAnterior ? item.costoPromedioAnterior : 0),
    costoPromedioPropuesto: Number(item && item.costoPromedioPropuesto ? item.costoPromedioPropuesto : 0),
    precioVentaAnterior: Number(item && item.precioVentaAnterior ? item.precioVentaAnterior : 0),
    precioVentaDecidido:
      item && item.precioVentaDecidido !== null && item.precioVentaDecidido !== undefined
        ? Number(item.precioVentaDecidido)
        : null,
    preparadoPorNombre:
      item && item.preparadoPor && item.preparadoPor.nombre
        ? item.preparadoPor.nombre
        : 'Sin responsable',
    preparadoPorEmail:
      item && item.preparadoPor && item.preparadoPor.email
        ? item.preparadoPor.email
        : '',
    observacionesAdmin: item && item.observacionesAdmin ? item.observacionesAdmin : '',
  };
}

function normalizeInventario(item) {
  return {
    id: item && item._id ? item._id : '',
    productoNombre: item && item.productoNombre ? item.productoNombre : 'Sin producto',
    unidadBase: item && item.unidadBase ? item.unidadBase : '',
    stockDisponible: Number(item && item.stockDisponible ? item.stockDisponible : 0),
    costoPromedio: Number(item && item.costoPromedio ? item.costoPromedio : 0),
    precioDeVenta:
      item && item.precioDeVenta !== null && item.precioDeVenta !== undefined
        ? Number(item.precioDeVenta)
        : null,
    activo: item && item.activo === true,
  };
}

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDecimalInput(value) {
  if (typeof value !== 'string') {
    return NaN;
  }

  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return NaN;
  }

  return Number(normalized);
}

export default function ReferenciasCostoScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [referencias, setReferencias] = useState([]);
  const [inventarioItems, setInventarioItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [creating, setCreating] = useState(false);
  const [screenResult, setScreenResult] = useState(
    'Carga referencias de costo reales desde el backend.'
  );

  const [inventarioId, setInventarioId] = useState('');
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [costoTotalCompra, setCostoTotalCompra] = useState('');
  const [fleteAsignado, setFleteAsignado] = useState('');
  const [observacionesSupervisor, setObservacionesSupervisor] = useState('');
  const [adminActionLoadingId, setAdminActionLoadingId] = useState('');
  const [adminObservationDrafts, setAdminObservationDrafts] = useState({});
  const [adminPriceDrafts, setAdminPriceDrafts] = useState({});

  const roleCode = getRoleCode(session && session.usuario ? session.usuario : null);
  const token = session && session.token ? session.token : '';
  const sedeId = session && session.sedeId ? session.sedeId : '';
  const canCreate = roleCode === 'admin' || roleCode === 'supervisor';
  const canApply = roleCode === 'admin';
  const canReview = roleCode === 'admin';

  const pendingCount = useMemo(() => {
    return referencias.filter((item) => item.estado === 'pendiente').length;
  }, [referencias]);

  const selectedInventario = useMemo(() => {
    return inventarioItems.find((item) => item.id === inventarioId) || null;
  }, [inventarioItems, inventarioId]);

  async function loadReferencias(currentToken, currentSedeId) {
    const effectiveToken = currentToken || token;
    const effectiveSedeId = currentSedeId || sedeId;

    if (!effectiveToken) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    try {
      setLoading(true);
      setScreenResult('Consultando referencias de costo...');

      const response = await getReferenciasCosto({
        token: effectiveToken,
        sedeId: effectiveSedeId || undefined,
      });

      const data = Array.isArray(response && response.data ? response.data : null)
        ? response.data
        : [];

      const normalized = data.map(normalizeReferencia);

      setReferencias(normalized);
      setAdminObservationDrafts((prev) => {
        const next = { ...prev };
        normalized.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = item.observacionesAdmin || '';
          }
        });
        return next;
      });
      setAdminPriceDrafts((prev) => {
        const next = { ...prev };
        normalized.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] =
              item.precioVentaDecidido === null || item.precioVentaDecidido === undefined
                ? ''
                : String(item.precioVentaDecidido);
          }
        });
        return next;
      });
      setScreenResult(
        'Referencias cargadas: ' +
          normalized.length +
          '. Pendientes: ' +
          normalized.filter((item) => item.estado === 'pendiente').length +
          '.'
      );
    } catch (error) {
      setScreenResult('Error cargando referencias: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadInventario(currentToken, currentSedeId) {
    const effectiveToken = currentToken || token;
    const effectiveSedeId = currentSedeId || sedeId;

    if (!effectiveToken) {
      return;
    }

    try {
      setLoadingInventario(true);

      const response = await getInventarioDisponible({
        token: effectiveToken,
        sedeId: effectiveSedeId || undefined,
      });

      const data = Array.isArray(response && response.data ? response.data : null)
        ? response.data
        : [];

      setInventarioItems(data.map(normalizeInventario));
    } catch (error) {
      setScreenResult('Error cargando inventario: ' + error.message);
    } finally {
      setLoadingInventario(false);
    }
  }

  async function hydrateData(restoredSession) {
    const restoredToken = restoredSession && restoredSession.token ? restoredSession.token : '';
    const restoredSedeId = restoredSession && restoredSession.sedeId ? restoredSession.sedeId : '';

    if (!restoredToken) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    await Promise.all([
      loadReferencias(restoredToken, restoredSedeId),
      loadInventario(restoredToken, restoredSedeId),
    ]);
  }

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const restoredSession = await loadSession();

        if (!mounted) return;

        setSession(restoredSession);

        if (restoredSession && restoredSession.token) {
          await hydrateData(restoredSession);
        } else {
          setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
        }
      } catch (error) {
        if (!mounted) return;
        setScreenResult('Error cargando sesión: ' + error.message);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreateReferencia() {
    if (!canCreate) {
      setScreenResult('Tu rol no tiene permiso para crear referencias de costo.');
      return;
    }

    if (!token) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    if (!inventarioId) {
      setScreenResult('Debes seleccionar un producto del inventario.');
      return;
    }

    const cantidadNuevaValue = parseDecimalInput(cantidadNueva);
    if (!Number.isFinite(cantidadNuevaValue) || cantidadNuevaValue <= 0) {
      setScreenResult('Cantidad nueva debe ser mayor que cero.');
      return;
    }

    const costoTotalCompraValue = parseDecimalInput(costoTotalCompra);
    if (!Number.isFinite(costoTotalCompraValue) || costoTotalCompraValue < 0) {
      setScreenResult('Costo total compra debe ser cero o mayor.');
      return;
    }

    const fleteAsignadoValue =
      fleteAsignado.trim() === '' ? 0 : parseDecimalInput(fleteAsignado);
    if (!Number.isFinite(fleteAsignadoValue) || fleteAsignadoValue < 0) {
      setScreenResult('Flete asignado debe ser cero o mayor.');
      return;
    }

    try {
      setCreating(true);
      setScreenResult('Guardando referencia de costo...');

      await createReferenciaCosto({
        token,
        referencia: {
          inventarioId,
          cantidadNueva: cantidadNuevaValue,
          costoTotalCompra: costoTotalCompraValue,
          fleteAsignado: fleteAsignadoValue,
          observacionesSupervisor: observacionesSupervisor.trim(),
        },
      });

      setCantidadNueva('');
      setCostoTotalCompra('');
      setFleteAsignado('');
      setObservacionesSupervisor('');
      setInventarioId('');

      await loadReferencias(token, sedeId);
      setScreenResult('Referencia de costo creada correctamente.');
    } catch (error) {
      setScreenResult('Error creando referencia: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleAdminReview(itemId, decisionAdmin) {
    if (!canReview) {
      setScreenResult('Tu rol no tiene permiso para revisar referencias.');
      return;
    }

    if (!token) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    try {
      setAdminActionLoadingId(itemId);
      setScreenResult('Guardando decisión administrativa...');

      await reviewReferenciaCosto({
        id: itemId,
        token,
        payload: {
          decisionAdmin,
          observacionesAdmin: (adminObservationDrafts[itemId] || '').trim(),
        },
      });

      await loadReferencias(token, sedeId);
      setScreenResult(
        decisionAdmin === 'descartar_referencia'
          ? 'Referencia descartada correctamente.'
          : 'Referencia revisada correctamente.'
      );
    } catch (error) {
      setScreenResult('Error guardando decisión admin: ' + error.message);
    } finally {
      setAdminActionLoadingId('');
    }
  }

  async function handleAdminApply(itemId) {
    if (!canApply) {
      setScreenResult('Tu rol no tiene permiso para aplicar referencias.');
      return;
    }

    if (!token) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    const precioVentaDecidido = parseDecimalInput(adminPriceDrafts[itemId] || '');

    if (!Number.isFinite(precioVentaDecidido) || precioVentaDecidido <= 0) {
      setScreenResult('Precio de venta decidido debe ser mayor que cero.');
      return;
    }

    try {
      setAdminActionLoadingId(itemId);
      setScreenResult('Aplicando referencia de costo...');

      await applyReferenciaCosto({
        id: itemId,
        token,
        payload: {
          precioVentaDecidido,
          observacionesAdmin: (adminObservationDrafts[itemId] || '').trim(),
        },
      });

      await loadReferencias(token, sedeId);
      setScreenResult('Referencia aplicada correctamente.');
    } catch (error) {
      setScreenResult('Error aplicando referencia: ' + error.message);
    } finally {
      setAdminActionLoadingId('');
    }
  }

  return (
    <AppShell
      title="Referencias costo"
      subtitle="Trazabilidad mínima de costo para decisión comercial"
      description="Supervisor prepara, admin revisa y aplica cuando corresponda."
      layout="top"
    >
      <StateNoticeCard title="Resultado" description={screenResult} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Sesión actual</Text>
        <Text style={styles.summaryText}>Rol: {roleCode || 'sin rol'}</Text>
        <Text style={styles.summaryText}>Sede usada: {sedeId || 'sin sede'}</Text>
        <Text style={styles.summaryText}>Registros: {referencias.length}</Text>
        <Text style={styles.summaryText}>Pendientes: {pendingCount}</Text>
        <Text style={styles.summaryText}>Productos activos: {inventarioItems.length}</Text>
        <Text style={styles.summaryText}>
          Crear referencia: {canCreate ? 'disponible' : 'sin acceso'}
        </Text>
        <Text style={styles.summaryText}>
          Aplicar referencia: {canApply ? 'disponible' : 'solo admin'}
        </Text>
      </View>

      {canCreate ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear referencia de costo</Text>
          <Text style={styles.cardText}>
            Selecciona un producto real del inventario y registra los datos de costo nuevos.
          </Text>

          <Text style={styles.label}>Producto</Text>

          {loadingInventario ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Consultando inventario...</Text>
            </View>
          ) : null}

          <ScrollView style={styles.selectorList} nestedScrollEnabled>
            {inventarioItems.length === 0 ? (
              <Text style={styles.emptyText}>No hay productos activos disponibles.</Text>
            ) : null}

            {inventarioItems.map((item) => (
              <Pressable
                key={item.id || item.productoNombre}
                style={[
                  styles.selectorOption,
                  inventarioId === item.id ? styles.selectorOptionSelected : null,
                ]}
                onPress={() => setInventarioId(item.id)}
                disabled={creating}
              >
                <Text style={styles.selectorOptionTitle}>
                  {item.productoNombre} ({item.unidadBase || 'sin unidad'})
                </Text>
                <Text style={styles.selectorOptionSubtext}>
                  Unidad: {item.unidadBase || 'sin unidad'} | Stock: {item.stockDisponible}
                </Text>
                <Text style={styles.selectorOptionSubtext}>
                  Costo promedio: {formatCurrency(item.costoPromedio)}
                </Text>
                <Text style={styles.selectorOptionSubtext}>
                  Precio venta:{' '}
                  {item.precioDeVenta === null
                    ? 'sin configurar'
                    : formatCurrency(item.precioDeVenta)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.helperText}>
            Seleccionado:{' '}
            {selectedInventario
              ? `${selectedInventario.productoNombre} (${selectedInventario.unidadBase || 'sin unidad'})`
              : 'ninguno'}
          </Text>

          {selectedInventario ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Stock actual: {selectedInventario.stockDisponible}
              </Text>
              <Text style={styles.infoText}>
                Costo promedio actual: {formatCurrency(selectedInventario.costoPromedio)}
              </Text>
              <Text style={styles.infoText}>
                Precio venta actual:{' '}
                {selectedInventario.precioDeVenta === null
                  ? 'sin configurar'
                  : formatCurrency(selectedInventario.precioDeVenta)}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Cantidad nueva *</Text>
          <TextInput
            style={styles.input}
            value={cantidadNueva}
            onChangeText={setCantidadNueva}
            placeholder="Ej: 10"
            keyboardType="decimal-pad"
            editable={!creating}
          />

          <Text style={styles.label}>Costo total compra *</Text>
          <TextInput
            style={styles.input}
            value={costoTotalCompra}
            onChangeText={setCostoTotalCompra}
            placeholder="Ej: 50000"
            keyboardType="decimal-pad"
            editable={!creating}
          />

          <Text style={styles.label}>Flete asignado</Text>
          <TextInput
            style={styles.input}
            value={fleteAsignado}
            onChangeText={setFleteAsignado}
            placeholder="Ej: 5000"
            keyboardType="decimal-pad"
            editable={!creating}
          />

          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={observacionesSupervisor}
            onChangeText={setObservacionesSupervisor}
            placeholder="Notas opcionales sobre esta referencia"
            multiline
            numberOfLines={3}
            editable={!creating}
          />

          <Pressable
            style={[styles.button, creating ? styles.disabledButton : null]}
            onPress={handleCreateReferencia}
            disabled={creating}
          >
            <Text style={styles.buttonText}>
              {creating ? 'Guardando...' : 'Guardar referencia'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear referencia de costo</Text>
          <Text style={styles.cardText}>Disponible para supervisor y administrador.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Consultando referencias...</Text>
          </View>
        ) : null}

        <ScrollView style={styles.list} nestedScrollEnabled>
          {referencias.length === 0 ? (
            <Text style={styles.emptyText}>No hay referencias de costo cargadas.</Text>
          ) : null}

          {referencias.map((item, index) => (
            <View
              key={item.id || item.productoNombre}
              style={[
                styles.cardRow,
                index === 0
                  ? {
                      borderColor: '#bbf7d0',
                      borderWidth: 2,
                      backgroundColor: '#f0fdf4',
                    }
                  : null,
              ]}
            >
              <Text style={styles.cardRowTitle}>
                {item.productoNombre} ({item.unidadBase || 'sin unidad'})
              </Text>
              <Text style={styles.cardRowText}>Estado: {item.estado}</Text>
              <Text style={styles.cardRowText}>
                Costo anterior: {formatCurrency(item.costoPromedioAnterior)}
              </Text>
              <Text style={styles.cardRowText}>
                Costo propuesto: {formatCurrency(item.costoPromedioPropuesto)}
              </Text>
              <Text style={styles.cardRowText}>
                Precio venta anterior: {formatCurrency(item.precioVentaAnterior)}
              </Text>
              <Text style={styles.cardRowText}>
                Precio decidido:{' '}
                {item.precioVentaDecidido === null
                  ? 'sin definir'
                  : formatCurrency(item.precioVentaDecidido)}
              </Text>
              <Text style={styles.cardRowText}>Preparado por: {item.preparadoPorNombre}</Text>
              <Text style={styles.cardRowSubtext}>
                {item.preparadoPorEmail || 'sin email'}
              </Text>

              {canReview ? (
                <View style={styles.adminBox}>
                  <Text style={styles.adminTitle}>Acciones admin</Text>

                  <TextInput
                    style={[styles.input, styles.adminInput]}
                    value={adminObservationDrafts[item.id] || ''}
                    onChangeText={(value) => {
                      setAdminObservationDrafts((prev) => ({
                        ...prev,
                        [item.id]: value,
                      }));
                    }}
                    placeholder="Observaciones admin"
                    multiline
                    numberOfLines={2}
                    editable={adminActionLoadingId !== item.id}
                  />

                  <TextInput
                    style={[styles.input, styles.adminInput]}
                    value={adminPriceDrafts[item.id] || ''}
                    onChangeText={(value) => {
                      setAdminPriceDrafts((prev) => ({
                        ...prev,
                        [item.id]: value,
                      }));
                    }}
                    placeholder="Precio de venta decidido"
                    keyboardType="decimal-pad"
                    editable={adminActionLoadingId !== item.id}
                  />

                  <View style={styles.adminActionsRow}>
                    <Pressable
                      style={[
                        styles.smallButton,
                        styles.smallNeutralButton,
                        adminActionLoadingId === item.id ? styles.disabledButton : null,
                      ]}
                      onPress={() => handleAdminReview(item.id, 'revisar_despues')}
                      disabled={adminActionLoadingId === item.id || item.estado === 'aplicada'}
                    >
                      <Text style={styles.smallNeutralButtonText}>Revisar después</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.smallButton,
                        styles.smallDangerButton,
                        adminActionLoadingId === item.id ? styles.disabledButton : null,
                      ]}
                      onPress={() => handleAdminReview(item.id, 'descartar_referencia')}
                      disabled={adminActionLoadingId === item.id || item.estado === 'aplicada'}
                    >
                      <Text style={styles.smallDangerButtonText}>Descartar</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[
                      styles.button,
                      styles.adminApplyButton,
                      adminActionLoadingId === item.id ? styles.disabledButton : null,
                    ]}
                    onPress={() => handleAdminApply(item.id)}
                    disabled={adminActionLoadingId === item.id || item.estado === 'aplicada'}
                  >
                    <Text style={styles.buttonText}>
                      {adminActionLoadingId === item.id ? 'Procesando...' : 'Aplicar referencia'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>

      <Pressable style={styles.secondaryAction} onPress={() => hydrateData(session)}>
        <Text style={styles.secondaryActionText}>Recargar datos</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={onBack}>
        <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    marginTop: 10,
  },
  helperText: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  selectorList: {
    maxHeight: 220,
    marginBottom: 6,
  },
  selectorOption: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  selectorOptionSelected: {
    borderColor: '#111827',
    backgroundColor: '#eef2ff',
  },
  selectorOptionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  selectorOptionSubtext: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2,
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#4b5563',
  },
  list: {
    maxHeight: 460,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  cardRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  cardRowTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  cardRowText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
  cardRowSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  adminBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dbe4ee',
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  adminInput: {
    marginTop: 6,
    marginBottom: 8,
  },
  adminActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smallButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  smallNeutralButton: {
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  smallNeutralButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  smallDangerButton: {
    backgroundColor: '#fee2e2',
  },
  smallDangerButtonText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '800',
  },
  button: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminApplyButton: {
    marginBottom: 0,
  },
  secondaryAction: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  secondaryActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
