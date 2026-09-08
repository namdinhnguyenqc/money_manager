/**
 * TrọCare Mobile — Boarding House Detail Screen
 * Restructured with premium, high-fidelity landlord metrics.
 * Displays facility information, dynamic financial summary, and detailed rooms list.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { apiGet, apiDelete } from '@/lib/api';
import { useFacilityStore } from '@/store/facilityStore';
import { useAppToast } from '@/components/ui/ToastProvider';

const formatMoney = (v?: number | null) =>
  `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(v || 0)))} ₫`;

function normalizeRoomStatus(room: any): string {
  const stat = String(room.status || '').toLowerCase();
  if (stat === 'occupied' || stat === 'occupied_soon') return 'occupied';
  if (stat === 'maintenance') return 'maintenance';
  if (stat === 'reserved') return 'reserved';
  return 'vacant';
}

export default function FacilityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showSuccess, showError } = useAppToast();

  const { facilityDetails, fetchFacilityDetail } = useFacilityStore();
  const cachedDetail = id ? facilityDetails[id] : null;

  const [loading, setLoading] = useState(!cachedDetail);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  const facility = cachedDetail;
  const rooms = (cachedDetail?.rooms ?? []).filter((room: any) => {
    const roomFacilityId = room.boarding_house_id ?? room.boardingHouseId ?? room.building_id ?? room.facility_id;
    return !id || String(roomFacilityId) === String(id);
  });

  const fetchData = useCallback(
    async (force = false) => {
      if (!id) return;
      try {
        await fetchFacilityDetail(id, force);
        const invoicesRes = await apiGet<any>('/invoices');
        setInvoices(invoicesRes?.data ?? []);
      } catch {
        // gracefully handle
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, fetchFacilityDetail]
  );

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleDelete = () => {
    Alert.alert('Xóa dãy trọ', 'Bạn có chắc chắn muốn xóa dãy trọ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/owner/boarding-houses/${id}`);
            showSuccess('Cơ sở đã được xoá.');
            router.back();
          } catch (e: any) {
            showError(e?.message || 'Không thể xoá cơ sở.');
          }
        },
      },
    ]);
  };

  // Finance Summary Calculations
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const bhInvoices = invoices.filter((i: any) => {
    const r = rooms.find((rm: any) => rm.id === i.room_id);
    return !!r && i.month === currentMonth && i.year === currentYear;
  });

  const projectedRevenue = bhInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const collectedRevenue = bhInvoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0);
  const remainingDebt = Math.max(0, projectedRevenue - collectedRevenue);

  const totalRooms = rooms.length;

  // Unpaid invoices debt calculation per room
  const getRoomDebt = (roomId: string) => {
    const roomInvoices = invoices.filter((i) => i.room_id === roomId && i.status !== 'paid');
    return roomInvoices.reduce(
      (sum, inv) => sum + Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)),
      0
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết dãy</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.container}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{facility?.name || 'Chi tiết dãy'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Boarding House Info & Financial Summary */}
        <Card style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.facilityName}>{facility?.name}</Text>
              {facility?.address && (
                <Text style={styles.address}>
                  <Ionicons name="location-outline" size={13} color={Colors.textMuted} />{' '}
                  {facility.address}
                </Text>
              )}
            </View>
            {facility?.name?.trim().toLowerCase() !== 'trọ nem' && (
              <TouchableOpacity style={styles.deleteCircleBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Monthly Financial Summary */}
          <View style={styles.financialSummary}>
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Dự thu tháng {currentMonth}</Text>
              <Text style={styles.financialValue}>{formatMoney(projectedRevenue)}</Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Đã thu</Text>
              <Text style={[styles.financialValue, { color: Colors.success }]}>
                {formatMoney(collectedRevenue)}
              </Text>
            </View>
            <View style={styles.financialDivider} />
            <View style={styles.financialCol}>
              <Text style={styles.financialLabel}>Còn nợ</Text>
              <Text
                style={[
                  styles.financialValue,
                  { color: remainingDebt > 0 ? Colors.danger : Colors.textPrimary },
                ]}
              >
                {formatMoney(remainingDebt)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Room List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách phòng ({totalRooms})</Text>
          <TouchableOpacity
            style={styles.addRoomBtn}
            onPress={() => router.push(`/room/new?facility_id=${id}`)}
          >
            <Ionicons name="add" size={16} color={Colors.textWhite} />
            <Text style={styles.addRoomBtnText}>Thêm phòng</Text>
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <EmptyState
            icon="bed-outline"
            title="Chưa có phòng trọ"
            description="Hãy thêm các phòng trực thuộc dãy trọ này để bắt đầu thiết lập hợp đồng."
          />
        ) : (
          <View style={styles.roomListContainer}>
            {rooms.map((room: any) => {
              const status = normalizeRoomStatus(room);
              const roomDebt = getRoomDebt(room.id);

              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.roomListCard}
                  onPress={() => router.push(`/room/${room.id}`)}
                  activeOpacity={0.72}
                >
                  <View style={styles.roomMainRow}>
                    <View style={styles.roomLeft}>
                      <Text style={styles.roomCardName}>{room.name}</Text>
                      <Text style={styles.roomCardPrice}>{formatMoney(room.price)}/tháng</Text>
                    </View>
                    <StatusBadge status={status} type="room" />
                  </View>

                  <View style={styles.roomDetailsRow}>
                    <View style={styles.tenantInfoCol}>
                      {room.tenant_name ? (
                        <View style={styles.tenantRow}>
                          <Ionicons name="person-outline" size={12} color={Colors.textSecondary} />
                          <Text style={styles.tenantNameText} numberOfLines={1}>
                            {room.tenant_name}
                          </Text>
                          {room.tenant_phone ? (
                            <TouchableOpacity
                              style={styles.phoneIconCircle}
                              onPress={(e) => {
                                e.stopPropagation();
                                Alert.alert('Khách thuê', `SĐT: ${room.tenant_phone}`);
                              }}
                            >
                              <Ionicons name="call-outline" size={10} color={Colors.primary} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.tenantRow}>
                          <Ionicons name="alert-circle-outline" size={12} color={Colors.textMuted} />
                          <Text style={styles.emptyTenantText}>Phòng đang trống</Text>
                        </View>
                      )}
                    </View>

                    {/* Room Debt highlights */}
                    {roomDebt > 0 ? (
                      <View style={styles.roomDebtContainer}>
                        <Text style={styles.roomDebtLabel}>Còn nợ:</Text>
                        <Text style={styles.roomDebtValue}>{formatMoney(roomDebt)}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
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
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  infoCard: {
    padding: 16,
  },
  infoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  facilityName: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  address: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  deleteCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financialSummary: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  financialCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  financialLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  financialValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  financialDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  statusProgressCard: {
    padding: 16,
    gap: 10,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  statusPercentageText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  statusCountersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  counterIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counterLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  addRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addRoomBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textWhite,
  },
  roomListContainer: {
    gap: 10,
  },
  roomListCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  roomMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomLeft: {
    gap: 2,
  },
  roomCardName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  roomCardPrice: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  roomDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  tenantInfoCol: {
    flex: 1,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tenantNameText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
    maxWidth: 120,
  },
  phoneIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTenantText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  roomDebtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomDebtLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textMuted,
  },
  roomDebtValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
});
