import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import {
  activateCaja,
  closeCajaWithArqueo,
  createCaja,
  deactivateCaja,
  getCajas,
  openCaja,
  updateCaja,
} from '../services/cajaService';
import { loadSession, saveSession } from '../services/sessionService';
import { getRoleCode, hasPermission } from '../utils/accessControl';
import { getActiveEnvironment } from '../config/environments';

function getCajasEnvironment() {
  return getActiveEnvironment();
}

function getCajasEnvironmentLabelLower() {
  return getCajasEnvironment().label.toLowerCase();
}

function getCajasBackendLabel() {
  return getCajasEnvironment().copy.backendLabel;
}

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

function getUserDisplayName(user) {
  return user?.email || user?.nombre || 'sin responsable';
}

function buildOpenActionText(caja, notasAccion) {
  return [
    'Caja abierta con exito',
    `Nombre: ${caja?.nombre || 'sin valor'}`,
    `Código: ${caja?.codigo || 'sin valor'}`,
    `Estado final: ${caja?.estado || 'sin valor'}`,
    `Saldo apertura: ${formatCurrency(caja?.saldoApertura || 0)}`,
    `Fecha apertura: ${formatDateTime(caja?.fechaApertura)}`,
    `Abierta por: ${getUserDisplayName(caja?.openedByUsuarioId)}`,
    `Efectivo operativo: ${formatCurrency(caja?.totalEfectivo || 0)}`,
    `Transferencia: ${formatCurrency(caja?.totalTransferencia || 0)}`,
    `Mixto: ${formatCurrency(caja?.totalMixto || 0)}`,
    `Otro: ${formatCurrency(caja?.totalOtro || 0)}`,
    `Notas enviadas: ${notasAccion || 'sin notas'}`,
  ].join('\n');
}

function buildCloseActionText(caja, arqueo, notasAccion) {
  return [
    'Caja cerrada con arqueo',
    `Nombre: ${caja?.nombre || 'sin valor'}`,
    `Código: ${caja?.codigo || 'sin valor'}`,
    `Estado final: ${caja?.estado || 'sin valor'}`,
    `Fecha cierre: ${formatDateTime(caja?.fechaCierre)}`,
    `Cerrada por: ${getUserDisplayName(caja?.closedByUsuarioId)}`,
    `Responsable del arqueo: ${getUserDisplayName(arqueo?.usuarioId)}`,
    `Saldo apertura: ${formatCurrency(arqueo?.saldoApertura || 0)}`,
    `Esperado efectivo: ${formatCurrency(arqueo?.esperadoEfectivo || 0)}`,
    `Contado efectivo: ${formatCurrency(arqueo?.contadoEfectivo || 0)}`,
    `Diferencia efectivo: ${formatCurrency(arqueo?.diferenciaEfectivo || 0)}`,
    `Transferencia: ${formatCurrency(arqueo?.totalTransferencia || 0)}`,
    `Mixto: ${formatCurrency(arqueo?.totalMixto || 0)}`,
    `Otro: ${formatCurrency(arqueo?.totalOtro || 0)}`,
    `Notas enviadas: ${notasAccion || 'sin notas'}`,
  ].join('\n');
}

function parseMoneyInput(value) {
  if (typeof value !== 'string') {
    return NaN;
  }

  const normalized = value.trim().replace(/\./g, '').replace(',', '.');

  if (!normalized) {
    return 0;
  }

  return Number(normalized);
}

function getCajaStatusVariant(estado) {
  if (estado === 'abierta') {
    return 'success';
  }

  if (estado === 'cerrada') {
    return 'neutral';
  }

  return 'info';
}

