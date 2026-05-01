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
import { createProveedor, getProveedores } from '../services/proveedorService';
import { loadSession } from '../services/sessionService';

function getRoleCode(usuario) {
  if (usuario && usuario.roleId && usuario.roleId.codigo) return usuario.roleId.codigo;
  if (usuario && usuario.rol) return usuario.rol;
  return '';
}

function normalizeProveedor(item) {
  return {
    id: item && (item._id || item.proveedorId) ? (item._id || item.proveedorId) : '',
    nombre: item && item.nombre ? item.nombre : 'Sin nombre',
    documento: item && item.documento ? item.documento : '',
    telefono: item && item.telefono ? item.telefono : '',
    email: item && item.email ? item.email : '',
    activo: item && item.activo === true,
  };
}

export default function ProveedoresScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [screenResult, setScreenResult] = useState('Carga proveedores reales desde el backend.');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  const roleCode = getRoleCode(session && session.usuario ? session.usuario : null);
  const token = session && session.token ? session.token : '';
  const canCreate = roleCode === 'admin';

  const activeProviders = useMemo(() => {
    return proveedores.filter((item) => item.activo === true);
  }, [proveedores]);

  async function loadProveedoresFromApi(currentToken) {
    const effectiveToken = currentToken || token;

    if (!effectiveToken) {
      setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
      return;
    }

    try {
      setLoading(true);
      setScreenResult('Consultando proveedores...');

      const response = await getProveedores({ token: effectiveToken });
      const data = Array.isArray(response && response.data ? response.data : null)
        ? response.data
        : [];
      const normalized = data.map(normalizeProveedor);

      setProveedores(normalized);
      setScreenResult('Proveedores cargados: ' + normalized.length + '. Activos: ' + activeProviders.length + '.');
    } catch (error) {
      setScreenResult('Error cargando proveedores: ' + error.message);
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
          await loadProveedoresFromApi(restoredSession.token);
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

  async function handleCreateProveedor() {
    if (!token) {
      setScreenResult('No hay sesión activa.');
      return;
    }

    if (!canCreate) {
      setScreenResult('Solo el administrador puede crear proveedores.');
      return;
    }

    if (!nombre.trim()) {
      setScreenResult('El nombre del proveedor es obligatorio.');
      return;
    }

    try {
      setCreating(true);
      setScreenResult('Creando proveedor...');

      const proveedor = {
        nombre: nombre.trim(),
        documento: documento.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
      };

      const response = await createProveedor({ proveedor, token });

      if (response && response.ok === true) {
        setNombre('');
        setDocumento('');
        setTelefono('');
        setEmail('');
        setScreenResult('Proveedor creado correctamente.');
        await loadProveedoresFromApi(token);
        return;
      }

      throw new Error((response && (response.message || response.error)) || 'No se pudo crear el proveedor.');
    } catch (error) {
      setScreenResult('Error creando proveedor: ' + error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      title="Proveedores"
      subtitle="Directorio operativo"
      description="Base para registrar compras, lotes y abastecimiento."
      layout="top"
    >
      <View style={styles.actionsRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </Pressable>

        <Pressable
          style={[styles.reloadButton, loading ? styles.disabledButton : null]}
          onPress={() => loadProveedoresFromApi()}
          disabled={loading}
        >
          <Text style={styles.reloadButtonText}>
            {loading ? 'Cargando...' : 'Recargar proveedores'}
          </Text>
        </Pressable>
      </View>

      <StateNoticeCard title="Resultado" description={screenResult} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Sesión actual</Text>
        <Text style={styles.summaryText}>Rol: {roleCode || 'sin rol'}</Text>
        <Text style={styles.summaryText}>Total proveedores: {proveedores.length}</Text>
        <Text style={styles.summaryText}>Activos: {activeProviders.length}</Text>
        <Text style={styles.summaryText}>
          Crear proveedor: {canCreate ? 'disponible para admin' : 'solo lectura'}
        </Text>
      </View>

      {canCreate ? (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crear proveedor</Text>
        <Text style={styles.helperText}>
          Por ahora solo el administrador crea proveedores. Supervisor puede consultar.
        </Text>

        <Text style={styles.label}>Nombre *</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre del proveedor" editable={canCreate && !creating} />

        <Text style={styles.label}>Documento</Text>
        <TextInput style={styles.input} value={documento} onChangeText={setDocumento} placeholder="NIT / documento" editable={canCreate && !creating} />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" editable={canCreate && !creating} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@proveedor.com" autoCapitalize="none" editable={canCreate && !creating} />

        <Pressable
          style={[styles.primaryButton, (!canCreate || creating) ? styles.disabledButton : null]}
          onPress={handleCreateProveedor}
          disabled={!canCreate || creating}
        >
          <Text style={styles.primaryButtonText}>
            {creating ? 'Creando...' : 'Crear proveedor'}
          </Text>
        </Pressable>
      </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registro de proveedor</Text>
          <Text style={styles.helperText}>
            Disponible solo para administrador. Como supervisor puedes revisar el directorio y el estado de proveedores.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Listado</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Consultando proveedores...</Text>
          </View>
        ) : null}

        <ScrollView style={styles.list} nestedScrollEnabled>
          {proveedores.length === 0 ? (
            <Text style={styles.emptyText}>No hay proveedores cargados.</Text>
          ) : null}

          {proveedores.map((item) => (
            <View key={item.id || item.nombre} style={styles.providerCard}>
              <View style={styles.providerHeader}>
                <Text style={styles.providerName}>{item.nombre}</Text>
                <Text style={[styles.statusBadge, item.activo ? styles.activeBadge : styles.inactiveBadge]}>
                  {item.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>

              <Text style={styles.providerText}>Documento: {item.documento || 'sin documento'}</Text>
              <Text style={styles.providerText}>Teléfono: {item.telefono || 'sin teléfono'}</Text>
              <Text style={styles.providerText}>Email: {item.email || 'sin email'}</Text>
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
  providerCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  providerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  providerText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
});
