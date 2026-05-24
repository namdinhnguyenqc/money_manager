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
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { apiGet } from '@/lib/api';
import { loadWallets, createTransaction, formatMoney } from '@/lib/rentalOps';

export default function NewTransactionScreen() {
  const router = useRouter();

  // Loading States
  const [dataLoading, setDataLoading] = useState(true);
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
    async function init() {
      try {
        setDataLoading(true);
        setLoadError('');
        const [wRes, cRes] = await Promise.all([
          loadWallets(),
          apiGet<any>('/categories'),
        ]);

        setWallets(wRes);
        if (wRes.length > 0) setWalletId(wRes[0].id);

        const cats = cRes?.data ?? [];
        setCategories(cats);

        // Pre-select category of same type if available
        const matchingCats = cats.filter((c: any) => c.type === 'income');
        if (matchingCats.length > 0) setCategoryId(matchingCats[0].id);
      } catch (e: any) {
        setLoadError(e?.message || 'Không thể tải danh sách ví và danh mục.');
      } finally {
        setDataLoading(false);
      }
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

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Lập phiếu thu chi', headerBackTitle: 'Quay lại' }} />
      <SafeAreaView style={styles.container}>
        {dataLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateText}>Đang tải thông tin thiết lập...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle-outline" size={42} color={Colors.danger} />
            <Text style={styles.stateTitle}>Lỗi tải dữ liệu</Text>
            <Text style={styles.stateText}>{loadError}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Segmented Type Controller */}
            <View style={styles.typeSegment}>
              <TouchableOpacity
                style={[styles.segmentBtn, type === 'income' && styles.segmentBtnActiveIncome]}
                onPress={() => handleTypeChange('income')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down-circle" size={18} color={type === 'income' ? Colors.textWhite : Colors.successDark} />
                <Text style={[styles.segmentText, type === 'income' && styles.segmentTextActive]}>
                  Phiếu thu (Cộng tiền)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, type === 'expense' && styles.segmentBtnActiveExpense]}
                onPress={() => handleTypeChange('expense')}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up-circle" size={18} color={type === 'expense' ? Colors.textWhite : Colors.danger} />
                <Text style={[styles.segmentText, type === 'expense' && styles.segmentTextActive]}>
                  Phiếu chi (Trừ tiền)
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Số tiền thu chi *"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              required
              icon={<Ionicons name="cash-outline" size={18} color={Colors.textMuted} />}
            />

            <Input
              label="Mô tả / Nội dung giao dịch *"
              value={description}
              onChangeText={setDescription}
              placeholder="Ví dụ: Mua bóng đèn hành lang trọ, thu tiền vệ sinh..."
              required
              icon={<Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />}
            />

            {/* Dynamic Category Chips Picker */}
            {filteredCategories.length > 0 && (
              <View style={styles.pickerSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Danh mục thu chi</Text>
                  <TouchableOpacity 
                    onPress={() => router.push('/transactions/categories')}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={14} color={Colors.primary} />
                    <Text style={{ fontSize: 12, fontFamily: Typography.fontFamily.semibold, color: Colors.primary }}>
                      Thiết lập
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {filteredCategories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    const catColor = cat.color || (type === 'income' ? Colors.successDark : Colors.danger);
                    const catBg = cat.color ? `${cat.color}15` : (type === 'income' ? '#eafbf2' : '#fdf2f2');
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chipItem,
                          isSelected && { borderColor: catColor, backgroundColor: catBg },
                        ]}
                        onPress={() => setCategoryId(cat.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.chipIcon}>{cat.icon || '💬'}</Text>
                        <Text
                          style={[
                            styles.chipLabel,
                            isSelected && { color: catColor, fontFamily: Typography.fontFamily.bold },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Wallet Selection */}
            {wallets.length > 0 && (
              <View style={styles.pickerSection}>
                <Text style={styles.fieldLabel}>Quỹ ví giao dịch *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {wallets.map((w) => {
                    const isSelected = walletId === w.id;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.chipItem, isSelected && styles.chipItemActiveWallet]}
                        onPress={() => setWalletId(w.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="wallet-outline" size={15} color={isSelected ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.chipLabel, isSelected && styles.chipLabelActiveWallet]}>
                          {w.name} ({formatMoney(w.balance)})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Input
              label="Ngày lập phiếu (YYYY-MM-DD) *"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              required
              icon={<Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />}
            />

            <View style={{ height: 16 }} />

            <Button
              title={submitting ? 'Đang tạo giao dịch...' : 'Ghi nhận sổ quỹ'}
              onPress={handleSubmit}
              variant={type === 'income' ? 'success' : 'primary'}
              size="lg"
              fullWidth
              loading={submitting}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.textWhite} />}
            />
          </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateTitle: { fontSize: 17, fontFamily: Typography.fontFamily.semibold, color: Colors.textPrimary },
  stateText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },
  typeSegment: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  segmentBtnActiveIncome: {
    backgroundColor: Colors.successDark,
  },
  segmentBtnActiveExpense: {
    backgroundColor: Colors.danger,
  },
  segmentText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textWhite,
    fontFamily: Typography.fontFamily.bold,
  },
  pickerSection: {
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 13, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, marginBottom: 8 },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  chipItemActiveWallet: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipLabelActiveWallet: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
});
