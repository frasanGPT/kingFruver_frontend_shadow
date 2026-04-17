import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppShell from '../components/AppShell';
import HealthStatusCard from '../components/HealthStatusCard';
import QuickActionCard from '../components/QuickActionCard';
import { getHealth } from '../services/healthService';

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
  const [resultText, setResultText] = useState(
    'Listo para verificar conexion con el backend shadow.'
  );
  const [status, setStatus] = useState('idle');

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

  useEffect(() => {
    handleCheckHealth();
  }, []);

  return (
    <AppShell
      title="kingFruver"
      subtitle="Frontend Shadow"
      description="Inicio base del frontend conectado al backend shadow."
      layout="top"
    >
      <View style={styles.grid}>
        <QuickActionCard
          title="Productos"
          description="Catalogo, precios y unidades."
          badge="Base"
          onPress={() => onOpenSection('Productos')}
        />

        <QuickActionCard
          title="Ventas"
          description="Flujo de venta y resumen de operacion."
          badge="Base"
          onPress={() => onOpenSection('Ventas')}
        />

        <QuickActionCard
          title="Cajas"
          description="Caja actual, apertura y cierre."
          badge="Base"
          onPress={() => onOpenSection('Cajas')}
        />

        <QuickActionCard
          title="Reportes"
          description="Vista rapida para validaciones iniciales."
          badge="Base"
          onPress={() => onOpenSection('Reportes')}
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
    backgroundColor: '#1f6feb',
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
