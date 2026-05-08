import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getActiveEnvironment } from '../config/environments';

export default function AppShell({
  title,
  subtitle,
  description,
  children,
  layout = 'center',
  environment = getActiveEnvironment(),
}) {
  const contentStyle =
    layout === 'top' ? styles.scrollContentTop : styles.scrollContentCenter;

  const backgroundColor = environment?.theme?.backgroundColor || '#f4f6f8';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={contentStyle}>
        <View style={styles.inner}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContentCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrollContentTop: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingVertical: 24,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
});
