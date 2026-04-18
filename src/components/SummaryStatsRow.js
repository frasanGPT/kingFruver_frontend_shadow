import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SummaryStatsRow({ items = [] }) {
  return (
    <View style={styles.row}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          style={[styles.card, index < items.length - 1 ? styles.cardGap : null]}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cardGap: {
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});
