import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function HealthStatusCard({ status, loading, resultText }) {
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.statusBadge,
          status === 'success' && styles.statusSuccess,
          status === 'error' && styles.statusError,
          status === 'loading' && styles.statusLoading,
        ]}
      >
        <Text style={styles.statusBadgeText}>
          {status === 'success' && 'Backend conectado'}
          {status === 'error' && 'Error de conexion'}
          {status === 'loading' && 'Verificando...'}
          {status === 'idle' && 'Sin iniciar'}
        </Text>
      </View>

      {loading ? <ActivityIndicator size="large" /> : null}

      <View style={styles.resultBox}>
        <Text style={styles.resultText}>{resultText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 16,
    backgroundColor: '#dfe6ee',
  },
  statusSuccess: {
    backgroundColor: '#d1fadf',
  },
  statusError: {
    backgroundColor: '#ffe2e2',
  },
  statusLoading: {
    backgroundColor: '#fff1cc',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultBox: {
    width: '100%',
    minHeight: 140,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
