/**
 * TrọCare Mobile — Services Management Screen
 * CRUD for service configs (Điện, Nước, Wifi, Rác...).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  loadServiceConfigs, createService, updateService, deleteService,
  toggleServiceStatus, formatMoney,
  type ServiceConfig, describeServiceType,
} from '@/lib/rentalOps';

const SERVICE_TYPES = [
  { value: 'metered', label: 'Theo số đo (Điện, Nước...)' },
  { value: 'per_person', label: 'Theo người' },
  { value: 'per_room', label: 'Theo phòng' },
  { value: 'fixed', label: 'Cố định' },
];

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', type: 'metered', unitPrice: '', unitPriceAc: '', unit: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await loadServiceConfigs(false);
      setServices(data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên dịch vụ.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateService(editingId, {
          name: form.name.trim(),
          type: form.type,
          unitPrice: Number(form.unitPrice) || 0,
          unitPriceAc: Number(form.unitPriceAc) || 0,
          unit: form.unit || undefined,
        });
        Alert.alert('Thành công', 'Đã cập nhật dịch vụ.');
      } else {
        await createService({
          name: form.name.trim(),
          type: form.type,
          unitPrice: Number(form.unitPrice) || 0,
          unitPriceAc: Number(form.unitPriceAc) || undefined,
          unit: form.unit || undefined,
        });
        Alert.alert('Thành công', 'Đã thêm dịch vụ mới.');
      }
      setForm({ name: '', type: 'metered', unitPrice: '', unitPriceAc: '', unit: '' });
      setEditingId(null);
      setShowAdd(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu dịch vụ.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (service: ServiceConfig) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      type: service.type,
      unitPrice: String(service.unit_price || 0),
      unitPriceAc: String(service.unit_price_ac || ''),
      unit: service.unit || '',
    });
    setShowAdd(true);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xóa dịch vụ', `Bạn có chắc muốn xóa "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try { await deleteService(id); fetchData(); }
          catch (err: any) { Alert.alert('Lỗi', err?.message || 'Không thể xóa.'); }
        },
      },
    ]);
  };

  const handleToggle = async (service: ServiceConfig) => {
    try {
      await toggleServiceStatus(service);
      fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bảng giá dịch vụ</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={20} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      {showAdd && (
        <Card style={styles.addCard}>
          <Text style={styles.addTitle}>{editingId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên dịch vụ (VD: Rác sinh hoạt)"
            placeholderTextColor={Colors.textMuted}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <View style={styles.typeRow}>
            {SERVICE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, form.type === t.value && styles.typeChipActive]}
                onPress={() => setForm({ ...form, type: t.value })}
              >
                <Text style={[styles.typeChipText, form.type === t.value && styles.typeChipTextActive]}>
                  {t.label.split(' (')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Đơn giá (VNĐ)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={form.unitPrice}
              onChangeText={(v) => setForm({ ...form, unitPrice: v })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Giá ML (tùy chọn)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              value={form.unitPriceAc}
              onChangeText={(v) => setForm({ ...form, unitPriceAc: v })}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Đơn vị (số, m³, người...)"
            placeholderTextColor={Colors.textMuted}
            value={form.unit}
            onChangeText={(v) => setForm({ ...form, unit: v })}
          />
          <View style={styles.addActions}>
            <TouchableOpacity style={styles.cancelAction} onPress={() => { setShowAdd(false); setEditingId(null); }}>
              <Text style={styles.cancelActionText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveAction} onPress={handleSubmit} disabled={saving}>
              <Text style={styles.saveActionText}>{saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu dịch vụ')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Service List */}
      {services.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="flash-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có dịch vụ nào</Text>
          <Text style={styles.emptySubtext}>Nhấn nút + để thêm dịch vụ mới</Text>
        </Card>
      ) : (
        services.map((service) => (
          <Card key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceIcon}>
                <Text style={{ fontSize: 18 }}>{service.icon || '⚙️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceType}>{describeServiceType(service)}</Text>
              </View>
              <View style={styles.servicePriceCol}>
                <Text style={styles.servicePrice}>{formatMoney(service.unit_price)}</Text>
                {service.unit_price_ac ? (
                  <Text style={styles.servicePriceAc}>ML: {formatMoney(service.unit_price_ac)}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.serviceActions}>
              <TouchableOpacity
                style={[styles.statusBtn, service.active ? styles.statusActive : styles.statusInactive]}
                onPress={() => handleToggle(service)}
              >
                <Ionicons
                  name={service.active ? 'checkmark-circle' : 'pause-circle'}
                  size={14}
                  color={service.active ? Colors.successDark : Colors.textMuted}
                />
                <Text style={[styles.statusText, service.active ? styles.statusTextActive : styles.statusTextInactive]}>
                  {service.active ? 'Hoạt động' : 'Tạm ngưng'}
                </Text>
              </TouchableOpacity>
              <View style={styles.rightActions}>
                <TouchableOpacity onPress={() => handleStartEdit(service)} style={styles.editBtn}>
                  <Ionicons name="create-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(service.id, service.name)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18, fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary, letterSpacing: -0.3,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  addCard: { padding: 16, gap: 12, marginBottom: 8 },
  addTitle: {
    fontSize: 15, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary, marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary, backgroundColor: Colors.background,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  typeChipActive: {
    backgroundColor: Colors.primaryLight, borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 12, fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  typeChipTextActive: { color: Colors.primary },
  priceRow: { flexDirection: 'row', gap: 8 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelAction: { padding: 10, borderRadius: 8 },
  cancelActionText: {
    fontSize: 14, fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  saveAction: {
    padding: 10, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveActionText: {
    fontSize: 14, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textWhite,
  },
  emptyCard: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: {
    fontSize: 16, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13, fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  serviceCard: { padding: 14, gap: 10 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceName: {
    fontSize: 15, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  serviceType: {
    fontSize: 12, fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted, marginTop: 1,
  },
  servicePriceCol: { alignItems: 'flex-end' },
  servicePrice: {
    fontSize: 14, fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  servicePriceAc: {
    fontSize: 11, fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted, marginTop: 1,
  },
  serviceActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10,
  },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusActive: { backgroundColor: Colors.successLight },
  statusInactive: { backgroundColor: Colors.background },
  statusText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold },
  statusTextActive: { color: Colors.successDark },
  statusTextInactive: { color: Colors.textMuted },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
});
