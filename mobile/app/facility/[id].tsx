/**
 * TrọCare Mobile — Facility Detail Screen
 * Shows facility info, room grid with status badges, and action buttons.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert,
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
import { apiDelete } from '@/lib/api';
import { useFacilityStore } from '@/store/facilityStore';

const formatMoney = (v?: number | null) => `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(v || 0)))} ₫`;

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

  const { facilityDetails, fetchFacilityDetail } = useFacilityStore();
  const cachedDetail = id ? facilityDetails[id] : null;

  const [loading, setLoading] = useState(!cachedDetail);
  const [refreshing, setRefreshing] = useState(false);

  const facility = cachedDetail;
  const rooms = (cachedDetail?.rooms ?? []).filter((room: any) => {
    const roomFacilityId = room.boarding_house_id ?? room.boardingHouseId ?? room.building_id ?? room.facility_id;
    return !id || String(roomFacilityId) === String(id);
  });

  const fetchData = useCallback(async (force = false) => {
    if (!id) return;
    try {
      await fetchFacilityDetail(id, force);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, fetchFacilityDetail]);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
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
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/owner/boarding-houses/${id}`);
            router.back();
          } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Không thể xóa.'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dãy trọ</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.container}><CardSkeleton /><CardSkeleton /></View>
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
        <Text style={styles.headerTitle}>{facility?.name || 'Dãy trọ'}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Facility Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.facilityName}>{facility?.name}</Text>
          {facility?.address && (
            <Text style={styles.address}>
              <Ionicons name="location-outline" size={14} color={Colors.textMuted} /> {facility.address}
            </Text>
          )}
          {facility?.name?.trim().toLowerCase() !== 'trọ nem' && (
            <View style={styles.actions}>
              <Button title="Xóa" variant="danger" size="sm" onPress={handleDelete} icon={<Ionicons name="trash-outline" size={14} color={Colors.textWhite} />} />
            </View>
          )}
        </Card>

        {/* Room Statistics Dashboard */}
        <View style={styles.statsDashboard}>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.statVal}>{rooms.length}</Text>
              <Text style={styles.statLbl}>Tổng phòng</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: Colors.successDark }]}>
              <Text style={[styles.statVal, { color: Colors.successDark }]}>
                {rooms.filter((r: any) => normalizeRoomStatus(r) === 'vacant').length}
              </Text>
              <Text style={styles.statLbl}>Phòng trống</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: Colors.appleBlue }]}>
              <Text style={[styles.statVal, { color: Colors.appleBlue }]}>
                {rooms.filter((r: any) => normalizeRoomStatus(r) === 'occupied').length}
              </Text>
              <Text style={styles.statLbl}>Đang thuê</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: Colors.warning }]}>
              <Text style={[styles.statVal, { color: Colors.warning }]}>
                {rooms.filter((r: any) => normalizeRoomStatus(r) === 'maintenance' || normalizeRoomStatus(r) === 'reserved').length}
              </Text>
              <Text style={styles.statLbl}>Bảo trì / Cọc</Text>
            </View>
          </View>
        </View>

        {/* Room Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phòng ({rooms.length})</Text>
          <Button title="Thêm phòng" variant="primary" size="sm" onPress={() => router.push(`/room/new?facility_id=${id}`)} icon={<Ionicons name="add" size={14} color={Colors.textWhite} />} />
        </View>

        {rooms.length === 0 ? (
          <EmptyState icon="bed-outline" title="Chưa có phòng" description="Thêm phòng để bắt đầu quản lý." />
        ) : (
          <View style={styles.roomGrid}>
            {rooms.map((room: any) => {
              const status = normalizeRoomStatus(room);
              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.roomCard}
                  onPress={() => router.push(`/room/${room.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.roomHeader}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <StatusBadge status={status} type="room" />
                  </View>
                  <Text style={styles.roomPrice}>{formatMoney(room.price)}/tháng</Text>
                  {room.tenant_name && (
                    <Text style={styles.roomTenant} numberOfLines={1}>
                      <Ionicons name="person-outline" size={11} color={Colors.textMuted} /> {room.tenant_name}
                    </Text>
                  )}
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
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  infoCard: { padding: 18 },
  statsDashboard: { marginVertical: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1, backgroundColor: Colors.surface, paddingVertical: 12, paddingHorizontal: 4,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, borderLeftWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  statVal: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  statLbl: { fontSize: 9.5, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  facilityName: { fontSize: 20, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.5 },
  address: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, letterSpacing: -0.3 },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomCard: {
    width: '48%' as any, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.borderLight, gap: 6,
  },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { fontSize: 15, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary, letterSpacing: -0.2 },
  roomPrice: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.primary, letterSpacing: -0.2 },
  roomTenant: { fontSize: 11, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted },
});
