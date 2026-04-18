import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { loginWithPassword } from '../services/authService';
import { clearSession, loadSession, saveSession } from '../services/sessionService';
import { extractSedeIdFromUser, getRoleCode } from '../utils/accessControl';

const ADMIN_EMAIL = 'admin.shadow@kingfruver.local';

export default function LoginAccessCard({ onSessionChange }) {
  const [authEmail, setAuthEmail] = useState(ADMIN_EMAIL);
  const [authPassword, setAuthPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [resultText, setResultText] = useState('Sin sesion iniciada.');
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    async function hydrateSession() {
      try {
        const session = await loadSession();

        if (session && session.usuario) {
          setAuthUser(session.usuario);
          setResultText(`Sesion activa: ${session.usuario.email}`);
          onSessionChange(session);
        } else {
          onSessionChange(null);
        }
      } catch (error) {
        setResultText(`Error cargando sesion: ${error.message}`);
        onSessionChange(null);
      } finally {
        setLoadingSession(false);
      }
    }

    hydrateSession();
  }, [onSessionChange]);

  async function handleLogin() {
    if (authEmail.trim() === '') {
      setResultText('Debes escribir el email.');
      return;
    }

    if (authPassword.trim() === '') {
      setResultText('Debes escribir la password.');
      return;
    }

    try {
      setLoading(true);
      setResultText('Iniciando sesion en shadow...');

      const response = await loginWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      const token = response?.data?.token || '';
      const usuario = response?.data?.usuario || null;

      if (token === '' || usuario === null || usuario._id === undefined) {
        throw new Error('Login sin token o sin usuario valido.');
      }

      const session = {
        token,
        usuario,
        usuarioId: usuario._id,
        sedeId: extractSedeIdFromUser(usuario),
      };

      await saveSession(session);

      setAuthUser(usuario);
      setResultText(
        `Sesion iniciada: ${usuario.email} | rol: ${getRoleCode(usuario) || 'sin rol'}`
      );
      onSessionChange(session);
    } catch (error) {
      setAuthUser(null);
      setResultText(`Error: ${error.message}`);
      onSessionChange(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    setAuthUser(null);
    setAuthPassword('');
    setResultText('Sesion cerrada.');
    onSessionChange(null);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Acceso shadow</Text>

      <Pressable style={styles.presetButton} onPress={() => setAuthEmail(ADMIN_EMAIL)}>
        <Text style={styles.presetButtonText}>Usar Admin Shadow</Text>
      </Pressable>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={authEmail}
        onChangeText={setAuthEmail}
        placeholder="Email shadow"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={authPassword}
        onChangeText={setAuthPassword}
        placeholder="Password shadow"
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Validar acceso</Text>
      </Pressable>

      {loading || loadingSession ? <ActivityIndicator size="large" style={styles.loader} /> : null}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
      </Pressable>

      <Text style={styles.resultText}>{resultText}</Text>

      {authUser ? (
        <View style={styles.sessionBox}>
          <Text style={styles.sessionText}>Usuario: {authUser.email}</Text>
          <Text style={styles.sessionText}>Rol: {getRoleCode(authUser) || 'sin rol'}</Text>
          <Text style={styles.sessionText}>
            Sede: {extractSedeIdFromUser(authUser) || 'sin sede'}
          </Text>
        </View>
      ) : null}
    </View>
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
    marginBottom: 14,
  },
  presetButton: {
    backgroundColor: '#eef2ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  presetButtonText: {
    color: '#3730a3',
    fontSize: 14,
    fontWeight: '600',
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
  loginButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  loader: {
    marginTop: 12,
  },
  resultText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#111827',
    marginTop: 12,
  },
  sessionBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  sessionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
});
