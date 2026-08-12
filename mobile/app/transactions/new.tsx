/**
 * TrọCare Mobile — Record Transaction Screen (Thu Chi)
 * Form fields:
 * - Segmented Type Selector: Thu nhập (Income) / Chi phí (Expense)
 * - Amount input with currency label
 * - Description input
 * - Dynamic Category picker (shows only categories matching active type)
 * - Wallet picker
 * - Transaction Date picker
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Toast from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';
import { loadWallets, createTransaction, formatMoney } from '@/lib/rentalOps';

export default function NewTransactionScreen() {
  const router = useRouter();

  // Loading States
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Dropdowns / Catalogs
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Form Inputs
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    function init() {
      setLoadError('');
      loadWallets().then((wRes) => {
        setWallets(wRes);
        if (wRes.length > 0) setWalletId(wRes[0].id);
      }).catch((error: any) => {
        setLoadError(error?.message || 'Chưa tải được danh sách ví. Bạn vẫn có thể nhập thông tin phiếu.');
      });

      apiGet<any>('/categories').then((cRes) => {
        const cats = cRes?.data ?? [];
        setCategories(cats);
        const matchingCats = cats.filter((c: any) => c.type === 'income');
        if (matchingCats.length > 0) setCategoryId(matchingCats[0].id);
      }).catch((error: any) => {
        setLoadError(error?.message || 'Chưa tải được danh mục. Bạn vẫn có thể nhập thông tin phiếu.');
      });
    }
    init();
  }, []);

  // Update category when transaction type toggles
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const matchingCats = categories.filter((c: any) => c.type === newType);
    if (matchingCats.length > 0) {
      setCategoryId(matchingCats[0].id);
    } else {
      setCategoryId('');
    }
  };

  const parseIsoDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parts = value.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (Number.isNaN(date.getTime())) return null;
    return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null;
  };

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả / lý do thu chi.');
      return;
    }
    if (!walletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ví thực hiện giao dịch.');
      return;
    }
    if (!parseIsoDate(date)) {
      Alert.alert('Ngày không hợp lệ', 'Ngày giao dịch phải có định dạng YYYY-MM-DD.');
      return;
    }

    try {
      setSubmitting(true);
      await createTransaction({
        type,
        amount: Number(amount),
        description: description.trim(),
        walletId,
        categoryId: categoryId || null,
        date,
      });

      showToast('Ghi nhận giao dịch thành công!', 'success');
      setTimeout(() => {
        router.replace('/transactions');
      }, 1000);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo giao dịch.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c: any) => c.type === type);
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  const amountDisplay = amount ? Number(amount).toLocaleString('vi-VN') : '';
  const quickAmounts = [100000, 500000, 1000000, 2000000];

  const updateAmount = (value: string) => {
    const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    setAmount(digits);
  };

  const categoryIcon = (name?: string): keyof typeof Ionicons.glyphMap => {
    const value = String(name || '').toLowerCase();
    if (value.includes('điện') || value.includes('nước')) return 'flash-outline';
    if (value.includes('sửa') || value.includes('bảo trì')) return 'construct-outline';
    if (value.includes('dịch vụ')) return 'receipt-outline';
    if (value.includes('lương')) return 'people-outline';
    if (value.includes('thuê')) return 'home-outline';
    return type === 'expense' ? 'cart-outline' : 'cash-outline';
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: type === 'expense' ? 'Tạo phiếu chi' : 'Tạo phiếu thu', headerBackTitle: 'Quay lại' }} />
      <SafeAreaView style={styles.container}>
        {dataLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateText}>Đang tải thông tin thiết lập...</Text>
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.form} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {loadError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="cloud-offline-outline" size={20} color="#B45309" />
                  <Text style={styles.errorBannerText}>{loadError}</Text>
                </View>
              ) : null}
              <View style={styles.typeSegment}>
                <TransactionTypeButton active={type === 'income'} icon="arrow-down-outline" label="Phiếu thu" onPress={() => handleTypeChange('income')} />
                <TransactionTypeButton active={type === 'expense'} icon="arrow-up-outline" label="Phiếu chi" danger onPress={() => handleTypeChange('expense')} />
              </View>

              <View style={[styles.amountPanel, type === 'expense' && styles.amountPanelExpense]}>
                <Text style={[styles.amountLabel, type === 'expense' && styles.amountLabelExpense]}>
                  {type === 'expense' ? 'SỐ TIỀN CHI' : 'SỐ TIỀN THU'}
                </Text>
                <View style={styles.amountInputRow}>
                  <TextInput
                    value={amountDisplay}
                    onChangeText={updateAmount}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    style={styles.amountInput}
                    maxLength={18}
                    autoFocus
                    accessibilityLabel={type === 'expense' ? 'Số tiền chi' : 'Số tiền thu'}
                  />
                  <Text style={styles.currency}>₫</Text>
                </View>
                <View style={styles.quickAmountRow}>
                  {quickAmounts.map((value) => (
                    <TouchableOpacity key={value} style={styles.quickAmount} onPress={() => setAmount(String(value))} activeOpacity={0.72}>
                      <Text style={styles.quickAmountText}>+{value >= 1000000 ? `${value / 1000000}tr` : `${value / 1000}k`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Nội dung giao dịch</Text>
                <Text style={styles.requiredHint}>Bắt buộc</Text>
              </View>
              <View style={styles.textField}>
                <Ionicons name="create-outline" size={19} color={Colors.textSecondary} />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={type === 'expense' ? 'Ví dụ: Sửa máy bơm, mua vật tư…' : 'Ví dụ: Thu tiền phòng tháng này…'}
                  placeholderTextColor="#64748B"
                  style={styles.textInput}
                  returnKeyType="done"
                />
              </View>

              {filteredCategories.length > 0 ? (
                <View style={styles.pickerSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Danh mục</Text>
                    <TouchableOpacity onPress={() => router.push('/transactions/categories')} style={styles.manageButton} activeOpacity={0.72}>
                      <Text style={styles.manageText}>Quản lý</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    {filteredCategories.map((cat) => {
                      const selected = categoryId === cat.id;
                      return (
                        <TouchableOpacity key={cat.id} style={[styles.categoryItem, selected && styles.categoryItemActive]} onPress={() => setCategoryId(cat.id)} activeOpacity={0.72}>
                          <View style={[styles.categoryIcon, selected && styles.categoryIconActive]}>
                            <Ionicons name={categoryIcon(cat.name)} size={20} color={selected ? Colors.primary : Colors.textSecondary} />
                          </View>
                          <Text style={[styles.categoryLabel, selected && styles.categoryLabelActive]} numberOfLines={1}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <View style={styles.detailsPanel}>
                <Text style={styles.sectionTitle}>Chi tiết phiếu</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}><Ionicons name="wallet-outline" size={19} color={Colors.primary} /></View>
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailLabel}>Nguồn tiền</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{selectedWallet ? `${selectedWallet.name} · ${formatMoney(selectedWallet.balance)}` : 'Chọn ví giao dịch'}</Text>
                  </View>
                </View>
                {wallets.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletScroll}>
                    {wallets.map((wallet) => (
                      <TouchableOpacity key={wallet.id} style={[styles.walletChip, walletId === wallet.id && styles.walletChipActive]} onPress={() => setWalletId(wallet.id)}>
                        <Text style={[styles.walletChipText, walletId === wallet.id && styles.walletChipTextActive]}>{wallet.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}><Ionicons name="calendar-outline" size={19} color={Colors.primary} /></View>
                  <View style={styles.detailCopy}>
                    <Text style={styles.detailLabel}>Ngày ghi nhận</Text>
                    <TextInput value={date} onChangeText={setDate} style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#64748B" />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={[styles.submitButton, submitting && styles.submitDisabled]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.82}>
                {submitting ? <ActivityIndicator color={Colors.textWhite} /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.textWhite} />
                    <Text style={styles.submitText}>{type === 'expense' ? 'Xác nhận chi tiền' : 'Xác nhận thu tiền'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}

function TransactionTypeButton({ active, icon, label, danger, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.segmentBtn, active && styles.segmentBtnActive]} onPress={onPress} activeOpacity={0.72} accessibilityState={{ selected: active }}>
      <View style={[styles.segmentIcon, active && (danger ? styles.segmentIconExpense : styles.segmentIconIncome)]}>
        <Ionicons name={icon} size={17} color={active ? (danger ? Colors.danger : Colors.successDark) : Colors.textMuted} />
      </View>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateTitle: { fontSize: 17, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  stateText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  errorBanner: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFF7ED' },
  errorBannerText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: Typography.fontFamily.medium, color: '#92400E' },
  form: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 16 },
  typeSegment: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 48,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: { backgroundColor: Colors.surface },
  segmentIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentIconIncome: { backgroundColor: Colors.successLight },
  segmentIconExpense: { backgroundColor: Colors.dangerLight },
  segmentText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.bold,
  },
  amountPanel: { overflow: 'hidden', borderRadius: 16, padding: 18, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#D6E4F5' },
  amountPanelExpense: { borderColor: '#F5D5DB' },
  amountLabel: { fontSize: 10.5, lineHeight: 14, fontFamily: Typography.fontFamily.bold, color: Colors.primary, letterSpacing: 0.6 },
  amountLabelExpense: { color: Colors.danger },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  amountInput: { flex: 1, minWidth: 0, padding: 0, fontSize: 34, lineHeight: 43, fontFamily: Typography.fontFamily.extrabold, color: Colors.textPrimary, letterSpacing: -0.8 },
  currency: { marginLeft: 7, fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  quickAmountRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  quickAmount: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F1F5F9' },
  quickAmountText: { fontSize: 11.5, fontFamily: Typography.fontFamily.semibold, color: Colors.textSecondary },
  sectionHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  requiredHint: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  textField: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2E8F0' },
  textInput: { flex: 1, paddingVertical: 12, fontSize: 13.5, fontFamily: Typography.fontFamily.regular, color: Colors.textPrimary },
  pickerSection: { gap: 10 },
  manageButton: { minHeight: 44, justifyContent: 'center', paddingLeft: 14 },
  manageText: { fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.primary },
  categoryScroll: { gap: 10, paddingRight: 20 },
  categoryItem: { width: 76, alignItems: 'center', gap: 7, paddingVertical: 10, borderRadius: 12 },
  categoryItemActive: { backgroundColor: '#EFF6FF' },
  categoryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2E8F0' },
  categoryIconActive: { borderColor: '#BFDBFE' },
  categoryLabel: { width: '100%', fontSize: 11, lineHeight: 15, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, textAlign: 'center' },
  categoryLabelActive: { color: Colors.primary, fontFamily: Typography.fontFamily.semibold },
  detailsPanel: { overflow: 'hidden', borderRadius: 16, paddingTop: 16, paddingHorizontal: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#E2E8F0' },
  detailRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 11, lineHeight: 15, fontFamily: Typography.fontFamily.medium, color: Colors.textMuted },
  detailValue: { marginTop: 3, fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50, backgroundColor: '#E2E8F0' },
  dateInput: { paddingVertical: 2, fontSize: 13, lineHeight: 18, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  walletScroll: { gap: 8, paddingLeft: 50, paddingBottom: 10 },
  walletChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 9, backgroundColor: '#F1F5F9' },
  walletChipActive: { backgroundColor: '#EAF3FF' },
  walletChipText: { fontSize: 11, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  walletChipTextActive: { color: Colors.primary, fontFamily: Typography.fontFamily.semibold },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 10 : 18, backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  submitButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: Colors.primary },
  submitDisabled: { opacity: 0.55 },
  submitText: { fontSize: 15, fontFamily: Typography.fontFamily.bold, color: Colors.textWhite },
});
