import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppShell from '../components/AppShell';
import StateNoticeCard from '../components/StateNoticeCard';
import { blockUsuario, getUsuarios, unblockUsuario } from '../services/usuarioService';
import { getCarritos } from '../services/carritoService';
import { getCajas } from '../services/cajaService';
import { getVentas } from '../services/ventaService';
import { loadSession } from '../services/sessionService';
import { getRoleCode } from '../utils/accessControl';

function getUserId(usuario) {
  return usuario?._id || usuario?.id || '';
}

function getRoleDisplay(usuario) {
  if (usuario?.roleId && typeof usuario.roleId === 'object') {
    return usuario.roleId.codigo || usuario.roleId.nombre || 'sin rol';
  }

  return usuario?.rol || usuario?.roleId || 'sin rol';
}

function getSedeDisplay(usuario) {
  if (usuario?.sedeId && typeof usuario.sedeId === 'object') {
    return usuario.sedeId.codigo || usuario.sedeId.nombre || 'configurada';
  }

  return usuario?.sedeId || 'sin sede';
}

function normalizeUsuarios(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.usuarios)) {
    return response.usuarios;
  }

  if (Array.isArray(response?.data?.usuarios)) {
    return response.data.usuarios;
  }

  return [];
}
function normalizeApiRows(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  return [];
}

function getReferenceId(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
}

function getReferenceEmail(value) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  return value.email || '';
}

function referenceMatchesUser(value, usuario) {
  const refId = getReferenceId(value);
  const refEmail = getReferenceEmail(value);
  const usuarioId = getUserId(usuario);
  const usuarioEmail = usuario?.email || '';

  return (usuarioId && refId && String(refId) === String(usuarioId)) ||
    (usuarioEmail && refEmail && String(refEmail) === String(usuarioEmail));
}

function getSedeId(usuario) {
  return getReferenceId(usuario?.sedeId);
}

function getShortId(value) {
  const raw = getReferenceId(value) || String(value || '');

  if (raw.length <= 8) {
    return raw || 'sin id';
  }

  return raw.slice(-8);
}

