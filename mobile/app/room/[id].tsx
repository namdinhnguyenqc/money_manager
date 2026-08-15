/**
 * TrọCare Mobile — Room Detail Screen
 * Shows:
 * - Room details (Name, Price, Area, Status badge)
 * - Tenant details (if occupied)
 * - Lease agreement summary (if occupied)
 * - Actions:
 *   - Create contract (if vacant)
 *   - Create invoice (if occupied)
 *   - Toggle Maintenance status
 *   - Delete room
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useAppToast } from '@/components/ui/ToastProvider';
import {
  loadRoom,
  updateRoom,
  deleteRoom,
  forfeitReservationDeposit,
  formatMoney,
  getRoomArea,
} from '@/lib/rentalOps';

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useAppToast();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Business Data
  const [room, setRoom] = useState<any | null>(null);
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const roomData = await loadRoom(id);
      setRoom(roomData);
    } catch (e: any) {
      showError(e?.message || 'Không thể tải thông tin phòng.', 'Không tải được phòng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = () => {
    Alert.alert(
      'Xóa phòng trọ',
      'Hành động này sẽ xóa phòng trọ vĩnh viễn khỏi hệ thống. Bạn chắc chắn muốn xóa?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteRoom(id!);
              showSuccess('Phòng đã được xóa khỏi danh sách.', 'Đã xóa phòng');
              setTimeout(() => router.back(), 1000);
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không thể xóa phòng trọ.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleMaintenance = async () => {
    if (!room) return;
    const isMaintenance = room.status === 'maintenance';
    const newStatus = isMaintenance ? 'vacant' : 'maintenance';
    
    try {
      setActionLoading(true);
      await updateRoom(room.id, { status: newStatus });
      showSuccess(
        isMaintenance ? 'Phòng hiện sẵn sàng để cho thuê.' : 'Phòng đã được đánh dấu bảo trì.',
        'Đã cập nhật trạng thái'
      );
      fetchData();
    } catch (e: any) {
      showError(e?.message || 'Không thể cập nhật trạng thái.', 'Cập nhật chưa thành công');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForfeitReservation = () => {
    if (!room?.reservation_deposit_id) return;
    Alert.alert(
      `Bỏ cọc phòng ${room.name}?`,
      `Khách ${room.reservation_tenant_name || 'đặt cọc'} sẽ không nhận phòng. Phòng sẽ trở lại trạng thái Trống; ${formatMoney(room.reservation_amount || 0)} cọc đã thu được giữ lại và không tạo thêm giao dịch.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bỏ cọc',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await forfeitReservationDeposit(room.reservation_deposit_id);
              showSuccess('Phòng đã trở lại trạng thái trống. Khoản cọc giữ chỗ được lưu trong lịch sử.', 'Đã bỏ cọc');
              await fetchData();
            } catch (e: any) {
              showError(e?.message || 'Chưa thể bỏ cọc giữ chỗ.', 'Thao tác chưa thành công');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !room) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.detailSkeleton} accessibilityLabel="Đang tải chi tiết phòng">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Không tìm thấy phòng trọ.</Text>
          <Button title="Quay lại" variant="outline" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isOccupied = room.status === 'occupied' || room.status === 'occupied_soon';
  const isReserved = room.status === 'reserved';
  const isVacant = room.status === 'vacant';
  const isMaintenance = room.status === 'maintenance';

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phòng {room.name}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Room Header Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.headerRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="bed-outline" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomName}>Phòng {room.name}</Text>
              <Text style={styles.priceVal}>{formatMoney(room.price)} / tháng</Text>
            </View>
            <StatusBadge status={room.status} type="room" />
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Diện tích</Text>
              <Text style={styles.metaVal}>{getRoomArea(room)} m²</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Số người tối đa</Text>
              <Text style={styles.metaVal}>{room.max_people || 1} người</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Điều hòa (AC)</Text>
              <Text style={styles.metaVal}>{room.has_ac ? 'Có' : 'Không'}</Text>
            </View>
          </View>
        </Card>

        {/* Tenant Information Card (If occupied) */}
        {isOccupied && (
          <Card style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Khách thuê hiện tại</Text>
              <Ionicons name="people-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.detailLabel}>Họ và tên:</Text>
              <Text style={styles.detailValue}>{room.tenant_name || 'Khách thuê'}</Text>
            </View>
            {room.tenant_phone && (
              <View style={styles.detailRow}>
                <Ionicons name="phone-portrait-outline" size={15} color={Colors.textMuted} />
                <Text style={styles.detailLabel}>Điện thoại:</Text>
                <Text style={styles.detailValue}>{room.tenant_phone}</Text>
              </View>
            )}
            {room.tenant_id_card && (
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={15} color={Colors.textMuted} />
                <Text style={styles.detailLabel}>Số CCCD/ID:</Text>
                <Text style={styles.detailValue}>{room.tenant_id_card}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Lease Agreement Summary (If occupied) */}
        {isOccupied && room.contract_id && (
          <Card style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Thông tin hợp đồng</Text>
              <TouchableOpacity
                onPress={() => router.push(`/contract/${room.contract_id}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewContractLink}>Xem chi tiết</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tiền cọc:</Text>
              <Text style={styles.detailValue}>{formatMoney(room.deposit)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày bắt đầu:</Text>
              <Text style={styles.detailValue}>
                {room.start_date ? new Date(room.start_date).toLocaleDateString('vi-VN') : '—'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày hết hạn:</Text>
              <Text style={styles.detailValue}>
                {room.end_date ? new Date(room.end_date).toLocaleDateString('vi-VN') : '—'}
              </Text>
            </View>
          </Card>
        )}

        {/* Deposit has reserved the room, but it is not a lease until a contract exists. */}
        {isReserved && !room.contract_id && (
          <Card style={styles.pendingContractCard}>
            <View style={styles.pendingContractIcon}>
              <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.pendingContractCopy}>
              <Text style={styles.pendingContractTitle}>Chờ ký hợp đồng</Text>
              <Text style={styles.pendingContractDesc}>
                Phòng đã nhận cọc cho {room.reservation_tenant_name || 'khách thuê'}. Hoàn tất hợp đồng để bắt đầu quản lý kỳ thu và dịch vụ.
              </Text>
            </View>
            <Button
              title="Ký hợp đồng"
              variant="primary"
              onPress={() => router.push({
                pathname: '/contract/new',
                params: {
                  room_id: room.id,
                  facility_id: room.boarding_house_id,
                  tenant_name: room.reservation_tenant_name || '',
                  tenant_phone: room.reservation_tenant_phone || '',
                },
              })}
              icon={<Ionicons name="create-outline" size={16} color={Colors.textWhite} />}
              style={styles.pendingContractButton}
            />
            <Button
              title="Bỏ cọc"
              variant="outline"
              onPress={handleForfeitReservation}
              disabled={actionLoading || !room.reservation_deposit_id}
              icon={<Ionicons name="close-circle-outline" size={16} color={Colors.danger} />}
              style={styles.pendingContractButton}
              textStyle={{ color: Colors.danger }}
            />
          </Card>
        )}

        {/* Vacant Call to Action */}
        {isVacant && (
          <Card style={styles.vacantCard}>
            <Ionicons name="sparkles-outline" size={28} color={Colors.primary} style={styles.vacantIcon} />
            <Text style={styles.vacantTitle}>Phòng đang trống</Text>
            <Text style={styles.vacantDesc}>
              Lập hợp đồng cho thuê để ghi nhận khách mới dọn vào, chốt tiền cọc và quản lý dịch vụ.
            </Text>
            <Button
              title="Thiết lập hợp đồng mới"
              variant="primary"
              onPress={() => router.push(`/contract/new?room_id=${room.id}&facility_id=${room.boarding_house_id}`)}
              style={styles.vacantBtn}
            />
          </Card>
        )}

        {/* Maintenance Call to Action */}
        {isMaintenance && (
          <Card style={styles.maintenanceCard}>
            <Ionicons name="construct-outline" size={28} color={Colors.warning} style={styles.vacantIcon} />
            <Text style={styles.maintenanceTitle}>Phòng đang bảo trì</Text>
            <Text style={styles.vacantDesc}>
              Phòng đang tạm khóa để sửa chữa cơ sở vật chất. Không thể tạo hợp đồng mới khi phòng bảo trì.
            </Text>
            <Button
              title="Hoàn tất bảo trì"
              variant="success"
              onPress={toggleMaintenance}
              disabled={actionLoading}
              style={styles.vacantBtn}
            />
          </Card>
        )}

        {/* Actions Grid */}
        <View style={styles.actionsContainer}>
          {isOccupied && (
            <Button
              title="Tạo hóa đơn"
              variant="primary"
              onPress={() =>
                router.push({
                  pathname: '/invoice/new',
                  params: { contract_id: room.contract_id },
                })
              }
              icon={<Ionicons name="receipt-outline" size={16} color={Colors.textWhite} />}
              style={styles.actionBtn}
            />
          )}

          {!isOccupied && !isReserved && (
            <Button
              title={isMaintenance ? 'Mở khóa phòng' : 'Đưa vào bảo trì'}
              variant="outline"
              onPress={toggleMaintenance}
              disabled={actionLoading}
              icon={<Ionicons name="construct-outline" size={16} color={Colors.textPrimary} />}
              style={styles.actionBtn}
            />
          )}

          <Button
            title="Xóa phòng trọ"
            variant="danger"
            onPress={handleDelete}
            disabled={actionLoading}
            icon={<Ionicons name="trash-outline" size={16} color={Colors.textWhite} />}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  detailSkeleton: { flex: 1, padding: 16, gap: 14, backgroundColor: Colors.background },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.danger, textAlign: 'center' },
  card: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight },
  summaryCard: { padding: 18, backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', borderRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.4 },
  priceVal: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.primary, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#ddd6fe', marginVertical: 14 },
  metaGrid: { flexDirection: 'row', gap: 16 },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  metaVal: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 14, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.3 },
  viewContractLink: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailLabel: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, width: 90 },
  detailValue: { fontSize: 13, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  vacantCard: { alignItems: 'center', padding: 24, backgroundColor: Colors.surface, borderColor: Colors.borderLight },
  vacantIcon: { marginBottom: 12 },
  vacantTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  vacantDesc: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 10 },
  vacantBtn: { marginTop: 18, alignSelf: 'stretch' },
  maintenanceCard: { alignItems: 'center', padding: 24, backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  maintenanceTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.warning },
  pendingContractCard: { padding: 16, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.primaryAlpha20 },
  pendingContractIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pendingContractCopy: { minWidth: 0 },
  pendingContractTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  pendingContractDesc: { marginTop: 4, fontSize: 13, lineHeight: 19, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary },
  pendingContractButton: { marginTop: 14 },
  actionsContainer: { gap: 10, marginTop: 14 },
  actionBtn: { paddingVertical: 12 },
});
