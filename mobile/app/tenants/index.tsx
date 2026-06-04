/**
 * TrọCare Mobile — Tenants Management Screen
 * View all tenants in the system, search, and edit profiles inline.
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
  Linking,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { loadTenants, updateTenant, formatMoney } from '@/lib/rentalOps';

export default function TenantsScreen() {
  const router = useRouter();

  // State
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit Modal State
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    idCard: '',
    email: '',
    address: '',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchTenants = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      const list = await loadTenants();
      setTenants(list);
    } catch (e: any) {
      showToast(e?.message || 'Không tải được danh sách khách thuê.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', 'Thiết bị không hỗ trợ tính năng gọi.');
    });
  };

  const handleOpenEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name || '',
      phone: tenant.phone || '',
      idCard: tenant.id_card || tenant.idCard || '',
      email: tenant.email || '',
      address: tenant.address || '',
    });
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Thiếu thông tin', 'Họ tên không được để trống.');
      return;
    }

    if (editForm.phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Thông tin không hợp lệ', 'Số điện thoại phải có đúng 10 chữ số.');
      return;
    }

    const cleanIdCard = editForm.idCard.replace(/\D/g, '');
    if (cleanIdCard && cleanIdCard.length !== 12) {
      Alert.alert('Thông tin không hợp lệ', 'Số CCCD phải có đúng 12 chữ số.');
      return;
    }

    try {
      setSaving(true);
      await updateTenant(editingTenant.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        idCard: editForm.idCard.trim(),
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
      });

      showToast('Cập nhật hồ sơ khách thuê thành công!', 'success');
      setEditingTenant(null);
      fetchTenants();
    } catch (e: any) {
      Alert.alert('Lỗi cập nhật', e?.message || 'Không thể lưu thông tin.');
    } finally {
      setSaving(false);
    }
  };

  // Filter
  const filtered = tenants.filter((t) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (t.name || '').toLowerCase().includes(query);
    const phoneMatch = (t.phone || '').includes(query);
    const cardMatch = (t.id_card || t.idCard || '').includes(query);
    return nameMatch || phoneMatch || cardMatch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Khách thuê',
          headerBackTitle: 'Quay lại',
          headerTitleStyle: { fontFamily: Typography.fontFamily.bold },
        }}
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm theo tên, SĐT, CCCD..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách khách thuê...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={() => fetchTenants(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Không tìm thấy khách thuê</Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery ? 'Không có khách thuê nào khớp với tìm kiếm.' : 'Hệ thống chưa ghi nhận khách thuê nào.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const initial = (item.name || 'K').charAt(0).toUpperCase();
              return (
                <Card style={styles.tenantCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tenantName}>{item.name}</Text>
                      <Text style={styles.tenantId}>ID: {item.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerActions}>
                      {item.phone && (
                        <TouchableOpacity style={styles.actionIcon} onPress={() => handleCall(item.phone)}>
                          <Ionicons name="call-outline" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.actionIcon} onPress={() => handleOpenEdit(item)}>
                        <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailRow}>
                      <Ionicons name="phone-portrait-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailValue}>{item.phone || 'Chưa cập nhật'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="card-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailValue}>{item.id_card || item.idCard || 'Chưa cập nhật'}</Text>
                    </View>
                    {item.email && (
                      <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailValue}>{item.email}</Text>
                      </View>
                    )}
                    {item.address && (
                      <View style={styles.detailRow}>
                        <Ionicons name="map-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.detailValue} numberOfLines={1}>{item.address}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            }}
          />
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={!!editingTenant} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật khách thuê</Text>
              <TouchableOpacity onPress={() => setEditingTenant(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={() => 'edit-form'}
              renderItem={() => (
                <View style={styles.modalScroll}>
                  <Input
                    label="Họ và tên *"
                    value={editForm.name}
                    onChangeText={(v) => setEditForm({ ...editForm, name: v })}
                    placeholder="Ví dụ: Nguyễn Văn A"
                  />
                  <View style={{ height: 12 }} />

                  <Input
                    label="Số điện thoại (10 số) *"
                    value={editForm.phone}
                    onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
                    placeholder="Ví dụ: 0987654321"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <View style={{ height: 12 }} />

                  <Input
                    label="Số CCCD / Hộ chiếu (12 số) (không bắt buộc)"
                    value={editForm.idCard}
                    onChangeText={(v) => setEditForm({ ...editForm, idCard: v })}
                    placeholder="Ví dụ: 030098765432"
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                  <View style={{ height: 12 }} />

                  <Input
                    label="Địa chỉ email"
                    value={editForm.email}
                    onChangeText={(v) => setEditForm({ ...editForm, email: v })}
                    placeholder="Ví dụ: email@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={{ height: 12 }} />

                  <Input
                    label="Quê quán / Hộ khẩu"
                    value={editForm.address}
                    onChangeText={(v) => setEditForm({ ...editForm, address: v })}
                    placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh"
                  />
                  <View style={{ height: 24 }} />

                  <Button
                    title={saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    variant="primary"
                    onPress={handleSave}
                    disabled={saving}
                    icon={saving ? <ActivityIndicator size="small" color="#fff" /> : undefined}
                  />
                </View>
              )}
            />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  searchIcon: { position: 'absolute', left: 28, zIndex: 1 },
  searchInput: {
    flex: 1,
    paddingLeft: 38,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderColor: 'transparent',
    borderRadius: 10,
  },
  clearBtn: { position: 'absolute', right: 28, padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  list: { padding: 16, gap: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  tenantCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: Typography.fontFamily.bold, color: Colors.primary },
  tenantName: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, letterSpacing: -0.2 },
  tenantId: { fontSize: 10, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 6 },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  detailsGrid: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailValue: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  modalScroll: { padding: 16 },
});
