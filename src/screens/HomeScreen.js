import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppShell from '../components/AppShell';
import HealthStatusCard from '../components/HealthStatusCard';
import LoginAccessCard from '../components/LoginAccessCard';
import QuickActionCard from '../components/QuickActionCard';
import { getHealth } from '../services/healthService';
import { loadSession } from '../services/sessionService';
import { buildModuleAccess } from '../utils/accessControl';

function buildHealthText(data) {
  return [
    `ok: ${String(data.ok)}`,
    `service: ${data.service || 'sin valor'}`,
    `env: ${data.env || 'sin valor'}`,
    `db.connected: ${String(data.db?.connected)}`,
    `db.message: ${data.db?.message || 'sin valor'}`,
  ].join('\n');
}

export default function HomeScreen({ onOpenSection }) {
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [resultText, setResultText] = useState(
    'Listo para verificar conexion con el backend shadow.'
  );
  const [status, setStatus] = useState('idle');
  const [session, setSession] = useState(null);

  async function handleCheckHealth() {
    try {
      setLoading(true);
      setStatus('loading');
      setResultText(
        'Conectando con backend shadow...\nEsto puede tardar unos segundos si el servicio esta despertando.'
      );

      const data = await getHealth();

      setResultText(buildHealthText(data));
      setStatus('success');
    } catch (error) {
      setResultText(`Error: ${error.message}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  const moduleAccess = useMemo(() => {
    return buildModuleAccess(session ? session.usuario : null);
  }, [session]);

  function handleSessionChange(nextSession) {
    setSession(nextSession);
  }

  function getModuleBadge(sectionName) {
    const allowed = moduleAccess[sectionName];

    if (loadingSession) {
      return 'Cargando';
    }

    if (allowed) {
      return 'Disponible';
    }

    return 'Sin acceso';
  }

  function handleOpenProtectedSection(sectionName) {
    if (moduleAccess[sectionName]) {
      onOpenSection(sectionName);
    }
  }

  useEffect(() => {
    async function hydrateHomeSession() {
      try {
        const savedSession = await loadSession();
        setSession(savedSession);
      } finally {
        setLoadingSession(false);
      }
    }

    hydrateHomeSession();
    handleCheckHealth();
  }, []);

  return (
    <AppShell
      title="kingFruver"
      subtitle="Frontend Shadow"
      description="Inicio base del frontend conectado al backend shadow."
      layout="top"
    >
      <LoginAccessCard onSessionChange={handleSessionChange} />

      <View style={styles.grid}>
        <QuickActionCard
          title="Productos"
          description="Consulta real de inventario y catalogo visible."
          badge={getModuleBadge('Productos')}
          disabled={moduleAccess.Productos !== true}
          onPress={() => handleOpenProtectedSection('Productos')}
        />

        <QuickActionCard
          title="Ventas"
          description="Flujo de venta y operacion principal."
          badge={getModuleBadge('Ventas')}
          disabled={moduleAccess.Ventas !== true}
          onPress={() => handleOpenProtectedSection('Ventas')}
        />

        <QuickActionCard
          title="Cajas"
          description="Caja actual, apertura, cierre y arqueo."
          badge={getModuleBadge('Cajas')}
          disabled={moduleAccess.Cajas !== true}
          onPress={() => handleOpenProtectedSection('Cajas')}
        />

        <QuickActionCard
          title="Reportes"
          description="Resumen operativo filtrable y validaciones rapidas."
          badge={getModuleBadge('Reportes')}
          disabled={moduleAccess.Reportes !== true}
          onPress={() => handleOpenProtectedSection('Reportes')}
        />
      </View>

      <Pressable style={styles.button} onPress={handleCheckHealth}>
        <Text style={styles.buttonText}>Reintentar GET /health</Text>
      </Pressable>

      <HealthStatusCard
        status={status}
        loading={loading}
        resultText={resultText}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
