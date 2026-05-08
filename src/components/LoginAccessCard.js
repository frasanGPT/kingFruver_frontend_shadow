import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { loginWithPassword } from '../services/authService';
import { clearSession, loadSession, saveSession } from '../services/sessionService';
import {
  getActiveEnvironment,
  getEnvironmentList,
  saveActiveEnvironment,
  setActiveEnvironmentKey,
} from '../services/environmentService';
import { extractSedeIdFromUser, getRoleCode } from '../utils/accessControl';

function isAdminUser(usuario) {
  return getRoleCode(usuario) === 'admin';
}

function resolveSedeId(usuario, fallbackEmail, environment) {
  const extracted = extractSedeIdFromUser(usuario);

  if (extracted) {
    return extracted;
  }

  if ((usuario && usuario.email === environment.adminEmail) || fallbackEmail === environment.adminEmail) {
    return environment.defaultSedeId;
  }

  return '';
}

function resolveCajaId(usuario, fallbackEmail, environment) {
  if ((usuario && usuario.email === environment.adminEmail) || fallbackEmail === environment.adminEmail) {
    return environment.defaultCajaId;
  }

  return '';
}

export default function LoginAccessCard({
  onSessionChange,
  onEnvironmentChange,
  activeEnvironment = getActiveEnvironment(),
}) {
  const [authEmail, setAuthEmail] = useState(activeEnvironment.adminEmail);
  const [authPassword, setAuthPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [resultText, setResultText] = useState('Sin sesión iniciada.');
  const [authUser, setAuthUser] = useState(null);
  const [authSedeId, setAuthSedeId] = useState('');
  const [pendingEnvironment, setPendingEnvironment] = useState(null);
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchResultText, setSwitchResultText] = useState('');
  const [switchingEnvironment, setSwitchingEnvironment] = useState(false);

  useEffect(() => {
    setAuthEmail(activeEnvironment.adminEmail);
    setAuthPassword('');
  }, [activeEnvironment.key, activeEnvironment.adminEmail]);

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const session = await loadSession(activeEnvironment.key);

        if (!mounted) return;

        if (session && session.usuario) {
          setAuthUser(session.usuario);
          setAuthSedeId(
            session.sedeId ||
              resolveSedeId(session.usuario, session.usuario?.email || '', activeEnvironment)
          );
          setResultText(`Sesión activa: ${session.usuario.email}`);
          onSessionChange(session);
        } else {
          setAuthUser(null);
          setAuthSedeId('');
          setResultText('Sin sesión iniciada.');
          onSessionChange(null);
        }
      } catch (error) {
        if (!mounted) return;

        setResultText(`Error cargando sesión: ${error.message}`);
        onSessionChange(null);
      } finally {
        if (mounted) {
          setLoadingSession(false);
        }
      }
    }

    setLoadingSession(true);
    hydrateSession();

    return () => {
      mounted = false;
    };
  }, [activeEnvironment.key]);

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
      setResultText(activeEnvironment.copy.loginProgress);

      setActiveEnvironmentKey(activeEnvironment.key);

      const response = await loginWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      const token = response?.data?.token || '';
      const usuario = response?.data?.usuario || null;

      if (token === '' || usuario === null || usuario._id === undefined) {
        throw new Error('Login sin token o sin usuario valido.');
      }

      const resolvedSedeId = resolveSedeId(usuario, authEmail.trim(), activeEnvironment);
      const resolvedCajaId = resolveCajaId(usuario, authEmail.trim(), activeEnvironment);

      const session = {
        token,
        usuario,
        usuarioId: usuario._id,
        sedeId: resolvedSedeId,
        cajaId: resolvedCajaId,
      };

      await saveSession(session, activeEnvironment.key);

      setAuthUser(usuario);
      setAuthSedeId(resolvedSedeId || '');
      setResultText(
        `Sesión iniciada: ${usuario.email} | rol: ${getRoleCode(usuario) || 'sin rol'}`
      );
      onSessionChange({
        ...session,
        environmentKey: activeEnvironment.key,
        environmentLabel: activeEnvironment.label,
      });
    } catch (error) {
      setAuthUser(null);
      setResultText(`Error: ${error.message}`);
      onSessionChange(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession(activeEnvironment.key);
    setAuthUser(null);
    setAuthSedeId('');
    setAuthPassword('');
    setResultText('Sesión cerrada.');
    onSessionChange(null);
  }

  function openEnvironmentSwitch(environment) {
    if (environment.key === activeEnvironment.key) {
      return;
    }

    if (authUser && !isAdminUser(authUser)) {
      setResultText('Solo un administrador puede cambiar de ambiente.');
      return;
    }

    setPendingEnvironment(environment);
    setSwitchPassword('');
    setSwitchResultText(
      `Para cambiar a ${environment.label}, ingresa la password de ${environment.adminEmail}.`
    );
  }

  function closeEnvironmentSwitch() {
    if (switchingEnvironment) return;

    setPendingEnvironment(null);
    setSwitchPassword('');
    setSwitchResultText('');
  }

  async function confirmEnvironmentSwitch() {
    if (!pendingEnvironment) return;

    if (switchPassword.trim() === '') {
      setSwitchResultText('Debes escribir la password del admin del ambiente destino.');
      return;
    }

    const previousEnvironment = activeEnvironment;

    try {
      setSwitchingEnvironment(true);
      setSwitchResultText(`Validando admin de ${pendingEnvironment.label}...`);

      setActiveEnvironmentKey(pendingEnvironment.key);

      const response = await loginWithPassword({
        email: pendingEnvironment.adminEmail,
        password: switchPassword,
      });

      const token = response?.data?.token || '';
      const usuario = response?.data?.usuario || null;

      if (token === '' || usuario === null || usuario._id === undefined) {
        throw new Error('Login sin token o sin usuario valido.');
      }

      if (!isAdminUser(usuario)) {
        throw new Error('El usuario destino no tiene rol admin.');
      }

      const session = {
        token,
        usuario,
        usuarioId: usuario._id,
        sedeId: resolveSedeId(usuario, pendingEnvironment.adminEmail, pendingEnvironment),
        cajaId: resolveCajaId(usuario, pendingEnvironment.adminEmail, pendingEnvironment),
      };

      const savedEnvironment = await saveActiveEnvironment(pendingEnvironment.key);
      await saveSession(session, savedEnvironment.key);

      const nextSession = {
        ...session,
        environmentKey: savedEnvironment.key,
        environmentLabel: savedEnvironment.label,
      };

      setAuthUser(usuario);
      setAuthEmail(savedEnvironment.adminEmail);
      setAuthPassword('');
      setAuthSedeId(session.sedeId || '');
      setResultText(`Ambiente activo: ${savedEnvironment.label}. Sesión admin iniciada.`);
      onSessionChange(nextSession);

      if (onEnvironmentChange) {
        onEnvironmentChange(savedEnvironment, nextSession);
      }

      setPendingEnvironment(null);
      setSwitchPassword('');
      setSwitchResultText('');
    } catch (error) {
      setActiveEnvironmentKey(previousEnvironment.key);
      setSwitchResultText(`Error: ${error.message}`);
    } finally {
      setSwitchingEnvironment(false);
    }
  }

  const environmentList = getEnvironmentList();
  const canSwitchEnvironment = !authUser || isAdminUser(authUser);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Acceso {activeEnvironment.label}</Text>

      <View style={styles.environmentBox}>
        <Text style={styles.environmentLabel}>Ambiente activo</Text>
        <Text style={styles.environmentValue}>{activeEnvironment.badgeLabel}</Text>

        {canSwitchEnvironment ? (
          <View style={styles.environmentButtons}>
            {environmentList.map((environment) => (
              <Pressable
                key={environment.key}
                style={[
                  styles.environmentButton,
                  environment.key === activeEnvironment.key ? styles.environmentButtonActive : null,
                ]}
                onPress={() => openEnvironmentSwitch(environment)}
              >
                <Text
                  style={[
                    styles.environmentButtonText,
                    environment.key === activeEnvironment.key ? styles.environmentButtonTextActive : null,
                  ]}
                >
                  {environment.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.environmentHint}>
            Solo un administrador puede cambiar de ambiente.
          </Text>
        )}
      </View>

      <Pressable style={styles.presetButton} onPress={() => setAuthEmail(activeEnvironment.adminEmail)}>
        <Text style={styles.presetButtonText}>Usar Admin {activeEnvironment.label}</Text>
      </Pressable>

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={authEmail}
        onChangeText={setAuthEmail}
        placeholder={`Email ${activeEnvironment.label}`}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        value={authPassword}
        onChangeText={setAuthPassword}
        placeholder={`Password ${activeEnvironment.label}`}
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
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </Pressable>

      <Text style={styles.resultText}>{resultText}</Text>

      {authUser ? (
        <View style={styles.sessionBox}>
          <Text style={styles.sessionText}>Usuario: {authUser.email}</Text>
          <Text style={styles.sessionText}>Rol: {getRoleCode(authUser) || 'sin rol'}</Text>
          <Text style={styles.sessionText}>
            Sede: {authUser?.sedeId?.nombre || authUser?.sedeId?.codigo || (authSedeId === activeEnvironment.defaultSedeId ? activeEnvironment.defaultSedeLabel : authSedeId ? 'configurada' : 'sin sede')}
          </Text>
          <Text style={styles.sessionText}>Ambiente: {activeEnvironment.label}</Text>
        </View>
      ) : null}

      <Modal
        visible={Boolean(pendingEnvironment)}
        transparent
        animationType="fade"
        onRequestClose={closeEnvironmentSwitch}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar cambio de ambiente</Text>
            <Text style={styles.modalText}>
              Cambiarás de {activeEnvironment.label} a {pendingEnvironment?.label}.
            </Text>
            <Text style={styles.modalWarning}>
              Esta acción requiere credenciales admin del ambiente destino.
            </Text>

            <Text style={styles.label}>Admin destino</Text>
            <Text style={styles.modalAdminEmail}>{pendingEnvironment?.adminEmail}</Text>

            <Text style={styles.label}>Password admin destino</Text>
            <TextInput
              value={switchPassword}
              onChangeText={setSwitchPassword}
              placeholder="Password admin"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {switchResultText ? <Text style={styles.resultText}>{switchResultText}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeEnvironmentSwitch}
                disabled={switchingEnvironment}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmEnvironmentSwitch}
                disabled={switchingEnvironment}
              >
                <Text style={styles.modalConfirmText}>
                  {switchingEnvironment ? 'Validando...' : 'Cambiar ambiente'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  environmentBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  environmentLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  environmentValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '800',
    marginBottom: 10,
  },
  environmentButtons: {
    flexDirection: 'row',
  },
  environmentButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  environmentButtonActive: {
    backgroundColor: '#111827',
  },
  environmentButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  environmentButtonTextActive: {
    color: '#ffffff',
  },
  environmentHint: {
    fontSize: 13,
    color: '#6b7280',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 14,
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  modalAdminEmail: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButton: {
    backgroundColor: '#e5e7eb',
  },
  modalConfirmButton: {
    backgroundColor: '#111827',
  },
  modalCancelText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
