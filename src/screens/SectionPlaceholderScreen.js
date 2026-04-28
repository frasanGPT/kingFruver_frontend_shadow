import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppShell from '../components/AppShell';

export default function SectionPlaceholderScreen({ sectionName, onBack }) {
  return (
    <AppShell
      title={sectionName}
      subtitle="Modulo en construccion"
      description="Esta pantalla es un placeholder temporal mientras conectamos el flujo real."
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Proximo objetivo</Text>
        <Text style={styles.cardText}>
          Aqui conectaremos primero la estructura visual y luego las llamadas reales al backend congelado.
        </Text>
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
    marginBottom: 20,
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
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
