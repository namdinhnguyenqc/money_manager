import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { formatCurrency } from '../utils/format';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import { useToast } from '../components/ui/Toast';
import { getRoomsApi, createInvoiceApi } from '../services/rentalApiService';

export default function ManualBatchBillingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [readings, setReadings] = useState({}); // { roomId: { elec: '', water: '' } }

  const loadData = useCallback(async () => {
    try {
      const data = await getRoomsApi();
      // Chỉ lấy các phòng đang có người thuê (active contract)
      const activeRooms = data.filter(r => r.status === 'rented' && r.contract_id);
      setRooms(activeRooms);
      
      // Khởi tạo giá trị ban đầu từ số cũ (nếu có trong data API)
      const initialReadings = {};
      activeRooms.forEach(r => {
        initialReadings[r.id] = { elec: '', water: '' };
      });
      setReadings(initialReadings);
    } catch (e) {
      console.error(e);
      showToast('Không thể tải danh sách phòng', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const updateReading = (roomId, field, value) => {
    setReadings(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], [field]: value }
    }));
  };

  const handleSaveAll = async () => {
    const toProcess = rooms.filter(r => readings[r.id]?.elec || readings[r.id]?.water);
    if (toProcess.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập ít nhất một chỉ số để tạo hóa đơn.');
      return;
    }

    Alert.alert(
      'Xác nhận',
      `Bạn muốn tạo hóa đơn cho ${toProcess.length} phòng đã nhập?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tạo ngay',
          onPress: async () => {
            setSaving(true);
            try {
              let successCount = 0;
              const now = new Date();
              const month = now.getMonth() + 1;
              const year = now.getFullYear();

              for (const room of toProcess) {
                const r = readings[room.id];
                try {
                  await createInvoiceApi({
                    contractId: room.contract_id,
                    month,
                    year,
                    elecNew: parseFloat(r.elec) || null,
                    waterNew: parseFloat(r.water) || null,
                    // Các tham số khác như room_fee, services sẽ được backend xử lý tự động từ contract
                  });
                  successCount++;
                } catch (err) {
                  console.error(`Error for room ${room.name}:`, err);
                }
              }
              showToast(`Đã tạo thành công ${successCount} hóa đơn!`, 'success');
              navigation.navigate('Invoices');
            } catch (e) {
              showToast('Lỗi khi tạo hóa đơn hàng loạt', 'error');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={s.root}>
      <TopAppBar
        title="Nhập số hàng loạt"
        subtitle={`${rooms.length} phòng đang thuê`}
        onBack={() => navigation.goBack()}
      />

      <View style={s.headerTable}>
        <Text style={[s.headerCell, { flex: 1.2 }]}>Phòng</Text>
        <Text style={[s.headerCell, { flex: 1 }]}>Chỉ số Điện</Text>
        <Text style={[s.headerCell, { flex: 1 }]}>Chỉ số Nước</Text>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {rooms.map((room) => (
          <SurfaceCard key={room.id} style={s.rowCard} tone="lowest">
            <View style={{ flex: 1.2 }}>
              <Text style={s.roomName}>P.{room.name}</Text>
              <Text style={s.tenantName} numberOfLines={1}>{room.tenant_name}</Text>
            </View>
            
            <View style={s.inputCell}>
              <TextInput
                style={s.input}
                placeholder="Số mới"
                keyboardType="numeric"
                value={readings[room.id]?.elec}
                onChangeText={(v) => updateReading(room.id, 'elec', v)}
              />
            </View>

            <View style={s.inputCell}>
              <TextInput
                style={s.input}
                placeholder="Số mới"
                keyboardType="numeric"
                value={readings[room.id]?.water}
                onChangeText={(v) => updateReading(room.id, 'water', v)}
              />
            </View>
          </SurfaceCard>
        ))}

        {rooms.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="home-outline" size={48} color={COLORS.border} />
            <Text style={s.emptyText}>Không có phòng nào đang thuê để lập hóa đơn.</Text>
          </View>
        )}
      </ScrollView>

      {rooms.length > 0 && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSaveAll}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                <Text style={s.saveBtnText}>Tạo hóa đơn hàng loạt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTable: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  headerCell: { fontSize: 12, color: COLORS.textMuted, ...FONTS.bold },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  roomName: { fontSize: 15, color: COLORS.textPrimary, ...FONTS.bold },
  tenantName: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  inputCell: { flex: 1 },
  input: {
    height: 40,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    fontSize: 14,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    ...SHADOW.md,
  },
  saveBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 15, ...FONTS.bold },
  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 240 },
});
