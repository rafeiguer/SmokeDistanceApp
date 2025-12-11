// 📡 NOTIFICATIONS - Push Notifications

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Notificações negadas');
      return;
    }
    console.log('✅ Notificações ativas');
  } catch (err) {
    console.warn('⚠️ Erro notificações:', err);
  }
}