export default function CajasScreen({ onBack }) {
  const [token, setToken] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [selectedCajaId, setSelectedCajaId] = useState('');
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [screenResult, setScreenResult] = useState('Cargando cajas...');
  const [actionResult, setActionResult] = useState('Todavía no has ejecutado una acción real de caja.');
  const [efectivo, setEfectivo] = useState('0');
  const [notasAccion, setNotasAccion] = useState('');
  const [localResult, setLocalResult] = useState(
    'Todavía no has simulado una actualizacion local de caja.'
  );
  const [adminNombre, setAdminNombre] = useState('');
  const [adminCodigo, setAdminCodigo] = useState('');
  const [adminNotas, setAdminNotas] = useState('');
  const [adminResult, setAdminResult] = useState(
    'Admin: todavía no has ejecutado una acción administrativa de caja.'
  );
  const [adminShowInactive, setAdminShowInactive] = useState(false);


  const selectedCaja = useMemo(() => {
    return cajas.find((caja) => caja._id === selectedCajaId) || null;
  }, [cajas, selectedCajaId]);

  const esperadoEfectivoActual = useMemo(() => {
    if (!selectedCaja) {
      return 0;
    }

    return Number(selectedCaja.saldoApertura || 0) + Number(selectedCaja.totalEfectivo || 0);
  }, [selectedCaja]);

  const contadoEfectivoActual = useMemo(() => {
    return Number(parseMoneyInput(efectivo) || 0);
  }, [efectivo]);

  const diferenciaArqueoEstimada = useMemo(() => {
    return contadoEfectivoActual - esperadoEfectivoActual;
  }, [contadoEfectivoActual, esperadoEfectivoActual]);

  const arqueoSemanticText = useMemo(() => {
    if (diferenciaArqueoEstimada > 0) {
      return `Sobrante estimado: ${formatCurrency(diferenciaArqueoEstimada)}`;
    }

    if (diferenciaArqueoEstimada < 0) {
      return `Faltante estimado: ${formatCurrency(Math.abs(diferenciaArqueoEstimada))}`;
    }

    return 'Cuadre perfecto: $0';
  }, [diferenciaArqueoEstimada]);
  const roleCode = getRoleCode(authUser);
  const activeEnvironment = getCajasEnvironment();
  const authEmail = String(authUser?.email || '').trim().toLowerCase();
  const isAdmin =
    roleCode === 'admin' ||
    hasPermission(authUser, 'cajas:write') ||
    authEmail === String(activeEnvironment.adminEmail || '').trim().toLowerCase();
  const isCajero = roleCode === 'cajero';

  function canManageCajasAsAdmin(session) {
    const sessionUser = session?.usuario || null;
    const sessionRoleCode = getRoleCode(sessionUser);
    const sessionEmail = String(sessionUser?.email || '').trim().toLowerCase();
    const adminEmail = String(activeEnvironment.adminEmail || '').trim().toLowerCase();

    return (
      isAdmin ||
      roleCode === 'admin' ||
      sessionRoleCode === 'admin' ||
      hasPermission(sessionUser, 'cajas:write') ||
      authEmail === adminEmail ||
      sessionEmail === adminEmail
    );
  }

  async function loadCajasRealtime(session, preferredCajaId = '', adminShowInactiveOverride = null) {
    const canUseAdminFilter = canManageCajasAsAdmin(session);
    const adminInactiveMode =
      adminShowInactiveOverride === null ? adminShowInactive : adminShowInactiveOverride;
    const activoFilter = canUseAdminFilter ? (adminInactiveMode ? false : true) : true;

    const response = await getCajas({
      token: session.token,
      sedeId: session.sedeId || '',
      activo: activoFilter,
    });

    const rows = response?.data || [];
    setCajas(rows);

    const cajaIdToRestore = preferredCajaId || session.cajaId || '';

    const restoredCaja = rows.find((caja) => caja._id === cajaIdToRestore) || null;

    if (restoredCaja) {
      setSelectedCajaId(restoredCaja._id);

      if (canUseAdminFilter) {
        setAdminNombre(restoredCaja.nombre || '');
        setAdminCodigo(restoredCaja.codigo || '');
        setAdminNotas(restoredCaja.notas || '');
      }

      setScreenResult(`Cajas cargadas: ${rows.length}. Caja guardada restaurada.`);
    } else {
      setSelectedCajaId('');
      setScreenResult(`Cajas cargadas: ${rows.length}. Selecciona una caja para continuar.`);
    }
  }

  useEffect(() => {
    async function restoreAndLoad() {
      try {
        const session = await loadSession();

        if (!session?.token) {
          setScreenResult('No hay sesión guardada. Entra a Home, valida acceso y vuelve.');
          setLoading(false);
          return;
        }

        setToken(session.token || '');
        setSedeId(session.sedeId || '');
        setAuthUser(session.usuario || null);

        await loadCajasRealtime(session, session.cajaId || '');
      } catch (error) {
        setScreenResult(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    restoreAndLoad();
  }, []);

  async function handleSelectCaja(cajaId) {
    setSelectedCajaId(cajaId);

    const caja = cajas.find((item) => item._id === cajaId);

    if (isAdmin && caja) {
      setAdminNombre(caja.nombre || '');
      setAdminCodigo(caja.codigo || '');
      setAdminNotas(caja.notas || '');
    }

    try {
      const session = await loadSession();

      if (session?.token) {
        await saveSession({
          ...session,
          cajaId,
        });
      }
    } catch (error) {
    }
  }

  async function handleAdminCajaActivoFilter(nextShowInactive) {
    if (adminShowInactive === nextShowInactive) {
      return;
    }

    setAdminShowInactive(nextShowInactive);

    try {
      setActionLoading(true);
      setScreenResult(nextShowInactive ? 'Cargando cajas inactivas...' : 'Cargando cajas activas...');

      const session = await loadSession();

      if (session?.token) {
        setToken(session.token || '');
        setSedeId(session.sedeId || '');
        setAuthUser(session.usuario || null);

        await loadCajasRealtime(session, selectedCajaId || session.cajaId || '', nextShowInactive);
      } else {
        setScreenResult('No hay sesión guardada. Entra a Home, valida acceso y vuelve.');
      }
    } catch (error) {
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecargarCajas() {
    try {
      setActionLoading(true);
      setScreenResult('Recargando cajas...');

      const session = await loadSession();

      if (!session?.token) {
        setScreenResult('No hay sesión guardada. Entra a Home, valida acceso y vuelve.');
        return;
      }

      setToken(session.token || '');
      setSedeId(session.sedeId || '');
      setAuthUser(session.usuario || null);

      await loadCajasRealtime(session, selectedCajaId || session.cajaId || '');
    } catch (error) {
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAbrirCajaReal() {
    if (!selectedCaja) {
      setScreenResult('Debes seleccionar una caja.');
      return;
    }

    const saldoApertura = parseMoneyInput(efectivo);

    if (Number.isNaN(saldoApertura) || saldoApertura < 0) {
      setScreenResult('El saldo de apertura debe ser un numero mayor o igual a 0.');
      return;
    }

    try {
      setActionLoading(true);
      setScreenResult(`Abriendo caja real en ${getCajasEnvironmentLabelLower()}...`);

      const response = await openCaja({
        id: selectedCaja._id,
        saldoApertura,
        token,
      });

      const cajaAbierta = response?.data || null;

      setActionResult(buildOpenActionText(cajaAbierta, notasAccion.trim()));
      setEfectivo('0');
      setNotasAccion('');

      const session = await loadSession();

      if (session?.token) {
        await loadCajasRealtime(session, selectedCaja._id);
      }
    } catch (error) {
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCerrarCajaConArqueoReal() {
    if (!selectedCaja) {
      setScreenResult('Debes seleccionar una caja.');
      return;
    }

    const contadoEfectivo = parseMoneyInput(efectivo);

    if (Number.isNaN(contadoEfectivo) || contadoEfectivo < 0) {
      setScreenResult('El contado de efectivo debe ser un numero mayor o igual a 0.');
      return;
    }

    try {
      setActionLoading(true);
      setScreenResult(`Cerrando caja real con arqueo en ${getCajasEnvironmentLabelLower()}...`);

      const response = await closeCajaWithArqueo({
        id: selectedCaja._id,
        contadoEfectivo,
        notas: notasAccion.trim(),
        token,
      });

      const cajaCerrada = response?.data?.caja || null;
      const arqueo = response?.data?.arqueo || null;

      setActionResult(buildCloseActionText(cajaCerrada, arqueo, notasAccion.trim()));
      setEfectivo('0');
      setNotasAccion('');

      const session = await loadSession();

      if (session?.token) {
        await loadCajasRealtime(session, selectedCaja._id);
      }
    } catch (error) {
      setScreenResult(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  function handleSimularActualizacion() {
    if (!selectedCaja) {
      setLocalResult('Debes seleccionar una caja.');
      return;
    }

    setLocalResult(
      [
        `Caja seleccionada: ${selectedCaja.nombre}`,
        `Código: ${selectedCaja.codigo}`,
        `Estado: ${selectedCaja.estado}`,
        `Apertura base: ${formatCurrency(selectedCaja.saldoApertura || 0)}`,
        `Efectivo operativo actual: ${formatCurrency(selectedCaja.totalEfectivo || 0)}`,
        `Total transferencia actual: ${formatCurrency(selectedCaja.totalTransferencia || 0)}`,
        `Total mixto actual: ${formatCurrency(selectedCaja.totalMixto || 0)}`,
        `Total otro actual: ${formatCurrency(selectedCaja.totalOtro || 0)}`,
      ].join('\n')
    );
  }

  function setAdminFeedback(message) {
    setAdminResult(message);
    setActionResult(message);
  }

  async function handleAdminCreateCaja() {
    if (!isAdmin) {
      setAdminFeedback('Solo admin puede crear cajas.');
      return;
    }

    const nombre = adminNombre.trim();
    const codigo = adminCodigo.trim();
    const notas = adminNotas.trim();
    const effectiveSedeId = sedeId || selectedCaja?.sedeId?._id || selectedCaja?.sedeId || '';

    if (!effectiveSedeId) {
      setAdminFeedback('No hay sedeId disponible para crear la caja.');
      return;
    }

    if (!nombre) {
      setAdminFeedback('El nombre de la caja es obligatorio.');
      return;
    }

    if (!codigo) {
      setAdminFeedback('El código de la caja es obligatorio.');
      return;
    }

    try {
      setActionLoading(true);
      setAdminFeedback('Admin: creando caja...');

      const response = await createCaja({
        sedeId: effectiveSedeId,
        nombre,
        codigo,
        notas,
        token,
      });

      const cajaCreada = response?.data || null;

      setAdminFeedback(
        [
          'Admin: caja creada correctamente.',
          `Nombre: ${cajaCreada?.nombre || nombre}`,
          `Código: ${cajaCreada?.codigo || codigo}`,
          `Estado: ${cajaCreada?.estado || 'cerrada'}`,
          `Activa: ${cajaCreada?.activo === false ? 'No' : 'Sí'}`,
        ].join('\n')
      );

      const session = await loadSession();

      if (session?.token) {
        await loadCajasRealtime(session, cajaCreada?._id || selectedCajaId);
      }
    } catch (error) {
      setAdminFeedback(`Admin error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdminUpdateCaja() {
    if (!isAdmin) {
      setAdminFeedback('Solo admin puede editar cajas.');
      return;
    }

    if (!selectedCaja) {
      setAdminFeedback('Selecciona una caja para editar.');
      return;
    }

    const nombre = adminNombre.trim();
    const codigo = adminCodigo.trim();
    const notas = adminNotas.trim();

    if (!nombre) {
      setAdminFeedback('El nombre de la caja es obligatorio.');
      return;
    }

    if (!codigo) {
      setAdminFeedback('El código de la caja es obligatorio.');
      return;
    }

    try {
      setActionLoading(true);
      setAdminFeedback('Admin: actualizando caja...');

      const response = await updateCaja({
        id: selectedCaja._id,
        nombre,
        codigo,
        notas,
        token,
      });

      const cajaEditada = response?.data || null;

      setAdminFeedback(
        [
          'Admin: caja actualizada correctamente.',
          `Nombre: ${cajaEditada?.nombre || nombre}`,
          `Código: ${cajaEditada?.codigo || codigo}`,
          `Estado: ${cajaEditada?.estado || selectedCaja.estado}`,
          `Activa: ${cajaEditada?.activo === false ? 'No' : 'Sí'}`,
        ].join('\n')
      );

      const session = await loadSession();

      if (session?.token) {
        await loadCajasRealtime(session, selectedCaja._id);
      }
    } catch (error) {
      setAdminFeedback(`Admin error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdminActivateCaja() {
    if (!isAdmin) {
      setAdminFeedback('Solo admin puede activar cajas.');
      return;
    }

    if (!selectedCaja) {
      setAdminFeedback('Selecciona una caja para activar.');
      return;
    }

    try {
      setActionLoading(true);
      setAdminFeedback('Admin: activando caja...');

      const response = await activateCaja({
        id: selectedCaja._id,
        token,
      });

      const cajaActivada = response?.data || null;

      setAdminFeedback(
        [
          'Admin: caja activada correctamente.',
          `Nombre: ${cajaActivada?.nombre || selectedCaja.nombre}`,
          `Código: ${cajaActivada?.codigo || selectedCaja.codigo}`,
          `Estado: ${cajaActivada?.estado || selectedCaja.estado}`,
          `Activa: ${cajaActivada?.activo === false ? 'No' : 'Sí'}`,
        ].join('\n')
      );

      const session = await loadSession();

      if (session?.token) {
        await loadCajasRealtime(session, selectedCaja._id);
      }
    } catch (error) {
      setAdminFeedback(`Admin error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdminDeactivateCaja() {
    if (!isAdmin) {
      setAdminFeedback('Solo admin puede desactivar cajas.');
      return;
    }

    if (!selectedCaja) {
      setAdminFeedback('Selecciona una caja para desactivar.');
      return;
    }

    try {
      setActionLoading(true);
      setAdminFeedback('Admin: desactivando caja...');

      const response = await deactivateCaja({
        id: selectedCaja._id,
        token,
      });

      const cajaDesactivada = response?.data || null;

      setAdminFeedback(
        [
          'Admin: caja desactivada correctamente.',
          `Nombre: ${cajaDesactivada?.nombre || selectedCaja.nombre}`,
          `Código: ${cajaDesactivada?.codigo || selectedCaja.codigo}`,
          `Estado: ${cajaDesactivada?.estado || selectedCaja.estado}`,
          `Activa: ${cajaDesactivada?.activo === false ? 'No' : 'Sí'}`,
        ].join('\n')
      );

      const session = await loadSession();

      if (session?.token) {
        await loadCajasRealtime(session, selectedCaja._id);
      }
    } catch (error) {
      setAdminFeedback(`Admin error: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AppShell
      title="Cajas"
      subtitle={isCajero ? 'Operación de mi caja de turno' : 'Base operativa'}
      description={
        isCajero
          ? `Usa esta pantalla para operar tu caja asignada de turno en ${getCajasBackendLabel()}.`
          : `Lectura y acciones reales de cajas desde ${getCajasBackendLabel()}.`
      }
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de carga</Text>
        <Text style={styles.resultText}>{screenResult}</Text>
        {loading ? <ActivityIndicator size="large" style={styles.loader} /> : null}
        {actionLoading ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        <Pressable
          style={[styles.reloadButton, actionLoading ? styles.disabledButton : null]}
          onPress={handleRecargarCajas}
          disabled={actionLoading}
        >
          <Text style={styles.reloadButtonText}>Recargar cajas</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isCajero ? 'Seleccionar mi caja operativa' : 'Seleccionar caja'}
        </Text>
        {isCajero ? (
          <Text style={styles.helperText}>
            Usa únicamente la caja asignada a tu turno. Las diferencias serán revisadas por supervisor.
          </Text>
        ) : null}

        {cajas.length === 0 ? (
          <Text style={styles.cardText}>No hay cajas disponibles para esta sede.</Text>
        ) : (
          cajas.map((caja) => {
            const isSelected = caja._id === selectedCajaId;

            return (
              <Pressable
                key={caja._id}
                style={[styles.selectorCard, isSelected && styles.selectorCardActive]}
                onPress={() => handleSelectCaja(caja._id)}
              >
                <Text style={[styles.selectorTitle, isSelected && styles.selectorTitleActive]}>
                  {caja.nombre}
                </Text>
                <Text style={[styles.selectorText, isSelected && styles.selectorTextActive]}>
                  Código: {caja.codigo}
                </Text>
                <View style={styles.inlineBadgeRow}>
                  <Text style={[styles.selectorText, isSelected && styles.selectorTextActive]}>
                    Estado:
                  </Text>
                  <StatusBadge
                    label={caja.estado}
                    variant={getCajaStatusVariant(caja.estado)}
                  />
                </View>
                <Text style={[styles.selectorText, isSelected && styles.selectorTextActive]}>
                  Apertura: {formatCurrency(caja.saldoApertura || 0)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isCajero ? 'Mi caja operativa seleccionada' : 'Caja seleccionada actual'}
        </Text>

        {selectedCaja ? (
          <>
            <Text style={styles.cardText}>Nombre: {selectedCaja.nombre}</Text>
            <Text style={styles.cardText}>Código: {selectedCaja.codigo}</Text>
            <View style={styles.inlineBadgeRow}>
              <Text style={styles.cardText}>Estado:</Text>
              <StatusBadge
                label={selectedCaja.estado}
                variant={getCajaStatusVariant(selectedCaja.estado)}
              />
            </View>
            <Text style={styles.cardText}>
              Apertura base: {formatCurrency(selectedCaja.saldoApertura || 0)}
            </Text>
            <Text style={styles.cardText}>
              Efectivo operativo: {formatCurrency(selectedCaja.totalEfectivo || 0)}
            </Text>
            <Text style={styles.cardText}>
              Efectivo esperado con apertura:{' '}
              {formatCurrency(
                Number(selectedCaja.saldoApertura || 0) + Number(selectedCaja.totalEfectivo || 0)
              )}
            </Text>
            <Text style={styles.helperText}>
              Nota: las devoluciones de ventas ya descuentan el método de pago correspondiente de la caja.
              Si hubo reversos, estos totales muestran el saldo operativo neto.
            </Text>
            <Text style={styles.cardText}>
              Abierta por: {getUserDisplayName(selectedCaja.openedByUsuarioId)}
            </Text>
            <Text style={styles.cardText}>
              Cerrada por: {getUserDisplayName(selectedCaja.closedByUsuarioId)}
            </Text>
            <Text style={styles.cardText}>
              Transferencia: {formatCurrency(selectedCaja.totalTransferencia || 0)}
            </Text>
            <Text style={styles.cardText}>
              Mixto: {formatCurrency(selectedCaja.totalMixto || 0)}
            </Text>
            <Text style={styles.cardText}>
              Otro: {formatCurrency(selectedCaja.totalOtro || 0)}
            </Text>
          </>
        ) : (
          <Text style={styles.cardText}>Selecciona una caja para ver su estado actual.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isCajero ? 'Operación de mi caja' : 'Acción operativa actual'}
        </Text>

        {!selectedCaja ? (
          <Text style={styles.cardText}>
            Selecciona una caja para ver la acción disponible.
          </Text>
        ) : null}

        {selectedCaja?.estado === 'cerrada' ? (
          <>
            <Text style={styles.helperText}>
              {isCajero
                ? 'Esta caja está cerrada. Ábrela solo si corresponde a tu turno.'
                : 'Esta caja esta cerrada. Aqui solo mostramos el flujo real de apertura.'}
            </Text>

            <Text style={styles.label}>Saldo de apertura</Text>
            <TextInput
              value={efectivo}
              onChangeText={setEfectivo}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.label}>Notas de apertura</Text>
            <TextInput
              value={notasAccion}
              onChangeText={setNotasAccion}
              placeholder="Opcional"
              style={styles.input}
            />

            <Pressable
              style={[styles.openButton, actionLoading ? styles.disabledButton : null]}
              onPress={handleAbrirCajaReal}
              disabled={actionLoading}
            >
              <Text style={styles.openButtonText}>Abrir caja real</Text>
            </Pressable>
          </>
        ) : null}

        {selectedCaja?.estado === 'abierta' ? (
          <>
            <Text style={styles.helperText}>
              {isCajero
                ? 'Esta caja está abierta. Declara el efectivo contado para cerrar tu turno con arqueo.'
                : 'Esta caja esta abierta. Aqui solo mostramos el flujo real de cierre con arqueo.'}
            </Text>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLine}>
                Esperado efectivo: {formatCurrency(esperadoEfectivoActual)}
              </Text>
              <Text style={styles.summaryLine}>
                Transferencia actual: {formatCurrency(selectedCaja?.totalTransferencia || 0)}
              </Text>
              <Text style={styles.summaryLine}>
                Mixto actual: {formatCurrency(selectedCaja?.totalMixto || 0)}
              </Text>
              <Text style={styles.summaryLine}>
                Otro actual: {formatCurrency(selectedCaja?.totalOtro || 0)}
              </Text>
              <Text style={styles.summaryHelperLine}>
                Estos valores ya reflejan ventas menos devoluciones aplicadas por método de pago.
              </Text>
            </View>

            <Text style={styles.label}>Contado efectivo</Text>
            <TextInput
              value={efectivo}
              onChangeText={setEfectivo}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.arqueoPreviewBox}>
              <Text style={styles.arqueoPreviewTitle}>Vista previa del arqueo</Text>
              <Text style={styles.summaryLine}>
                Esperado efectivo: {formatCurrency(esperadoEfectivoActual)}
              </Text>
              <Text style={styles.summaryLine}>
                Contado efectivo: {formatCurrency(contadoEfectivoActual)}
              </Text>
              <Text
                style={[
                  styles.arqueoDifferenceText,
                  diferenciaArqueoEstimada > 0 && styles.arqueoDifferencePositive,
                  diferenciaArqueoEstimada < 0 && styles.arqueoDifferenceNegative,
                  diferenciaArqueoEstimada === 0 && styles.arqueoDifferenceNeutral,
                ]}
              >
                Diferencia estimada: {formatCurrency(diferenciaArqueoEstimada)}
              </Text>

              <Text
                style={[
                  styles.arqueoSemanticText,
                  diferenciaArqueoEstimada > 0 && styles.arqueoDifferencePositive,
                  diferenciaArqueoEstimada < 0 && styles.arqueoDifferenceNegative,
                  diferenciaArqueoEstimada === 0 && styles.arqueoDifferenceNeutral,
                ]}
              >
                {arqueoSemanticText}
              </Text>
            </View>

            <Text style={styles.label}>Notas de cierre</Text>
            <TextInput
              value={notasAccion}
              onChangeText={setNotasAccion}
              placeholder="Opcional"
              style={styles.input}
            />

            <Pressable
              style={[styles.closeButton, actionLoading ? styles.disabledButton : null]}
              onPress={handleCerrarCajaConArqueoReal}
              disabled={actionLoading}
            >
              <Text style={styles.closeButtonText}>Cerrar con arqueo real</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {isAdmin ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Administración de cajas</Text>
          <Text style={styles.helperText}>
            Crea, edita, activa o desactiva cajas. No abre ni cierra turnos operativos.
          </Text>

          <Text style={styles.label}>Filtro CRUD admin</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[
                styles.toggleButton,
                adminShowInactive === false ? styles.toggleButtonActive : null,
                actionLoading ? styles.disabledButton : null,
              ]}
              onPress={() => handleAdminCajaActivoFilter(false)}
              disabled={actionLoading}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  adminShowInactive === false ? styles.toggleButtonTextActive : null,
                ]}
              >
                Cajas activas
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.toggleButton,
                adminShowInactive === true ? styles.toggleButtonActive : null,
                actionLoading ? styles.disabledButton : null,
              ]}
              onPress={() => handleAdminCajaActivoFilter(true)}
              disabled={actionLoading}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  adminShowInactive === true ? styles.toggleButtonTextActive : null,
                ]}
              >
                Cajas inactivas
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>
            Supervisor y cajero solo ven cajas activas, abiertas o cerradas.
          </Text>

          <Text style={styles.label}>Resultado administrativo</Text>
          <Text style={styles.resultText}>{adminResult}</Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLine}>Caja seleccionada para administrar:</Text>
            {selectedCaja ? (
              <>
                <Text style={styles.summaryLine}>Nombre: {selectedCaja.nombre}</Text>
                <Text style={styles.summaryLine}>Código: {selectedCaja.codigo}</Text>
                <Text style={styles.summaryLine}>Estado: {selectedCaja.estado}</Text>
                <Text style={styles.summaryLine}>
                  Activa: {selectedCaja.activo === false ? 'No' : 'Sí'}
                </Text>
                <Text style={styles.summaryLine}>
                  ID: {String(selectedCaja._id || '').slice(-6)}
                </Text>
              </>
            ) : (
              <Text style={styles.summaryLine}>
                Ninguna. Selecciona una caja del listado antes de guardar, activar o desactivar.
              </Text>
            )}
          </View>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={adminNombre}
            onChangeText={setAdminNombre}
            placeholder="Nombre de la caja"
            style={styles.input}
          />

          <Text style={styles.label}>Código</Text>
          <TextInput
            value={adminCodigo}
            onChangeText={setAdminCodigo}
            placeholder="Código único en la sede"
            autoCapitalize="characters"
            style={styles.input}
          />

          <Text style={styles.label}>Notas administrativas</Text>
          <TextInput
            value={adminNotas}
            onChangeText={setAdminNotas}
            placeholder="Opcional"
            style={styles.input}
          />

          <Pressable
            style={[styles.primaryButton, actionLoading ? styles.disabledButton : null]}
            onPress={handleAdminCreateCaja}
            disabled={actionLoading}
          >
            <Text style={styles.primaryButtonText}>Crear caja</Text>
          </Pressable>

          <Pressable
            style={[styles.openButton, actionLoading || !selectedCaja ? styles.disabledButton : null]}
            onPress={handleAdminUpdateCaja}
            disabled={actionLoading || !selectedCaja}
          >
            <Text style={styles.openButtonText}>Guardar cambios de caja seleccionada</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, actionLoading || !selectedCaja ? styles.disabledButton : null]}
            onPress={handleAdminActivateCaja}
            disabled={actionLoading || !selectedCaja}
          >
            <Text style={styles.primaryButtonText}>Activar caja seleccionada</Text>
          </Pressable>

          <Pressable
            style={[styles.closeButton, actionLoading || !selectedCaja ? styles.disabledButton : null]}
            onPress={handleAdminDeactivateCaja}
            disabled={actionLoading || !selectedCaja}
          >
            <Text style={styles.closeButtonText}>Desactivar caja seleccionada</Text>
          </Pressable>

        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resultado de acción real</Text>
        <Text style={styles.resultText}>{actionResult}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resultado local</Text>
        <Text style={styles.resultText}>{localResult}</Text>

        <Pressable
          style={[styles.primaryButton, actionLoading ? styles.disabledButton : null]}
          onPress={handleSimularActualizacion}
          disabled={actionLoading}
        >
          <Text style={styles.primaryButtonText}>Simular actualizacion local</Text>
        </Pressable>
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
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6b7280',
    marginBottom: 12,
  },
  inlineBadgeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  summaryLine: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111827',
    marginBottom: 4,
  },
  summaryHelperLine: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7280',
    marginTop: 6,
  },
  arqueoPreviewBox: {
    width: '100%',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  arqueoPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 8,
  },
  arqueoDifferenceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9a3412',
    marginTop: 4,
  },
  arqueoDifferencePositive: {
    color: '#166534',
  },
  arqueoDifferenceNegative: {
    color: '#b91c1c',
  },
  arqueoDifferenceNeutral: {
    color: '#1d4ed8',
  },
  arqueoSemanticText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  selectorCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  selectorCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#60a5fa',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  selectorTitleActive: {
    color: '#1d4ed8',
  },
  selectorText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  selectorTextActive: {
    color: '#1e40af',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    fontSize: 16,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  toggleRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  openButton: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    width: '100%',
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#111827',
  },
  loader: {
    marginTop: 12,
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
