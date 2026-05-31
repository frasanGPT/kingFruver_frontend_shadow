const sessionExpiredListeners = new Set();

export function subscribeToSessionExpired(listener) {
  sessionExpiredListeners.add(listener);

  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      // Evita que un listener rompa la notificación global.
    }
  });
}
