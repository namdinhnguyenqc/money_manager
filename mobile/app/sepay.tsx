/**
 * TrọCare Mobile — SePay Integration Status
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Share, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { apiGet, apiPost } from '@/lib/api';
import type { PaymentChannel } from '@/lib/rentalOps';
import { formatMoney } from '@/lib/rentalOps';
import Config from '@/constants/Config';

const SEPAY_WEBHOOK_URL = `${Config.API_URL.replace(/\/$/, '')}/webhooks/sepay`;

const API_ROWS = [
  { method: 'POST', path: '/webhooks/sepay', desc: 'Webhook nhận giao dịch SePay' },
  { method: 'GET', path: '/payment-channels', desc: 'Danh sách kênh thanh toán' },
  { method: 'POST', path: '/payment-channels', desc: 'Tạo kênh SePay' },
  { method: 'PATCH', path: '/payment-channels/:id', desc: 'Cập nhật tự đối soát' },
  { method: 'GET', path: '/owner/sepay/events', desc: 'Nhật ký webhook' },
  { method: 'POST', path: '/owner/sepay/events/:id/reprocess', desc: 'Thử lại đối soát' },
];

export default function SepayScreen() {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventFilter, setEventFilter] = useState<'needs_action' | 'matched' | 'all'>('needs_action');
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [channelsRes, eventsRes] = await Promise.all([
        apiGet<any>('/payment-channels'),
        apiGet<any>('/owner/sepay/events'),
      ]);
      setChannels((channelsRes?.data || []).filter((item: PaymentChannel) => item.provider === 'sepay'));
      setEvents(eventsRes?.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const autoCount = channels.filter((item) => item.autoReconcileEnabled || item.auto_reconcile_enabled).length;
    const unresolved = events.filter((event) => ['pending_wallet', 'unmatched', 'error'].includes(event.status)).length;
    return { autoCount, unresolved };
  }, [channels, events]);

  const shareWebhook = () => {
    Share.share({ title: 'SePay Webhook URL', message: SEPAY_WEBHOOK_URL }).catch(() => {});
  };

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    if (eventFilter === 'matched') {
      return events.filter((event) => ['paid', 'partial', 'overpaid'].includes(String(event.status || '')));
    }
    return events.filter((event) => ['pending_wallet', 'unmatched', 'error'].includes(String(event.status || '')));
  }, [eventFilter, events]);

  const reprocessEvent = async (event: any) => {
    if (!event?.id || reprocessingId) return;
    try {
      setReprocessingId(String(event.id));
      await apiPost(`/owner/sepay/events/${event.id}/reprocess`, {});
      await load();
      Alert.alert('Đã đối soát lại', 'Giao dịch đã được xử lý với cấu hình hiện tại.');
    } catch (error: any) {
      Alert.alert('Chưa thể đối soát', error?.message || 'Hãy kiểm tra mã thanh toán và ví liên kết rồi thử lại.');
    } finally {
      setReprocessingId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Kết nối SePay', headerBackTitle: 'Cài đặt' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Card style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>SePay & đối soát tự động</Text>
            <Text style={styles.heroDesc}>Theo dõi kênh nhận tiền, webhook website và giao dịch tự ghi nhận hóa đơn.</Text>
          </View>
        </Card>

        <View style={styles.metricGrid}>
          <MetricCard icon="wallet-outline" label="Kênh SePay" value={String(channels.length)} tone="blue" />
          <MetricCard icon="sync-outline" label="Tự đối soát" value={String(metrics.autoCount)} tone="green" />
          <MetricCard icon="receipt-outline" label="Webhook" value={String(events.length)} tone="slate" />
          <MetricCard icon="alert-circle-outline" label="Cần xử lý" value={String(metrics.unresolved)} tone={metrics.unresolved ? 'amber' : 'green'} />
        </View>

        <Card style={styles.webhookCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Webhook website đang dùng</Text>
          </View>
          <View style={styles.webhookBox}>
            <Text style={styles.webhookText}>{SEPAY_WEBHOOK_URL}</Text>
          </View>
          <Button
            title="Chia sẻ webhook"
            variant="outline"
            fullWidth
            onPress={shareWebhook}
            icon={<Ionicons name="share-outline" size={16} color={Colors.textPrimary} />}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Kênh thanh toán SePay</Text>
          </View>
          {loading ? (
            <Text style={styles.mutedText}>Đang tải kênh thanh toán...</Text>
          ) : channels.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có kênh SePay. Cấu hình tài khoản nhận tiền ở web-admin để bật tự đối soát.</Text>
          ) : (
            <View style={styles.list}>
              {channels.map((channel) => (
                <ChannelRow key={channel.id} channel={channel} />
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>API website hiện có</Text>
          </View>
          <View style={styles.apiGrid}>
            {API_ROWS.map((item) => (
              <View key={`${item.method}-${item.path}`} style={styles.apiRow}>
                <View style={[styles.methodBadge, item.method === 'GET' ? styles.getBadge : item.method === 'POST' ? styles.postBadge : styles.patchBadge]}>
                  <Text style={[styles.methodText, item.method === 'GET' ? styles.getText : item.method === 'POST' ? styles.postText : styles.patchText]}>{item.method}</Text>
                </View>
                <View style={styles.apiTextBlock}>
                  <Text style={styles.apiPath}>{item.path}</Text>
                  <Text style={styles.apiDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Nhật ký webhook gần đây</Text>
          </View>
          <View style={styles.filterRow}>
            {([
              ['needs_action', `Cần xử lý (${metrics.unresolved})`],
              ['matched', 'Đã khớp'],
              ['all', 'Tất cả'],
            ] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, eventFilter === key && styles.filterChipActive]}
                onPress={() => setEventFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: eventFilter === key }}
              >
                <Text style={[styles.filterChipText, eventFilter === key && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {loading ? (
            <Text style={styles.mutedText}>Đang tải nhật ký...</Text>
          ) : filteredEvents.length === 0 ? (
            <Text style={styles.emptyText}>{eventFilter === 'needs_action' ? 'Không có giao dịch nào cần xử lý.' : 'Chưa có giao dịch trong nhóm này.'}</Text>
          ) : (
            <View style={styles.list}>
              {filteredEvents.slice(0, 50).map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  reprocessing={reprocessingId === String(event.id)}
                  onReprocess={() => reprocessEvent(event)}
                />
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: 'blue' | 'green' | 'amber' | 'slate' }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, tone === 'green' ? styles.greenTone : tone === 'amber' ? styles.amberTone : tone === 'slate' ? styles.slateTone : styles.blueTone]}>
        <Ionicons name={icon} size={16} color={tone === 'green' ? Colors.success : tone === 'amber' ? Colors.warning : tone === 'slate' ? Colors.textSecondary : Colors.primary} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ChannelRow({ channel }: { channel: PaymentChannel }) {
  const enabled = channel.enabled !== false;
  const auto = channel.autoReconcileEnabled || channel.auto_reconcile_enabled;
  return (
    <View style={styles.channelRow}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{channel.displayName || channel.display_name || 'SePay'}</Text>
        <Text style={styles.rowSub}>{channel.bankId || channel.bank_id || '-'} · {channel.accountNo || channel.account_no || '-'}</Text>
        <Text style={styles.rowSub}>{channel.accountName || channel.account_name || 'Chưa có chủ tài khoản'}</Text>
      </View>
      <View style={styles.badgeStack}>
        <Text style={[styles.statusBadge, enabled ? styles.okBadge : styles.offBadge]}>{enabled ? 'Bật' : 'Tắt'}</Text>
        <Text style={[styles.statusBadge, auto ? styles.okBadge : styles.warnBadge]}>{auto ? 'Tự đối soát' : 'Thủ công'}</Text>
      </View>
    </View>
  );
}

function EventRow({ event, reprocessing, onReprocess }: { event: any; reprocessing: boolean; onReprocess: () => void }) {
  const status = String(event.status || '');
  const ok = status === 'paid' || status === 'overpaid';
  const warning = status === 'pending_wallet' || status === 'unmatched';
  return (
    <View style={styles.eventRow}>
      <View style={styles.rowMain}>
        <Text style={styles.eventCode}>{event.payment_code || event.sepay_transaction_id || 'Không rõ mã'}</Text>
        <Text style={styles.rowSub}>{event.created_at ? new Date(event.created_at).toLocaleString('vi-VN') : '-'}</Text>
        {event.error_message ? <Text style={styles.errorText}>{event.error_message}</Text> : null}
      </View>
      <View style={styles.eventRight}>
        <Text style={styles.eventAmount}>+{formatMoney(event.transfer_amount || 0)}</Text>
        <Text style={[styles.statusBadge, ok ? styles.okBadge : warning ? styles.warnBadge : styles.errorBadge]}>{getStatusLabel(status)}</Text>
        {(warning || status === 'error') ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onReprocess}
            disabled={reprocessing}
            accessibilityRole="button"
            accessibilityLabel="Thử đối soát lại giao dịch"
          >
            <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
            <Text style={styles.retryText}>{reprocessing ? 'Đang xử lý' : 'Thử lại'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function getStatusLabel(status: string) {
  if (status === 'paid') return 'Thành công';
  if (status === 'overpaid') return 'Thanh toán dư';
  if (status === 'pending_wallet') return 'Chờ ví';
  if (status === 'unmatched') return 'Không khớp';
  if (status === 'ignored') return 'Bỏ qua';
  return status || 'Lỗi';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 17, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  heroDesc: { marginTop: 3, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48.5%', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 12 },
  metricIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  blueTone: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryAlpha20 },
  greenTone: { backgroundColor: Colors.successLight, borderColor: 'rgba(13, 148, 136, 0.2)' },
  amberTone: { backgroundColor: Colors.warningLight, borderColor: 'rgba(234, 179, 8, 0.2)' },
  slateTone: { backgroundColor: '#F8FAFC', borderColor: Colors.border },
  metricValue: { marginTop: 10, fontSize: 22, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  metricLabel: { marginTop: 2, fontSize: 11, fontFamily: Typography.fontFamily.semibold, color: Colors.textMuted },
  webhookCard: { padding: 16, gap: 12 },
  sectionCard: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterChipText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
  webhookBox: { borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  webhookText: { fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  mutedText: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  emptyText: { fontSize: 12, lineHeight: 18, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  list: { gap: 10 },
  channelRow: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  rowSub: { marginTop: 3, fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  badgeStack: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontFamily: Typography.fontFamily.bold },
  okBadge: { backgroundColor: Colors.successLight, color: Colors.success },
  warnBadge: { backgroundColor: Colors.warningLight, color: Colors.warning },
  offBadge: { backgroundColor: '#F1F5F9', color: Colors.textMuted },
  errorBadge: { backgroundColor: Colors.dangerLight, color: Colors.danger },
  apiGrid: { gap: 8 },
  apiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  methodBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  getBadge: { backgroundColor: Colors.primaryLight },
  postBadge: { backgroundColor: Colors.successLight },
  patchBadge: { backgroundColor: Colors.warningLight },
  methodText: { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  getText: { color: Colors.primary },
  postText: { color: Colors.success },
  patchText: { color: Colors.warning },
  apiTextBlock: { flex: 1, minWidth: 0 },
  apiPath: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  apiDesc: { marginTop: 2, fontSize: 11, lineHeight: 15, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  eventRow: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  eventCode: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  eventRight: { alignItems: 'flex-end', gap: 6 },
  eventAmount: { fontSize: 12, fontFamily: Typography.fontFamily.bold, color: Colors.success },
  retryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  retryText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  errorText: { marginTop: 4, fontSize: 10, lineHeight: 14, fontFamily: Typography.fontFamily.medium, color: Colors.danger },
});
