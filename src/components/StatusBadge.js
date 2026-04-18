import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function StatusBadge({ label, variant = 'neutral' }) {
  return (
    <View style={[styles.badge, styles[variant] || styles.neutral]}>
      <Text style={[styles.text, styles[`${variant}Text`] || styles.neutralText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  success: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  successText: {
    color: '#166534',
  },
  warning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  warningText: {
    color: '#92400e',
  },
  danger: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  dangerText: {
    color: '#b91c1c',
  },
  info: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  infoText: {
    color: '#1d4ed8',
  },
  neutral: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  neutralText: {
    color: '#374151',
  },
});
