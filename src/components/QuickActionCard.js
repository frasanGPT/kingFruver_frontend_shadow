import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function QuickActionCard({
  title,
  description,
  badge,
  onPress,
  disabled = false,
}) {
  if (disabled) {
    return null;
  }

  return (
    <Pressable
      style={[styles.card, disabled ? styles.cardDisabled : null]}
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, disabled ? styles.titleDisabled : null]}>{title}</Text>
      </View>

      <Text style={[styles.description, disabled ? styles.descriptionDisabled : null]}>
        {description}
      </Text>

      {badge ? (
        <View style={styles.badgeRow}>
          <View style={[styles.badge, disabled ? styles.badgeDisabled : null]}>
            <Text style={[styles.badgeText, disabled ? styles.badgeTextDisabled : null]}>
              {badge}
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    opacity: 0.75,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeRow: {
    width: '100%',
    marginTop: 12,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    paddingRight: 8,
  },
  titleDisabled: {
    color: '#6b7280',
  },
  badge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeDisabled: {
    backgroundColor: '#e5e7eb',
  },
  badgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextDisabled: {
    color: '#6b7280',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4b5563',
  },
  descriptionDisabled: {
    color: '#6b7280',
  },
});
