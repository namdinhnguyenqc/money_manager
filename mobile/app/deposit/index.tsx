/**
 * TrọCare Mobile — Deposits List Screen
 * View all reservation deposits, filter by status, change statuses (cancel/refund/transfer), and create new deposits.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { loadDeposits, updateDepositStatus, formatMoney, DepositStatus } from '@/lib/rentalOps';

export default function DepositsScreen() {
  const router = useRouter();

  // State
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | DepositStatus>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Status Action Modal State
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<DepositStatus | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchDeposits = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      const list = await loadDeposits();
      setDeposits(list);
    } catch (e: any) {
      showToast(e?.message || 'Không tải được danh sách tiền cọc giữ phòng.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleOpenAction = (deposit: any, status: DepositStatus) => {
    setSelectedDeposit(deposit);
    setActionStatus(status);
    setStatusNote('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedDeposit || !actionStatus) return;

    try {
      setSavingAction(true);
      await updateDepositStatus(selectedDeposit.id, actionStatus, statusNote.trim() || undefined);
      showToast('Cập nhật trạng thái tiền cọc giữ phòng thành công!', 'success');
      setSelectedDeposit(null);
      setActionStatus(null);
      fetchDeposits();
    } catch (e: any) {
      Alert.alert('Lỗi cập nhật', e?.message || 'Không thể thay đổi trạng thái tiền cọc.');
    } finally {
      setSavingAction(false);
    }
  };

  // Metrics
  const holdingCount = deposits.filter((d) => d.status === 'holding').length;
  const holdingAmount = deposits
    .filter((d) => d.status === 'holding')
    .reduce((sum, d) => sum + Math.round(Number(d.amount || 0)), 0);

  // Filtering
  const filtered = deposits.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const getStatusMeta = (status: DepositStatus) => {
    switch (status) {
      case 'holding':
        return { label: 'Đang giữ cọc', type: 'warning' as const };
      case 'transferred':
        return { label: 'Đã chuyển HĐ', type: 'info' as const };
      case 'refunded':
        return { label: 'Đã hoàn trả', type: 'success' as const };
      case 'cancelled':
        return { label: 'Đã hủy cọc', type: 'danger' as const };
      default:
        return { label: 'Không rõ', type: 'default' as const };
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Tiền cọc giữ phòng',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/deposit/new')} style={styles.headerAddBtn}>
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Aggregates Card */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Phòng đang giữ cọc</Text>
                <Text style={styles.summaryValCount}>{holdingCount} phòng</Text>
              </View>
              <View style={styles.dividerVertical} />
              <View>
                <Text style={styles.summaryLabel}>Tổng tiền cọc giữ phòng</Text>
                <Text style={styles.summaryValAmount}>{formatMoney(holdingAmount)}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            <TouchableOpacity
              style={[styles.tab, filter === 'all' && styles.tabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, filter === 'holding' && styles.tabActive]}
              onPress={() => setFilter('holding')}
            >
              <Text style={[styles.tabText, filter === 'holding' && styles.tabTextActive]}>Đang giữ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, filter === 'transferred' && styles.tabActive]}
              onPress={() => setFilter('transferred')}
            >
              <Text style={[styles.tabText, filter === 'transferred' && styles.tabTextActive]}>Đã chuyển HĐ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, filter === 'refunded' && styles.tabActive]}
              onPress={() => setFilter('refunded')}
            >
              <Text style={[styles.tabText, filter === 'refunded' && styles.tabTextActive]}>Đã hoàn trả</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, filter === 'cancelled' && styles.tabActive]}
              onPress={() => setFilter('cancelled')}
            >
              <Text style={[styles.tabText, filter === 'cancelled' && styles.tabTextActive]}>Đã hủy cọc</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải tiền cọc giữ phòng...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={() => fetchDeposits(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Không tìm thấy tiền cọc</Text>
                <Text style={styles.emptyDesc}>Chưa ghi nhận thông tin tiền cọc giữ phòng nào phù hợp.</Text>
                {filter === 'all' && (
                  <Button
                    title="Ghi nhận đặt cọc mới"
                    variant="primary"
                    onPress={() => router.push('/deposit/new')}
                    style={{ marginTop: 14 }}
                  />
                )}
              </View>
            }
            renderItem={({ item }) => {
              const meta = getStatusMeta(item.status);
              const dateStr = item.deposit_date ? new Date(item.deposit_date).toLocaleDateString('vi-VN') : '---';

              return (
                <Card style={styles.depositCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomName}>{item.room_name || 'Phòng cọc giữ'}</Text>
                      {item.facility_name && (
                        <Text style={styles.facilityName}>🏢 {item.facility_name}</Text>
                      )}
                    </View>
                    <StatusBadge status={item.status} type="deposit" />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.metaRows}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Khách cọc:</Text>
                      <Text style={styles.metaValue}>{item.tenant_name} {item.tenant_phone ? `(${item.tenant_phone})` : ''}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Số tiền cọc:</Text>
                      <Text style={[styles.metaValue, styles.amountVal]}>{formatMoney(item.amount)}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Ngày đặt cọc:</Text>
                      <Text style={styles.metaValue}>{dateStr}</Text>
                    </View>
                    {item.note ? (
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Ghi chú:</Text>
                        <Text style={[styles.metaValue, styles.noteVal]}>{item.note}</Text>
                      </View>
                    ) : null}
                  </View>

                  {item.status === 'holding' && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        onPress={() => router.push(`/contract/new?room_id=${item.room_id}&tenant_name=${item.tenant_name}&tenant_phone=${item.tenant_phone || ''}`)}
                      >
                        <Ionicons name="contract" size={14} color={Colors.primary} />
                        <Text style={styles.actionBtnTextPrimary}>Ký hợp đồng</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenAction(item, 'refunded')}
                      >
                        <Ionicons name="arrow-undo-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.actionBtnText}>Hoàn trả</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenAction(item, 'cancelled')}
                      >
                        <Ionicons name="close-circle-outline" size={14} color={Colors.danger} />
                        <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Hủy cọc</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            }}
          />
        )}
      </View>

      {/* Action Dialog / Note Picker */}
      <Modal visible={!!selectedDeposit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionStatus === 'refunded' ? 'Xác nhận hoàn trả cọc' : 'Xác nhận hủy cọc'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDeposit(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalIntro}>
                Bạn đang thực hiện thay đổi trạng thái tiền cọc giữ phòng{' '}
                <Text style={{ fontFamily: Typography.fontFamily.bold }}>
                  {selectedDeposit?.room_name}
                </Text>{' '}
                của khách{' '}
                <Text style={{ fontFamily: Typography.fontFamily.bold }}>
                  {selectedDeposit?.tenant_name}
                </Text>{' '}
                với số tiền{' '}
                <Text style={{ fontFamily: Typography.fontFamily.bold, color: Colors.primary }}>
                  {formatMoney(selectedDeposit?.amount)}
                </Text>
                .
              </Text>

              <Input
                label="Lý do / Ghi chú nội bộ"
                placeholder="Nhập ghi chú chi tiết..."
                value={statusNote}
                onChangeText={setStatusNote}
                multiline
                numberOfLines={3}
              />

              <View style={{ height: 24 }} />

              <Button
                title={savingAction ? 'Đang thực hiện...' : 'Xác nhận'}
                variant={actionStatus === 'refunded' ? 'success' : 'danger'}
                onPress={handleUpdateStatus}
                disabled={savingAction}
                icon={savingAction ? <ActivityIndicator size="small" color="#fff" /> : undefined}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  headerAddBtn: { padding: 4 },
  summaryContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  summaryCard: { backgroundColor: Colors.primaryLight + '10', borderColor: Colors.primary + '30', padding: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.2 },
  summaryValCount: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginTop: 4 },
  summaryValAmount: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 4 },
  dividerVertical: { width: 1, height: 40, backgroundColor: Colors.borderLight, marginHorizontal: 20 },
  tabsContainer: { backgroundColor: '#fff' },
  tabsScroll: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textWhite },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, gap: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 45 },
  depositCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roomName: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.2 },
  facilityName: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  metaRows: { gap: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 12, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  metaValue: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  amountVal: { fontSize: 13, color: Colors.primary },
  noteVal: { fontFamily: Typography.fontFamily.regular, fontStyle: 'italic', color: Colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primaryLight,
  },
  actionBtnText: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  actionBtnTextPrimary: { fontSize: 11, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '65%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 16 },
  modalIntro: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, lineHeight: 18, marginBottom: 16 },
});
