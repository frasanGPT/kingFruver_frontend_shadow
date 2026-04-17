import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AppShell({
  title,
  subtitle,
  description,
  children,
  layout = 'center',
}) {
  const contentStyle =
    layout === 'top' ? styles.scrollContentTop : styles.scrollContentCenter;

  return (
    <SafeAreaView style={styles.safeArea}>
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
    backgroundColor: '#f4f6f8',
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
