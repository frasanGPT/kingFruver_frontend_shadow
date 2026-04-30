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
import { getActiveEnvironment } from '../config/environments';
import { createCompra, getCompras } from '../services/compraService';
import { getProveedores } from '../services/proveedorService';
import { loadSession } from '../services/sessionService';

function getRoleCode(usuario) {
  if (usuario && usuario.roleId && usuario.roleId.codigo) return usuario.roleId.codigo;
  if (usuario && usuario.rol) return usuario.rol;
  return '';
}

function getId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id;
  if (value.id) return value.id;
  return '';
}

function getSedeIdFromSession(session) {
  const environment = getActiveEnvironment();
  const usuario = session && session.usuario ? session.usuario : null;

  return (
    getId(session && session.sedeId ? session.sedeId : null) ||
    getId(usuario && usuario.sedeId ? usuario.sedeId : null) ||
    environment.defaultSedeId ||
    ''
  );
}

function normalizeProveedor(item) {
  return {
    id: getId(item),
    nombre: item && item.nombre ? item.nombre : 'Sin nombre',
    documento: item && item.documento ? item.documento : '',
    activo: item && item.activo === true,
  };
}

function normalizeCompra(item) {
  const proveedor = item && item.proveedorId ? item.proveedorId : null;
  const sede = item && item.sedeId ? item.sedeId : null;
  const items = Array.isArray(item && item.items ? item.items : null) ? item.items : [];

  return {
    id: getId(item),
    estado: item && item.estado ? item.estado : 'sin estado',
    origenCompra: item && item.origenCompra ? item.origenCompra : 'sin origen',
    proveedorNombre: proveedor && proveedor.nombre ? proveedor.nombre : 'sin proveedor',
    sedeCodigo: sede && sede.codigo ? sede.codigo : 'sin sede',
    items,
    totalItems: items.length,
    createdAt: item && item.createdAt ? item.createdAt : '',
  };
}

