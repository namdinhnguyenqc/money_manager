/**
 * TrọCare Mobile — Wallets Management Screen
 * List wallets with balances, create new wallet, delete wallet, bootstrap defaults.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  loadWallets, createWallet, deleteWallet, formatMoney,
  type Wallet,
} from '@/lib/rentalOps';

const WALLET_TYPES = [
  { value: 'personal', label: 'Cá nhân (Chi tiêu riêng)' },
  { value: 'rental', label: 'Quỹ trọ (Thu chi phòng trọ)' },
  { value: 'trading', label: 'Kinh doanh (Vốn nhập hàng)' },
];

export default function WalletsScreen() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'personal',
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await loadWallets();
      setWallets(data);
    } catch {
      // gracefully fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên ví.');
      return;
    }
    setSaving(true);
    try {
      await createWallet({
        name: form.name.trim(),
        type: form.type,
      });
      setForm({ name: '', type: 'personal' });
      setShowAdd(false);
      fetchData();
      Alert.alert('Thành công', 'Đã tạo ví mới.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo ví.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xóa ví', `Bạn có chắc chắn muốn xóa ví "${name}"? Thao tác này có thể ảnh hưởng đến các giao dịch liên kết.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWallet(id);
            fetchData();
            Alert.alert('Thành công', 'Đã xóa ví.');
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Không thể xóa ví.');
          }
        },
      },
    ]);
  };

  const bootstrapWallets = async () => {
    setSaving(true);
    try {
      const DEFAULT_WALLETS = [
        { name: 'Ví cá nhân', type: 'personal' },
        { name: 'Quỹ nhà trọ', type: 'rental' },
        { name: 'Vốn nhập hàng', type: 'trading' },
      ];
      const existingTypes = new Set(wallets.map((w) => w.type));
      const missing = DEFAULT_WALLETS.filter((w) => !existingTypes.has(w.type));

      if (missing.length === 0) {
        Alert.alert('Thông tin', 'Bạn đã có đầy đủ các loại ví mặc định.');
        return;
      }

      for (const w of missing) {
        await createWallet(w);
      }
      fetchData();
      Alert.alert('Thành công', 'Đã khởi tạo bộ ví mặc định.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể khởi tạo ví mặc định.');
    } finally {
      setSaving(false);
    }
  };

  const getWalletIcon = (type?: string) => {
    switch (type) {
      case 'personal':
        return { name: 'person-outline' as const, color: '#3b82f6', bg: '#eff6ff' };
      case 'rental':
        return { name: 'home-outline' as const, color: '#10b981', bg: '#ecfdf5' };
      case 'trading':
        return { name: 'trending-up-outline' as const, color: '#f59e0b', bg: '#fef3c7' };
      default:
        return { name: 'wallet-outline' as const, color: Colors.primary, bg: Colors.primaryLight };
    }
  };

  const getWalletTypeName = (type?: string) => {
    switch (type) {
      case 'personal':
        return 'Ví cá nhân';
      case 'rental':
        return 'Quỹ nhà trọ';
      case 'trading':
        return 'Vốn nhập hàng';
      default:
        return 'Tài khoản khác';
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ví & Tài khoản</Text>
          <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
            <Ionicons name={showAdd ? 'close' : 'add'} size={20} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* Quick Bootstrap Card */}
          {wallets.length < 3 && (
            <Card style={styles.promoCard}>
              <View style={styles.promoHeader}>
                <Ionicons name="sparkles-outline" size={20} color="#6366f1" />
                <Text style={styles.promoTitle}>Khởi tạo bộ ví mặc định</Text>
              </View>
              <Text style={styles.promoText}>
                Tạo nhanh 3 ví thiết yếu: Ví cá nhân, Quỹ nhà trọ, Vốn nhập hàng để quản lý tài chính chuẩn mực.
              </Text>
              <TouchableOpacity style={styles.promoBtn} onPress={bootstrapWallets} disabled={saving}>
                <Text style={styles.promoBtnText}>{saving ? 'Đang tạo...' : 'Khởi tạo ngay'}</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Add Form */}
          {showAdd && (
            <Card style={styles.addCard}>
              <Text style={styles.addTitle}>Thêm ví / Tài khoản mới</Text>
              <TextInput
                style={styles.input}
                placeholder="Tên ví (VD: BIDV cá nhân)"
                placeholderTextColor={Colors.textMuted}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
              />

              <Text style={styles.label}>Loại ví</Text>
              <View style={styles.typeRow}>
                {WALLET_TYPES.map((t) => (
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

              <View style={styles.addActions}>
                <TouchableOpacity style={styles.cancelAction} onPress={() => setShowAdd(false)}>
                  <Text style={styles.cancelActionText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveAction} onPress={handleCreate} disabled={saving}>
                  <Text style={styles.saveActionText}>{saving ? 'Đang tạo...' : 'Lưu ví'}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Wallets List */}
          {loading ? (
            <View style={{ gap: 10 }}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : wallets.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="wallet-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Chưa có ví nào được tạo</Text>
              <Text style={styles.emptySubtext}>Ấn nút + góc trên hoặc khởi tạo bộ ví mặc định</Text>
            </Card>
          ) : (
            wallets.map((wallet) => {
              const iconConfig = getWalletIcon(wallet.type);
              const isDefault = ['personal', 'rental', 'trading'].includes(wallet.type || '');
              return (
                <TouchableOpacity
                  key={wallet.id}
                  activeOpacity={0.7}
                  onPress={() => router.push({
                    pathname: '/transactions',
                    params: { walletId: wallet.id, walletName: wallet.name }
                  } as any)}
                >
                  <Card style={styles.walletCard}>
                    <View style={styles.walletHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                        <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                      </View>
                      <View style={{ flex: 1, paddingRight: 32 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.walletName}>{wallet.name}</Text>
                          {isDefault && (
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>Mặc định</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.walletType}>{getWalletTypeName(wallet.type)}</Text>
                      </View>
                    </View>

                    <View style={styles.balanceContainer}>
                      <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
                      <Text style={styles.balanceValue}>{formatMoney(wallet.balance ?? 0)}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.deleteBtn, { position: 'absolute', right: 14, top: 14 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(wallet.id, wallet.name);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  promoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 8,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  promoText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748b',
    lineHeight: 18,
  },
  promoBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  promoBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textWhite,
  },
  addCard: {
    padding: 16,
    gap: 12,
  },
  addTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semibold,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelAction: {
    padding: 10,
    borderRadius: 8,
  },
  cancelActionText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  saveAction: {
    padding: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveActionText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textWhite,
  },
  walletCard: {
    padding: 16,
    gap: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletName: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  walletType: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
  },
  balanceContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  balanceValue: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
