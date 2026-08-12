import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiPost } from '@/lib/api';

const PUSH_TOKEN_KEY = 'trocare_expo_push_token';
const LAST_HANDLED_NOTIFICATION_RESPONSE_KEY = 'trocare_last_handled_notification_response';
const notificationResponsesInProcess = new Set<string>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushNotifications(requestPermission: boolean): Promise<{
  enabled: boolean;
  permission: Notifications.PermissionStatus;
  token?: string;
}> {
  if (!Device.isDevice) {
    return { enabled: false, permission: Notifications.PermissionStatus.UNDETERMINED };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Thanh toán',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#2563EB',
      sound: 'default',
    });
  }

  let permission = (await Notifications.getPermissionsAsync()).status;
  if (permission !== Notifications.PermissionStatus.GRANTED && requestPermission) {
    permission = (await Notifications.requestPermissionsAsync()).status;
  }
  if (permission !== Notifications.PermissionStatus.GRANTED) {
    return { enabled: false, permission };
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Thiếu EAS projectId để đăng ký thông báo.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiPost('/owner/notification-devices', {
    token,
    deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
    deviceName: `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim() || undefined,
  });
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  return { enabled: true, permission, token };
}

export async function registerPushIfAlreadyAllowed(): Promise<void> {
  const permission = (await Notifications.getPermissionsAsync()).status;
  if (permission === Notifications.PermissionStatus.GRANTED) {
    await registerPushNotifications(false);
  }
}

export function getNotificationRoute(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const invoiceId = data.invoice_id || data.invoiceId;
  if (invoiceId) return `/invoice/${String(invoiceId)}`;
  const roomId = data.room_id || data.roomId;
  if (roomId) return `/room/${String(roomId)}`;
  return '/notifications';
}

/**
 * Expo keeps the last tapped notification response until it is explicitly
 * cleared. Persist the identifier as a second guard so a process restart or
 * background resume can never replay an old navigation action.
 */
export async function consumeNotificationResponseOnce(
  response: Notifications.NotificationResponse,
): Promise<boolean> {
  const responseKey = [
    response.notification.request.identifier,
    response.actionIdentifier,
  ].join(':');
  if (notificationResponsesInProcess.has(responseKey)) return false;
  notificationResponsesInProcess.add(responseKey);
  const lastHandled = await SecureStore.getItemAsync(LAST_HANDLED_NOTIFICATION_RESPONSE_KEY);
  if (lastHandled === responseKey) {
    Notifications.clearLastNotificationResponse();
    return false;
  }
  await SecureStore.setItemAsync(LAST_HANDLED_NOTIFICATION_RESPONSE_KEY, responseKey);
  Notifications.clearLastNotificationResponse();
  return true;
}