export default function ComprasScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [screenResult, setScreenResult] = useState('Carga compras reales desde el backend.');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [proveedorId, setProveedorId] = useState('');
  const [origenCompra, setOrigenCompra] = useState('EN_BODEGA');
  const [productoNombre, setProductoNombre] = useState('');
  const [unidadCompra, setUnidadCompra] = useState('kg');
  const [cantidadCompra, setCantidadCompra] = useState('');
  const [costoTotalItem, setCostoTotalItem] = useState('');
  const [flete, setFlete] = useState('');
  const [notas, setNotas] = useState('');

  const roleCode = getRoleCode(session && session.usuario ? session.usuario : null);
  const token = session && session.token ? session.token : '';
  const sedeId = getSedeIdFromSession(session);
  const canCreate = roleCode === 'admin';

  const proveedorSeleccionado = useMemo(() => {
    return proveedores.find((item) => item.id === proveedorId) || null;
  }, [proveedores, proveedorId]);

  async function loadData(currentToken, successMessage) {
    const effectiveToken = currentToken || token;

    if (!effectiveToken) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    try {
      setLoading(true);
      setScreenResult('Consultando proveedores y compras...');

      const proveedoresResponse = await getProveedores({ token: effectiveToken, activo: true });
      const comprasResponse = await getCompras({ token: effectiveToken });

      const proveedoresData = Array.isArray(proveedoresResponse && proveedoresResponse.data ? proveedoresResponse.data : null)
        ? proveedoresResponse.data
        : [];
      const comprasData = Array.isArray(comprasResponse && comprasResponse.data ? comprasResponse.data : null)
        ? comprasResponse.data
        : [];

      const normalizedProveedores = proveedoresData.map(normalizeProveedor);
      const normalizedCompras = comprasData.map(normalizeCompra);

      setProveedores(normalizedProveedores);
      setCompras(normalizedCompras);

      if (!proveedorId && normalizedProveedores.length > 0) {
        setProveedorId(normalizedProveedores[0].id);
      }

      const loadedMessage =
        'Compras cargadas: ' +
        normalizedCompras.length +
        '. Proveedores activos: ' +
        normalizedProveedores.length +
        '.';

      setScreenResult(successMessage ? successMessage + ' ' + loadedMessage : loadedMessage);
    } catch (error) {
      setScreenResult('Error cargando compras: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const restoredSession = await loadSession();

        if (mounted === false) return;

        setSession(restoredSession);

        if (restoredSession && restoredSession.token) {
          await loadData(restoredSession.token);
        } else {
          setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
        }
      } catch (error) {
        if (mounted) {
          setScreenResult('Error cargando sesión: ' + error.message);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  function validateCreateForm() {
    const cantidad = Number(cantidadCompra);
    const costo = Number(costoTotalItem);
    const fleteNumber = flete.trim() ? Number(flete) : 0;

    if (!token) return 'No hay sesión activa.';
    if (!canCreate) return 'Solo el administrador puede registrar compras.';
    if (!sedeId) return 'No se encontró sede operativa para la compra.';
    if (!proveedorId) return 'Selecciona un proveedor.';
    if (!productoNombre.trim()) return 'El nombre del producto es obligatorio.';
    if (!['kg', 'lb', 'und', 'caja'].includes(unidadCompra)) return 'Unidad inválida. Usa kg, lb, und o caja.';
    if (!Number.isFinite(cantidad) || cantidad <= 0) return 'La cantidad debe ser mayor a cero.';
    if (!Number.isFinite(costo) || costo <= 0) return 'El costo total debe ser mayor a cero.';
    if (!Number.isFinite(fleteNumber) || fleteNumber < 0) return 'El flete no puede ser negativo.';

    return '';
  }

  async function handleCreateCompra() {
    const validationError = validateCreateForm();

    if (validationError) {
      setScreenResult(validationError);
      return;
    }

    try {
      setCreating(true);
      setScreenResult('Registrando compra...');

      const compra = {
        sedeId,
        proveedorId,
        origenCompra,
        flete: flete.trim() ? Number(flete) : 0,
        notas: notas.trim() || undefined,
        items: [
          {
            productoNombre: productoNombre.trim(),
            unidadCompra,
            cantidadCompra: Number(cantidadCompra),
            costoTotalItem: Number(costoTotalItem),
          },
        ],
      };

      const response = await createCompra({ compra, token });

      if (response && response.ok === true) {
        setProductoNombre('');
        setCantidadCompra('');
        setCostoTotalItem('');
        setFlete('');
        setNotas('');
        await loadData(token, 'Compra registrada correctamente.');
        return;
      }

      throw new Error((response && (response.message || response.error)) || 'No se pudo registrar la compra.');
    } catch (error) {
      setScreenResult('Error registrando compra: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      title="Compras"
      subtitle="Registro de abastecimiento"
      description="Registra compras asociadas a proveedor y sede. Todavía no mueve inventario."
      layout="top"
    >
      <View style={styles.actionsRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </Pressable>

        <Pressable
          style={[styles.reloadButton, loading ? styles.disabledButton : null]}
          onPress={() => loadData()}
          disabled={loading}
        >
          <Text style={styles.reloadButtonText}>
            {loading ? 'Cargando...' : 'Recargar compras'}
          </Text>
        </Pressable>
      </View>

      <StateNoticeCard title="Resultado" description={screenResult} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Sesión actual</Text>
        <Text style={styles.summaryText}>Rol: {roleCode || 'sin rol'}</Text>
        <Text style={styles.summaryText}>Sede usada: {sedeId || 'sin sede'}</Text>
        <Text style={styles.summaryText}>Compras cargadas: {compras.length}</Text>
        <Text style={styles.summaryText}>Proveedores activos: {proveedores.length}</Text>
        <Text style={styles.summaryText}>
          Registrar compra: {canCreate ? 'disponible para admin' : 'solo lectura'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registrar compra</Text>
        <Text style={styles.helperText}>
          Esta compra queda confirmada, pero todavía no genera lote ni inventario.
        </Text>

        <Text style={styles.label}>Proveedor</Text>
        <ScrollView style={styles.providerList} nestedScrollEnabled>
          {proveedores.map((item) => (
            <Pressable
              key={item.id || item.nombre}
              style={[
                styles.providerOption,
                proveedorId === item.id ? styles.providerOptionSelected : null,
              ]}
              onPress={() => setProveedorId(item.id)}
              disabled={!canCreate || creating}
            >
              <Text style={styles.providerOptionText}>{item.nombre}</Text>
              <Text style={styles.providerOptionSubtext}>
                {item.documento || 'sin documento'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.helperText}>
          Seleccionado: {proveedorSeleccionado ? proveedorSeleccionado.nombre : 'ninguno'}
        </Text>

        <Text style={styles.label}>Origen</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[
              styles.toggleButton,
              origenCompra === 'EN_BODEGA' ? styles.toggleButtonActive : null,
            ]}
            onPress={() => setOrigenCompra('EN_BODEGA')}
            disabled={!canCreate || creating}
          >
            <Text style={styles.toggleText}>En bodega</Text>
          </Pressable>

          <Pressable
            style={[
              styles.toggleButton,
              origenCompra === 'EN_FINCA' ? styles.toggleButtonActive : null,
            ]}
            onPress={() => setOrigenCompra('EN_FINCA')}
            disabled={!canCreate || creating}
          >
            <Text style={styles.toggleText}>En finca</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Producto *</Text>
        <TextInput
          style={styles.input}
          value={productoNombre}
          onChangeText={setProductoNombre}
          placeholder="Ej: Papa capira"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Unidad: kg, lb, und o caja</Text>
        <TextInput
          style={styles.input}
          value={unidadCompra}
          onChangeText={setUnidadCompra}
          placeholder="kg"
          autoCapitalize="none"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Cantidad *</Text>
        <TextInput
          style={styles.input}
          value={cantidadCompra}
          onChangeText={setCantidadCompra}
          placeholder="Ej: 10"
          keyboardType="numeric"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Costo total item *</Text>
        <TextInput
          style={styles.input}
          value={costoTotalItem}
          onChangeText={setCostoTotalItem}
          placeholder="Ej: 35000"
          keyboardType="numeric"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Flete</Text>
        <TextInput
          style={styles.input}
          value={flete}
          onChangeText={setFlete}
          placeholder="0"
          keyboardType="numeric"
          editable={canCreate && !creating}
        />

        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={styles.input}
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones"
          editable={canCreate && !creating}
        />

        <Pressable
          style={[styles.primaryButton, (!canCreate || creating) ? styles.disabledButton : null]}
          onPress={handleCreateCompra}
          disabled={!canCreate || creating}
        >
          <Text style={styles.primaryButtonText}>
            {creating ? 'Registrando...' : 'Registrar compra'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado de compras</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Consultando compras...</Text>
          </View>
        ) : null}

        <ScrollView style={styles.list} nestedScrollEnabled>
          {compras.length === 0 ? (
            <Text style={styles.emptyText}>No hay compras cargadas.</Text>
          ) : null}

          {compras.map((item) => (
            <View key={item.id || item.createdAt} style={styles.compraCard}>
              <Text style={styles.compraTitle}>{item.proveedorNombre}</Text>
              <Text style={styles.compraText}>Estado: {item.estado}</Text>
              <Text style={styles.compraText}>Origen: {item.origenCompra}</Text>
              <Text style={styles.compraText}>Sede: {item.sedeCodigo}</Text>
              <Text style={styles.compraText}>Items: {item.totalItems}</Text>
              {item.items.map((compraItem, index) => (
                <Text key={index} style={styles.compraItemText}>
                  • {compraItem.productoNombre} · {compraItem.cantidadCompra} {compraItem.unidadCompra} · ${compraItem.costoTotalItem}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  backButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  backButtonText: {
    color: '#111827',
    fontWeight: '800',
  },
  reloadButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
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
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#ffffff',
  },
  providerList: {
    maxHeight: 180,
    marginBottom: 10,
  },
  providerOption: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  providerOptionSelected: {
    borderColor: '#111827',
    backgroundColor: '#e5e7eb',
  },
  providerOptionText: {
    fontWeight: '900',
    color: '#111827',
  },
  providerOptionSubtext: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  toggleButtonActive: {
    backgroundColor: '#e5e7eb',
    borderColor: '#111827',
  },
  toggleText: {
    color: '#111827',
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
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
  compraCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  compraTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  compraText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
  compraItemText: {
    fontSize: 13,
    color: '#111827',
    marginTop: 4,
  },
});
