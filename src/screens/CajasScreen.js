import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AppShell from '../components/AppShell';
import StatusBadge from '../components/StatusBadge';
import { closeCajaWithArqueo, getCajas, openCaja } from '../services/cajaService';
import { loadSession, saveSession } from '../services/sessionService';

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

function buildOpenActionText(caja, notasAccion) {
  return [
    'Caja abierta con exito',
    `Nombre: ${caja?.nombre || 'sin valor'}`,
    `Codigo: ${caja?.codigo || 'sin valor'}`,
    `Estado final: ${caja?.estado || 'sin valor'}`,
    `Saldo apertura: ${formatCurrency(caja?.saldoApertura || 0)}`,
    `Fecha apertura: ${formatDateTime(caja?.fechaApertura)}`,
    `Efectivo: ${formatCurrency(caja?.totalEfectivo || 0)}`,
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
    `Codigo: ${caja?.codigo || 'sin valor'}`,
    `Estado final: ${caja?.estado || 'sin valor'}`,
    `Fecha cierre: ${formatDateTime(caja?.fechaCierre)}`,
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
  const [selectedCajaId, setSelectedCajaId] = useState('');
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [screenResult, setScreenResult] = useState('Cargando cajas...');
  const [actionResult, setActionResult] = useState('Todavia no has ejecutado una accion real de caja.');
  const [efectivo, setEfectivo] = useState('0');
  const [notasAccion, setNotasAccion] = useState('');
  const [localResult, setLocalResult] = useState(
    'Todavia no has simulado una actualizacion local de caja.'
  );

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

  async function loadCajasRealtime(session, preferredCajaId = '') {
    const response = await getCajas({
      token: session.token,
      sedeId: session.sedeId || '',
      activo: true,
    });

    const rows = response?.data || [];
    setCajas(rows);

    const cajaIdToRestore = preferredCajaId || session.cajaId || '';

    if (cajaIdToRestore && rows.some((caja) => caja._id === cajaIdToRestore)) {
      setSelectedCajaId(cajaIdToRestore);
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
          setScreenResult('No hay sesion guardada. Entra a Ventas, inicia sesion y vuelve.');
          setLoading(false);
          return;
        }

        setToken(session.token || '');
        setSedeId(session.sedeId || '');

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

  async function handleRecargarCajas() {
    try {
      setActionLoading(true);
      setScreenResult('Recargando cajas...');

      const session = await loadSession();

      if (!session?.token) {
        setScreenResult('No hay sesion guardada. Entra a Ventas, inicia sesion y vuelve.');
        return;
      }

      setToken(session.token || '');
      setSedeId(session.sedeId || '');

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
      setScreenResult('Abriendo caja real en shadow...');

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
      setScreenResult('Cerrando caja real con arqueo en shadow...');

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
        `Codigo: ${selectedCaja.codigo}`,
        `Estado: ${selectedCaja.estado}`,
        `Apertura base: ${formatCurrency(selectedCaja.saldoApertura || 0)}`,
        `Total efectivo actual: ${formatCurrency(selectedCaja.totalEfectivo || 0)}`,
        `Total transferencia actual: ${formatCurrency(selectedCaja.totalTransferencia || 0)}`,
        `Total mixto actual: ${formatCurrency(selectedCaja.totalMixto || 0)}`,
        `Total otro actual: ${formatCurrency(selectedCaja.totalOtro || 0)}`,
      ].join('\n')
    );
  }

  return (
    <AppShell
      title="Cajas"
      subtitle="Base operativa"
      description="Lectura y acciones reales de cajas desde backend shadow."
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Estado de carga</Text>
        <Text style={styles.resultText}>{screenResult}</Text>
        {loading ? <ActivityIndicator size="large" style={styles.loader} /> : null}
        {actionLoading ? <ActivityIndicator size="large" style={styles.loader} /> : null}

        <Pressable style={styles.reloadButton} onPress={handleRecargarCajas}>
          <Text style={styles.reloadButtonText}>Recargar cajas</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Seleccionar caja</Text>

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
                  Codigo: {caja.codigo}
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
        <Text style={styles.cardTitle}>Caja seleccionada actual</Text>

        {selectedCaja ? (
          <>
            <Text style={styles.cardText}>Nombre: {selectedCaja.nombre}</Text>
            <Text style={styles.cardText}>Codigo: {selectedCaja.codigo}</Text>
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
              Efectivo: {formatCurrency(selectedCaja.totalEfectivo || 0)}
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
        <Text style={styles.cardTitle}>Accion operativa actual</Text>

        {!selectedCaja ? (
          <Text style={styles.cardText}>
            Selecciona una caja para ver la accion disponible.
          </Text>
        ) : null}

        {selectedCaja?.estado === 'cerrada' ? (
          <>
            <Text style={styles.helperText}>
              Esta caja esta cerrada. Aqui solo mostramos el flujo real de apertura.
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

            <Pressable style={styles.openButton} onPress={handleAbrirCajaReal}>
              <Text style={styles.openButtonText}>Abrir caja real</Text>
            </Pressable>
          </>
        ) : null}

        {selectedCaja?.estado === 'abierta' ? (
          <>
            <Text style={styles.helperText}>
              Esta caja esta abierta. Aqui solo mostramos el flujo real de cierre con arqueo.
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

            <Pressable style={styles.closeButton} onPress={handleCerrarCajaConArqueoReal}>
              <Text style={styles.closeButtonText}>Cerrar con arqueo real</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resultado de accion real</Text>
        <Text style={styles.resultText}>{actionResult}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resultado local</Text>
        <Text style={styles.resultText}>{localResult}</Text>

        <Pressable style={styles.primaryButton} onPress={handleSimularActualizacion}>
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
