import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { apiGet, apiPatch } from '@/lib/api';
import { registerPushNotifications } from '@/lib/pushNotifications';

type Preferences = {
  notificationsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  paymentReceivedEnabled: boolean;
  paymentSentEnabled: boolean;
  paymentReminderEnabled: boolean;
};

const defaults: Preferences = {
  notificationsEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  paymentReceivedEnabled: true,
  paymentSentEnabled: true,
  paymentReminderEnabled: true,
};

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof Preferences | null>(null);
  const [systemPermission, setSystemPermission] = useState<Notifications.PermissionStatus>();
  const [loadError, setLoadError] = useState(false);

  const refreshPermission = async () => {
    setSystemPermission((await Notifications.getPermissionsAsync()).status);
  };

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(false);
    const permission = await Notifications.getPermissionsAsync();
    setSystemPermission(permission.status);
    try {
      const response = await apiGet<any>('/owner/notification-preferences');
      setPrefs({ ...defaults, ...(response?.data || response) });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermission();
    });
    return () => subscription.remove();
  }, []);

  const update = async (key: keyof Preferences, value: boolean) => {
    if (savingKey) return;
    if (key === 'pushEnabled' && value) {
      try {
        const registration = await registerPushNotifications(true);
        setSystemPermission(registration.permission);
        if (!registration.enabled) {
          Alert.alert(
            'Chưa cấp quyền thông báo',
            'Hãy bật quyền thông báo cho TrọCare trong Cài đặt của điện thoại.',
            [
              { text: 'Để sau', style: 'cancel' },
              { text: 'Mở cài đặt', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      } catch (error: any) {
        Alert.alert('Không thể bật thông báo', error?.message || 'Vui lòng thử lại.');
        return;
      }
    }

    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    try {
      const response = await apiPatch<any>('/owner/notification-preferences', { [key]: value });
      setPrefs({ ...defaults, ...(response?.data || response) });
    } catch {
      setPrefs(previous);
      Alert.alert('Không lưu được', 'Cài đặt chưa được thay đổi. Vui lòng thử lại.');
    } finally {
      setSavingKey(null);
    }
  };

  const disabled = loading || loadError || !prefs.notificationsEnabled;
  const permissionGranted = systemPermission === Notifications.PermissionStatus.GRANTED;
  const permissionBlocked = systemPermission === Notifications.PermissionStatus.DENIED;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Cài đặt thông báo' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Chọn những thông báo tài chính bạn muốn nhận từ TrọCare.</Text>

        {loadError ? (
          <View style={styles.errorBox}>
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Chưa kết nối được dịch vụ thông báo</Text>
              <Text style={styles.errorText}>Cài đặt chưa được tải nên TrọCare sẽ không hiển thị trạng thái bật giả định.</Text>
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={loadSettings} activeOpacity={0.72}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.group}>
          <SettingRow
            title="Cho phép thông báo"
            description="Bật hoặc tắt toàn bộ thông báo từ TrọCare."
            value={prefs.notificationsEnabled}
            disabled={loading || loadError || Boolean(savingKey)}
            onChange={(value) => update('notificationsEnabled', value)}
          />
        </View>

        <Text style={styles.sectionTitle}>Hình thức nhận</Text>
        <View style={styles.group}>
          <SettingRow
            title="Thông báo đẩy"
            description={permissionBlocked ? 'Đang bị tắt trong cài đặt điện thoại.' : 'Hiển thị ngay cả khi bạn không mở ứng dụng.'}
            value={prefs.pushEnabled && permissionGranted}
            disabled={disabled || Boolean(savingKey)}
            onChange={(value) => update('pushEnabled', value)}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Thông báo trong ứng dụng"
            description="Lưu thông báo trong Trung tâm thông báo của TrọCare."
            value={prefs.inAppEnabled}
            disabled={disabled || Boolean(savingKey)}
            onChange={(value) => update('inAppEnabled', value)}
          />
        </View>

        <Text style={styles.sectionTitle}>Giao dịch</Text>
        <View style={styles.group}>
          <SettingRow
            title="Nhận tiền thành công"
            description="Thông báo khi SePay hoặc hệ thống xác nhận chủ trọ đã nhận tiền."
            value={prefs.paymentReceivedEnabled}
            disabled={disabled || Boolean(savingKey)}
            onChange={(value) => update('paymentReceivedEnabled', value)}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Thanh toán thành công"
            description="Thông báo xác nhận khoản tiền bạn đã thanh toán thành công."
            value={prefs.paymentSentEnabled}
            disabled={disabled || Boolean(savingKey)}
            onChange={(value) => update('paymentSentEnabled', value)}
          />
          <View style={styles.divider} />
          <SettingRow
            title="Nhắc hóa đơn đến hạn"
            description="Nhắc khách trước hạn 3 ngày, đúng hạn và khi quá hạn; tự dừng khi đã thu đủ."
            value={prefs.paymentReminderEnabled}
            disabled={disabled || Boolean(savingKey)}
            onChange={(value) => update('paymentReminderEnabled', value)}
          />
        </View>
      </ScrollView>
    </>
  );
}

function SettingRow({ title, description, value, disabled, onChange }: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primaryAlpha50 }}
        thumbColor={value ? Colors.primary : '#FFFFFF'}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 48 },
  intro: { fontSize: 14, lineHeight: 21, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, marginTop: 24, marginBottom: 10 },
  group: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  errorBox: { minHeight: 82, marginBottom: 20, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.warningLight },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  errorText: { marginTop: 3, fontSize: 11.5, lineHeight: 16, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  retryText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  row: { minHeight: 76, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, lineHeight: 21, fontFamily: Typography.fontFamily.medium, color: Colors.textPrimary },
  rowDescription: { marginTop: 3, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: Colors.border },
  disabled: { opacity: 0.5 },
});
