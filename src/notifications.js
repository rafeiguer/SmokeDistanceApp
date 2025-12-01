import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from './firebase';

// Basic foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function getOrCreateDeviceId() {
  try {
    const k = 'device_id';
    let id = await AsyncStorage.getItem(k);
    if (!id) {
      id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(k, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}`;
  }
}

export async function registerForPushNotificationsAsync() {
  try {
    // Ask permission
    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;
    if (finalStatus !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') return null;

    // Get Expo token
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.expoConfig?.extra?.eas?.projectID;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId }).catch(() => null);
    const token = tokenData?.data || null;
    if (!token) return null;

    await AsyncStorage.setItem('expo_push_token', token);

    // Persist to Firestore if available
    try {
      const db = getDb();
      if (db) {
        const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
        const deviceId = await getOrCreateDeviceId();
        await setDoc(doc(db, 'devices', deviceId), {
          token,
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch {}

    return token;
  } catch (e) {
    return null;
  }
}
