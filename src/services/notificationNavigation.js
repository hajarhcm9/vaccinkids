export function notificationTarget(notification) {
  const referenceId = notification?.referenceId || notification?.reference_id;
  const referenceType = notification?.referenceType || notification?.reference_type;

  if (referenceType === 'rendez_vous') return { screen: 'Appointments' };
  if (referenceType === 'session' && referenceId) {
    return {
      screen: 'Sessions',
      params: { screen: 'SessionDetail', params: { sessionId: String(referenceId) } },
    };
  }
  if (referenceType === 'bebe' && referenceId) {
    return { screen: 'HealthBook', params: { babyId: String(referenceId) } };
  }
  if (referenceType === 'file_attente') {
    return { screen: 'Home', params: { screen: 'Queue' } };
  }
  return null;
}
