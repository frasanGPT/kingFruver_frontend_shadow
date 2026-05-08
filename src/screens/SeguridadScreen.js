import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AppShell from '../components/AppShell';
import StateNoticeCard from '../components/StateNoticeCard';
import { changePassword } from '../services/authService';
import { loadSession } from '../services/sessionService';

export default function SeguridadScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
  const [screenResult, setScreenResult] = useState('Carga tu sesión y cambia tu contraseña de forma segura.');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const restoredSession = await loadSession();

        if (mounted === false) return;

        setSession(restoredSession);

        if (restoredSession && restoredSession.usuario && restoredSession.usuario.email) {
          setScreenResult('Sesión activa: ' + restoredSession.usuario.email);
        } else {
          setScreenResult('No hay sesión activa. Vuelve al inicio e inicia sesión.');
        }
      } catch (error) {
        if (mounted) {
          setScreenResult('Error cargando sesión: ' + error.message);
        }
      }
    }

    hydrateSession();

    return () => {
      mounted = false;
    };
  }, []);

  function validateForm() {
    if (!session || !session.token) return 'No hay sesión activa. Vuelve al inicio e inicia sesión.';
    if (passwordActual.trim() === '') return 'Debes escribir tu contraseña actual.';
    if (passwordNueva.trim() === '') return 'Debes escribir la nueva contraseña.';
    if (passwordNueva.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (passwordActual === passwordNueva) return 'La nueva contraseña debe ser diferente a la actual.';
    if (passwordNueva !== passwordConfirmacion) return 'La confirmación no coincide con la nueva contraseña.';

    return '';
  }

  async function handleChangePassword() {
    const validationError = validateForm();

    if (validationError) {
      setScreenResult(validationError);
      return;
    }

    try {
      setChangingPassword(true);
      setScreenResult('Cambiando contraseña...');

      const response = await changePassword({
        passwordActual,
        passwordNueva,
        token: session.token,
      });

      if (response && response.ok === true) {
        setPasswordActual('');
        setPasswordNueva('');
        setPasswordConfirmacion('');
        setScreenResult('Contraseña actualizada correctamente. La próxima vez inicia sesión con la nueva contraseña.');
        return;
      }

      throw new Error((response && (response.message || response.error)) || 'No se pudo cambiar la contraseña.');
    } catch (error) {
      setScreenResult('Error: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  }

  const currentUserEmail =
    session && session.usuario && session.usuario.email ? session.usuario.email : 'sin sesión';

  const currentUserRole =
    session && session.usuario && session.usuario.roleId && session.usuario.roleId.codigo
      ? session.usuario.roleId.codigo
      : 'sin rol';

  const canSubmit = changingPassword === false && Boolean(session && session.token);

  return (
    <AppShell
      title="Seguridad"
      subtitle="Cambio de contraseña"
      description="Actualiza tu propia contraseña validando primero la contraseña actual."
      layout="top"
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sesión actual</Text>
        <Text style={styles.cardText}>Usuario: {currentUserEmail}</Text>
        <Text style={styles.cardText}>Rol: {currentUserRole}</Text>

        <StateNoticeCard title="Resultado" description={screenResult} />

        <Text style={styles.label}>Contraseña actual</Text>
        <TextInput
          style={styles.input}
          value={passwordActual}
          onChangeText={setPasswordActual}
          placeholder="Escribe tu contraseña actual"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Nueva contraseña</Text>
        <TextInput
          style={styles.input}
          value={passwordNueva}
          onChangeText={setPasswordNueva}
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirmar nueva contraseña</Text>
        <TextInput
          style={styles.input}
          value={passwordConfirmacion}
          onChangeText={setPasswordConfirmacion}
          placeholder="Repite la nueva contraseña"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.helperText}>
          Si no recuerdas tu contraseña actual, solicita un reset administrativo.
        </Text>

        <Pressable
          style={[styles.primaryButton, canSubmit === false ? styles.disabledButton : null]}
          onPress={handleChangePassword}
          disabled={canSubmit === false}
        >
          <Text style={styles.primaryButtonText}>
            {changingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={onBack}>
        <Text style={styles.secondaryButtonText}>Volver al inicio</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: '#ffffff',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginTop: 12,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
});
