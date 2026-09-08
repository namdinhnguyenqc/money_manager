import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useAppToast } from '@/components/ui/ToastProvider';
import { apiGet, apiPost } from '@/lib/api';

const ZCA_API = '/api/zca';
const PENDING_QR_STATES = new Set(['pending', 'qr_ready', 'scanned']);

export default function ZaloSettingsScreen() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const mounted = useRef(true);
  const connectionNotified = useRef(false);
  const terminalStateNotified = useRef<string | null>(null);
  const { showToast, showSuccess } = useAppToast();

  const applyStatus = useCallback((result: any) => {
    if (mounted.current) setStatus(result?.data ?? result ?? null);
  }, []);

  const loadStatus = useCallback(async (quiet = false) => {
    try {
      applyStatus(await apiGet<any>(`${ZCA_API}/status`, { cacheTtlMs: 0, forceRefresh: true }));
    } catch (error: any) {
      if (!quiet) showToast(error?.status === 404
        ? 'Phiên bản backend chưa có Zalo QR. Hãy deploy backend mới nhất rồi thử lại.'
        : error?.message || 'Không tải được trạng thái Zalo.', 'error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [applyStatus, showToast]);

  const loadQrSession = useCallback(async (sessionId: string) => {
    try {
      const result = await apiGet<any>(`${ZCA_API}/qr/${sessionId}`, { cacheTtlMs: 0, forceRefresh: true });
      const login = result?.data ?? result;
      if (!mounted.current) return;
      if (login?.status === 'not_found') {
        setStatus((previous: any) => ({ ...previous, login: null }));
        showToast('Mã QR đã hết hạn hoặc backend vừa khởi động lại. Hãy tạo mã mới.', 'warning');
        return;
      }
      setStatus((previous: any) => ({ ...previous, login }));
      if (login?.status === 'connected') {
        if (!connectionNotified.current) {
          connectionNotified.current = true;
          showSuccess('Tài khoản Zalo đã kết nối. Bạn có thể gửi hóa đơn ngay.', 'Kết nối thành công');
        }
        void loadStatus(true);
      } else if (['expired', 'failed', 'declined'].includes(login?.status)) {
        if (terminalStateNotified.current !== login.status) {
          terminalStateNotified.current = login.status;
          showToast(login?.error || 'Mã QR không còn hiệu lực. Hãy tạo mã mới để kết nối.', 'warning', 'Kết nối chưa hoàn tất');
        }
      }
    } catch {
      // A background poll must never interrupt the user. The next poll retries.
    }
  }, [loadStatus, showToast]);

  useEffect(() => {
    mounted.current = true;
    void loadStatus();
    return () => { mounted.current = false; };
  }, [loadStatus]);

  const sessionId = status?.login?.sessionId;
  const loginStatus = status?.login?.status;
  useEffect(() => {
    if (!sessionId || status?.connected || !PENDING_QR_STATES.has(loginStatus)) return;
    void loadQrSession(sessionId);
    const timer = setInterval(() => void loadQrSession(sessionId), 2500);
    return () => clearInterval(timer);
  }, [loadQrSession, loginStatus, sessionId, status?.connected]);

  const startQr = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const result = await apiPost<any>(`${ZCA_API}/qr/start`, {}, { retry: false });
      const login = result?.data ?? result;
      if (!login?.sessionId) throw new Error('Máy chủ chưa trả về phiên QR. Vui lòng thử lại.');
      connectionNotified.current = false;
      terminalStateNotified.current = null;
      // `/qr/start` returns a login session, not the full status payload.
      // Store it under `login` so the polling effect begins immediately.
      setStatus((previous: any) => ({
        ...(previous || {}),
        connected: false,
        login: { sessionId: login.sessionId, status: login.status || 'pending' },
      }));
      void loadQrSession(login.sessionId);
      showToast('Đang tạo mã QR. Mã sẽ xuất hiện trong vài giây.', 'info', 'Đang kết nối Zalo');
    } catch (error: any) {
      showToast(error?.status === 404
        ? 'Backend hiện chưa có route Zalo QR. Cần deploy backend có route /api/zca/qr/start.'
        : error?.message || 'Không tạo được mã QR. Hãy thử lại.', 'error');
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  const retryStatus = async () => {
    setRetrying(true);
    await loadStatus();
    if (mounted.current) setRetrying(false);
  };

  const disconnect = () => Alert.alert('Ngắt kết nối Zalo', 'Bạn sẽ không thể gửi hóa đơn qua Zalo cho đến khi quét QR lại.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Ngắt kết nối', style: 'destructive', onPress: async () => {
      try {
        await apiPost(`${ZCA_API}/disconnect`, {});
        await loadStatus(true);
        showSuccess('Tài khoản Zalo đã được ngắt kết nối.');
      } catch (error: any) {
        showToast(error?.message || 'Không thể ngắt kết nối Zalo.', 'error');
      }
    } },
  ]);

  const qrImage = status?.login?.qrImage;
  const hasActiveQr = Boolean(sessionId && PENDING_QR_STATES.has(loginStatus));

  return (
    <>
      <Stack.Screen options={{ title: 'Kết nối Zalo', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.icon}><Ionicons name="chatbubble-ellipses-outline" size={25} color={Colors.primary} /></View>
          <View style={styles.headerCopy}><Text style={styles.title}>Gửi hóa đơn qua Zalo</Text><Text style={styles.copy}>Quét QR một lần. Sau đó gửi ảnh hóa đơn và nhắc nợ ngay từ ứng dụng.</Text></View>
        </View>

        {loading ? <View style={styles.loadingCard} accessibilityLabel="Đang kiểm tra kết nối Zalo"><CardSkeleton /></View> : status?.connected ? (
          <View style={styles.connected}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <View style={styles.headerCopy}><Text style={styles.connectedTitle}>Zalo đã sẵn sàng</Text><Text style={styles.copy}>{status?.account?.name || 'Bạn có thể gửi hóa đơn cho khách thuê.'}</Text></View>
          </View>
        ) : (
          <View style={styles.card}>
            {qrImage ? <><Text style={styles.qrTitle}>Mở Zalo và quét mã này</Text><Image source={{ uri: qrImage }} style={styles.qr} resizeMode="contain" /><View style={styles.qrState}><Ionicons name="radio-button-on" size={14} color={Colors.primary} /><Text style={styles.qrStateText}>{loginStatus === 'scanned' ? 'Đã quét — xác nhận trên Zalo để hoàn tất' : 'Đang chờ bạn quét mã'}</Text></View></> : <><View style={styles.emptyIcon}><Ionicons name="qr-code-outline" size={44} color={Colors.primary} /></View><Text style={styles.qrTitle}>{hasActiveQr ? 'Đang chuẩn bị mã QR…' : 'Kết nối tài khoản Zalo'}</Text><Text style={styles.copyCenter}>{hasActiveQr ? 'Vui lòng chờ một chút, mã sẽ tự xuất hiện.' : 'Bấm tạo QR rồi dùng ứng dụng Zalo trên điện thoại để quét.'}</Text></>}
          </View>
        )}

        {!status?.connected ? <Button title={starting ? 'Đang tạo QR...' : hasActiveQr && !qrImage ? 'Đang chuẩn bị mã QR...' : qrImage ? 'Tạo mã QR mới' : 'Tạo QR đăng nhập Zalo'} variant="primary" fullWidth loading={starting || (hasActiveQr && !qrImage)} disabled={starting || (hasActiveQr && !qrImage)} onPress={startQr} icon={<Ionicons name="qr-code-outline" size={18} color={Colors.textWhite} />} /> : <Button title="Ngắt kết nối" variant="danger" fullWidth onPress={disconnect} />}
        {!loading && !status?.connected && !hasActiveQr ? <TouchableOpacity style={styles.retryButton} onPress={retryStatus} disabled={retrying}><Ionicons name="refresh-outline" size={17} color={Colors.primary} /><Text style={styles.retryText}>{retrying ? 'Đang kiểm tra…' : 'Kiểm tra lại kết nối'}</Text></TouchableOpacity> : null}
        <Text style={styles.note}>Hóa đơn luôn được gửi dạng ảnh PNG. Chỉ gửi cho khách có số điện thoại hợp lệ và hóa đơn chưa thanh toán.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, content: { padding: 20, paddingBottom: 32, gap: 16 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, headerCopy: { flex: 1, minWidth: 0 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Typography.fontFamily.bold, fontSize: 18, color: Colors.textPrimary }, copy: { marginTop: 4, fontFamily: Typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: Colors.textSecondary }, copyCenter: { fontFamily: Typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: Colors.textSecondary, textAlign: 'center' },
  loadingCard: { minHeight: 112, justifyContent: 'center', alignItems: 'center', padding: 20, borderRadius: 16, backgroundColor: Colors.surface },
  card: { alignItems: 'center', gap: 12, padding: 20, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  emptyIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, qr: { width: 260, height: 260, backgroundColor: '#fff' }, qrTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 16, color: Colors.textPrimary, textAlign: 'center' },
  qrState: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5 }, qrStateText: { fontFamily: Typography.fontFamily.medium, fontSize: 12, color: Colors.primaryDark },
  connected: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: Colors.successLight, borderWidth: 1, borderColor: '#A7F3D0' }, connectedTitle: { fontFamily: Typography.fontFamily.bold, fontSize: 15, color: Colors.successDark },
  retryButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, retryText: { fontFamily: Typography.fontFamily.semibold, fontSize: 13, color: Colors.primary }, note: { fontFamily: Typography.fontFamily.regular, fontSize: 12, lineHeight: 18, color: Colors.textMuted, textAlign: 'center' },
});