export default function UsuariosScreen({ onBack }) {
  const [token, setToken] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [screenResult, setScreenResult] = useState('Cargando usuarios...');
  const [searchText, setSearchText] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingSummary, setPendingSummary] = useState(null);
  const [pendingCheckLoading, setPendingCheckLoading] = useState(false);

  const isAdmin = getRoleCode(authUser) === 'admin';
  const authUserId = getUserId(authUser);

  const filteredUsuarios = useMemo(() => {
    const needle = searchText.trim().toLowerCase();

    if (!needle) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const text = [
        usuario?.nombre,
        usuario?.email,
        getRoleDisplay(usuario),
        getSedeDisplay(usuario),
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(needle);
    });
  }, [usuarios, searchText]);

  async function loadUsuariosFromApi(sessionOverride = null) {
    const currentToken = sessionOverride?.token || token;

    if (!currentToken) {
      setUsuarios([]);
      setScreenResult('No hay sesión activa. Inicia sesión como admin.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setScreenResult('Consultando usuarios...');

      const response = await getUsuarios(currentToken);
      const rows = normalizeUsuarios(response);

      setUsuarios(rows);
      setScreenResult(`Usuarios cargados: ${rows.length}.`);
    } catch (error) {
      setScreenResult(`Error cargando usuarios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const session = await loadSession();

        if (!mounted) return;

        const restoredUser = session?.usuario || null;
        setToken(session?.token || '');
        setAuthUser(restoredUser);

        if (getRoleCode(restoredUser) !== 'admin') {
          setUsuarios([]);
          setScreenResult('Solo el administrador puede gestionar usuarios.');
          setLoading(false);
          return;
        }

        await loadUsuariosFromApi(session);
      } catch (error) {
        if (!mounted) return;
        setScreenResult(`Error inicializando usuarios: ${error.message}`);
        setLoading(false);
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  async function buildPendingSummary(usuario) {
    const usuarioId = getUserId(usuario);
    const sedeId = getSedeId(usuario);

    const carritosPromise = getCarritos({
      estado: 'activo',
      usuarioId,
      ...(sedeId ? { sedeId } : {}),
    }, token);

    const cajasPromise = getCajas({
      token,
      ...(sedeId ? { sedeId } : {}),
      estado: 'abierta',
      activo: true,
    });

    const ventasPromise = getVentas({
      usuarioId,
      ...(sedeId ? { sedeId } : {}),
    }, token);

    const [carritosResponse, cajasResponse, ventasResponse] = await Promise.all([
      carritosPromise,
      cajasPromise,
      ventasPromise,
    ]);

    const carritosActivos = normalizeApiRows(carritosResponse);
    const cajasAbiertas = normalizeApiRows(cajasResponse).filter((caja) => {
      return referenceMatchesUser(caja.openedByUsuarioId, usuario);
    });
    const ventasRecientes = normalizeApiRows(ventasResponse).slice(0, 3);

    return {
      carritosActivos,
      cajasAbiertas,
      ventasRecientes,
      carritosActivosCount: carritosActivos.length,
      cajasAbiertasCount: cajasAbiertas.length,
      ventasRecientesCount: ventasRecientes.length,
      hasBlockingWarnings: carritosActivos.length > 0 || cajasAbiertas.length > 0,
      error: null,
    };
  }

  async function openAction(usuario, action) {
    if (!isAdmin) {
      setScreenResult('Solo el administrador puede bloquear o desbloquear usuarios.');
      return;
    }

    if (getUserId(usuario) === authUserId && action === 'block') {
      setScreenResult('No puedes bloquear tu propio usuario.');
      return;
    }

    setPendingSummary(null);

    if (action === 'block') {
      try {
        setPendingCheckLoading(true);
        setScreenResult(`Revisando pendientes de ${usuario.email}...`);

        const summary = await buildPendingSummary(usuario);
        setPendingSummary(summary);

        if (summary.hasBlockingWarnings) {
          setScreenResult(`Pendientes detectados para ${usuario.email}. Revisa el modal antes de confirmar.`);
        } else {
          setScreenResult(`Sin carritos activos ni cajas abiertas asociadas para ${usuario.email}.`);
        }
      } catch (error) {
        setPendingSummary({
          carritosActivos: [],
          cajasAbiertas: [],
          ventasRecientes: [],
          carritosActivosCount: 0,
          cajasAbiertasCount: 0,
          ventasRecientesCount: 0,
          hasBlockingWarnings: true,
          error: error.message,
        });
        setScreenResult(`No se pudieron consultar pendientes: ${error.message}`);
      } finally {
        setPendingCheckLoading(false);
      }
    }

    setPendingAction({ usuario, action });
  }
  function closeActionModal() {
    if (actionLoading || pendingCheckLoading) return;
    setPendingAction(null);
    setPendingSummary(null);
  }

  async function confirmAction() {
    if (!pendingAction) return;

    const usuario = pendingAction.usuario;
    const action = pendingAction.action;
    const usuarioId = getUserId(usuario);

    if (!usuarioId) {
      setScreenResult('No se encontró el id del usuario.');
      setPendingAction(null);
      return;
    }

    try {
      setActionLoading(true);
      setScreenResult(action === 'block' ? 'Bloqueando usuario...' : 'Desbloqueando usuario...');

      const response =
        action === 'block'
          ? await blockUsuario(usuarioId, token)
          : await unblockUsuario(usuarioId, token);

      const updated = response?.data || null;
      const updatedEmail = updated?.email || usuario.email;

      setScreenResult(
        action === 'block'
          ? `Usuario bloqueado: ${updatedEmail}`
          : `Usuario desbloqueado: ${updatedEmail}`
      );
      setPendingAction(null);
      setPendingSummary(null);
      await loadUsuariosFromApi();
    } catch (error) {
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  const activeCount = usuarios.filter((usuario) => usuario.activo !== false).length;
  const blockedCount = usuarios.filter((usuario) => usuario.activo === false).length;

  return (
    <AppShell
      title="Usuarios"
      subtitle="Control administrativo"
      description="Gestiona accesos operativos sin borrar historial."
      layout="top"
    >
      <View style={styles.headerActions}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </Pressable>

        <Pressable style={styles.reloadButton} onPress={() => loadUsuariosFromApi()}>
          <Text style={styles.reloadButtonText}>Recargar usuarios</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen</Text>
        <Text style={styles.cardText}>Sesión: {authUser?.email || 'sin sesión'}</Text>
        <Text style={styles.cardText}>Rol: {getRoleCode(authUser) || 'sin rol'}</Text>
        <Text style={styles.cardText}>Usuarios activos: {activeCount}</Text>
        <Text style={styles.cardText}>Usuarios bloqueados: {blockedCount}</Text>
      </View>

      {!isAdmin ? (
        <StateNoticeCard
          title="Acceso restringido"
          description="Solo el administrador puede consultar, bloquear o desbloquear usuarios."
        />
      ) : null}

      {isAdmin ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buscar usuario</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Nombre, email, rol o sede"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {loading ? <ActivityIndicator size="large" style={styles.loader} /> : null}

      <Text style={styles.resultText}>{screenResult}</Text>

      {isAdmin ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Listado de usuarios</Text>

          {filteredUsuarios.length === 0 ? (
            <StateNoticeCard
              title="Sin usuarios"
              description="No hay usuarios para mostrar con el filtro actual."
            />
          ) : null}

          {filteredUsuarios.map((usuario) => {
            const usuarioId = getUserId(usuario);
            const isSelf = usuarioId === authUserId;
            const isActive = usuario.activo !== false;

            return (
              <View key={usuarioId || usuario.email} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userHeaderMain}>
                    <Text style={styles.userName}>{usuario.nombre || 'Sin nombre'}</Text>
                    <Text style={styles.userEmail}>{usuario.email}</Text>
                  </View>
                  <View style={[styles.statusPill, isActive ? styles.activePill : styles.blockedPill]}>
                    <Text style={[styles.statusPillText, isActive ? styles.activePillText : styles.blockedPillText]}>
                      {isActive ? 'Activo' : 'Bloqueado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rol</Text>
                  <Text style={styles.detailValue}>{getRoleDisplay(usuario)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sede</Text>
                  <Text style={styles.detailValue}>{getSedeDisplay(usuario)}</Text>
                </View>

                {isSelf ? (
                  <Text style={styles.selfText}>Este es tu usuario actual. No puedes bloquearte a ti mismo.</Text>
                ) : null}

                <View style={styles.actionRow}>
                  {isActive ? (
                    <Pressable
                      style={[styles.actionButton, styles.blockButton, isSelf ? styles.disabledButton : null]}
                      onPress={() => openAction(usuario, 'block')}
                      disabled={isSelf || actionLoading || pendingCheckLoading}
                    >
                      <Text style={styles.blockButtonText}>Bloquear</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.actionButton, styles.unblockButton]}
                      onPress={() => openAction(usuario, 'unblock')}
                      disabled={actionLoading || pendingCheckLoading}
                    >
                      <Text style={styles.unblockButtonText}>Desbloquear</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <Modal
        visible={Boolean(pendingAction)}
        transparent
        animationType="fade"
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar acción</Text>
            <Text style={styles.modalText}>
              {pendingAction?.action === 'block'
                ? `Vas a bloquear a ${pendingAction?.usuario?.email}.`
                : `Vas a desbloquear a ${pendingAction?.usuario?.email}.`}
            </Text>

            {pendingAction?.action === 'block' ? (
              <View>
                <Text style={styles.modalWarning}>
                  Antes de bloquear a un empleado, revisa sus pendientes operativos. El bloqueo corta el acceso, pero conserva el historial.
                </Text>

                {pendingSummary ? (
                  <View style={styles.pendingBox}>
                    <Text style={styles.pendingTitle}>Validación previa al bloqueo</Text>

                    {pendingSummary.error ? (
                      <Text style={styles.pendingWarningText}>
                        No se pudieron consultar pendientes: {pendingSummary.error}
                      </Text>
                    ) : null}

                    <Text style={styles.pendingLine}>
                      Carritos activos preparados por el usuario: {pendingSummary.carritosActivosCount}
                    </Text>
                    <Text style={styles.pendingLine}>
                      Cajas abiertas asociadas al usuario: {pendingSummary.cajasAbiertasCount}
                    </Text>
                    <Text style={styles.pendingLine}>
                      Ventas recientes asociadas al usuario: {pendingSummary.ventasRecientesCount}
                    </Text>

                    {pendingSummary.carritosActivos.slice(0, 3).map((carrito) => (
                      <Text key={getReferenceId(carrito) || carrito._id} style={styles.pendingDetailLine}>
                        Carrito #{getShortId(carrito)} · estado {carrito.estado || 'sin estado'} · total {carrito.total || 0}
                      </Text>
                    ))}

                    {pendingSummary.cajasAbiertas.slice(0, 3).map((caja) => (
                      <Text key={getReferenceId(caja) || caja._id} style={styles.pendingDetailLine}>
                        Caja {caja.codigo || caja.nombre || getShortId(caja)} · estado {caja.estado || 'sin estado'}
                      </Text>
                    ))}

                    {pendingSummary.hasBlockingWarnings ? (
                      <Text style={styles.pendingWarningText}>
                        Hay pendientes que conviene revisar antes de confirmar el bloqueo.
                      </Text>
                    ) : (
                      <Text style={styles.pendingOkText}>
                        No se detectaron carritos activos ni cajas abiertas asociadas.
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.modalWarning}>
                El usuario volverá a poder iniciar sesión con su contraseña actual.
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeActionModal}
                disabled={actionLoading || pendingCheckLoading}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmAction}
                disabled={actionLoading || pendingCheckLoading}
              >
                <Text style={styles.modalConfirmText}>
                  {actionLoading ? 'Procesando...' : 'Confirmar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  reloadButton: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
    fontWeight: '800',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 21,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
  },
  loader: {
    marginVertical: 12,
  },
  resultText: {
    width: '100%',
    fontSize: 13,
    lineHeight: 20,
    color: '#111827',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userHeaderMain: {
    flex: 1,
    paddingRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activePill: {
    backgroundColor: '#dcfce7',
  },
  blockedPill: {
    backgroundColor: '#fee2e2',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  activePillText: {
    color: '#166534',
  },
  blockedPillText: {
    color: '#991b1b',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  selfText: {
    fontSize: 13,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  actionRow: {
    marginTop: 10,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  blockButton: {
    backgroundColor: '#fee2e2',
  },
  blockButtonText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '800',
  },
  unblockButton: {
    backgroundColor: '#dcfce7',
  },
  unblockButtonText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 10,
  },
  modalWarning: {
    fontSize: 14,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    lineHeight: 20,
    marginBottom: 14,
  },
  pendingBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  pendingLine: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 20,
  },
  pendingDetailLine: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
    marginTop: 4,
  },
  pendingWarningText: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 19,
    marginTop: 8,
    fontWeight: '700',
  },
  pendingOkText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 19,
    marginTop: 8,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButton: {
    backgroundColor: '#e5e7eb',
  },
  modalConfirmButton: {
    backgroundColor: '#111827',
  },
  modalCancelText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
