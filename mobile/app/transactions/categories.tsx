/**
 * TrọCare Mobile — Categories Management Screen (Cấu hình danh mục thu chi)
 * CRUD interface for transaction categories.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { loadWallets, formatMoney } from '@/lib/rentalOps';

// Pre-configured custom emojis for categories
const EMOJI_PALETTE = [
  '💰', '🏠', '💡', '💧', '🚗', '🍔', '🎁', '🔧',
  '🛡️', '💼', '🗑️', '📶', '🩺', '🎓', '📈', '💬',
  '⚡', '🔑', '🧹', '📦', '🛏️', '🍽️', '🛒', '🎟️'
];

// Pre-configured premium color options
const COLOR_PALETTE = [
  '#6366f1', // Indigo/Primary
  '#059669', // Emerald Green
  '#dc2626', // Red
  '#d97706', // Amber/Orange
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#0d9488', // Teal
  '#475569'  // Slate Gray
];

export default function CategoriesScreen() {
  const router = useRouter();

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  // Selected tab: 'income' (Khoản thu) or 'expense' (Khoản chi)
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#6366f1');
  const [walletId, setWalletId] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, wRes] = await Promise.all([
        apiGet<any>('/categories'),
        loadWallets(),
      ]);

      setCategories(cRes?.data ?? []);
      setWallets(wRes);
      if (wRes.length > 0) {
        setWalletId(wRes[0].id);
      }
    } catch (e: any) {
      showToast(e?.message || 'Không thể tải danh sách danh mục.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCategory = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục.');
      return;
    }
    if (!walletId) {
      Alert.alert('Lỗi', 'Vui lòng chọn hoặc liên kết một tài khoản ví.');
      return;
    }

    try {
      setSubmitting(true);
      await apiPost<any>('/categories', {
        name: name.trim(),
        icon,
        color,
        type: activeTab,
        walletId,
      });

      showToast('Đã thêm danh mục mới thành công!', 'success');
      setName('');
      setShowAddForm(false);
      fetchData();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể tạo danh mục.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = (id: string, catName: string) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa danh mục "${catName}"? Tất cả giao dịch thuộc danh mục này sẽ chuyển về trạng thái không có danh mục.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete<any>(`/categories/${id}`);
              showToast('Đã xóa danh mục thành công!', 'success');
              fetchData();
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không thể xóa danh mục.');
            }
          },
        },
      ]
    );
  };

  const filteredCategories = categories.filter((c: any) => c.type === activeTab);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Cấu hình danh mục',
          headerBackTitle: 'Quay lại',
        }}
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.stateText}>Đang tải danh sách danh mục...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Premium segmented tab bar */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'income' && styles.tabBtnActiveIncome]}
                  onPress={() => {
                    setActiveTab('income');
                    setIcon('💰');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-down-circle"
                    size={16}
                    color={activeTab === 'income' ? '#fff' : Colors.successDark}
                  />
                  <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>
                    Danh mục Thu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'expense' && styles.tabBtnActiveExpense]}
                  onPress={() => {
                    setActiveTab('expense');
                    setIcon('🔧');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={16}
                    color={activeTab === 'expense' ? '#fff' : Colors.danger}
                  />
                  <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>
                    Danh mục Chi
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Add form toggler */}
              <TouchableOpacity
                style={styles.toggleFormBtn}
                onPress={() => setShowAddForm(!showAddForm)}
                activeOpacity={0.7}
              >
                <View style={styles.toggleFormLeft}>
                  <Ionicons
                    name={showAddForm ? 'close-circle-outline' : 'add-circle-outline'}
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.toggleFormText}>
                    {showAddForm ? 'Đóng trình tạo danh mục' : 'Tạo thêm danh mục mới'}
                  </Text>
                </View>
                <Ionicons
                  name={showAddForm ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>

              {/* Expandable Creation Form */}
              {showAddForm && (
                <Card style={styles.formCard}>
                  <Text style={styles.formTitle}>Thiết lập danh mục mới</Text>

                  {/* Input Name */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Tên danh mục *</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ví dụ: Tiền điện, Mua sắm nội thất, Quỹ đen..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Icon Selector Grid */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Biểu tượng (Icon) đại diện: {icon}</Text>
                    <View style={styles.emojiGrid}>
                      {EMOJI_PALETTE.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[
                            styles.emojiBtn,
                            icon === emoji && styles.emojiBtnActive,
                          ]}
                          onPress={() => setIcon(emoji)}
                        >
                          <Text style={styles.emojiText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Color Palette Selector */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Màu sắc chủ đề</Text>
                    <View style={styles.colorPalette}>
                      {COLOR_PALETTE.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.colorBtn,
                            { backgroundColor: c },
                            color === c && styles.colorBtnActive,
                          ]}
                          onPress={() => setColor(c)}
                        >
                          {color === c && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Wallet Picker */}
                  {wallets.length > 0 && (
                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Ví tài chính liên kết *</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.walletScroll}
                      >
                        {wallets.map((w) => {
                          const isSelected = walletId === w.id;
                          return (
                            <TouchableOpacity
                              key={w.id}
                              style={[
                                styles.walletChip,
                                isSelected && styles.walletChipActive,
                              ]}
                              onPress={() => setWalletId(w.id)}
                            >
                              <Ionicons
                                name="wallet-outline"
                                size={14}
                                color={isSelected ? Colors.primary : Colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.walletLabel,
                                  isSelected && styles.walletLabelActive,
                                ]}
                              >
                                {w.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Submit Button */}
                  <Button
                    title={submitting ? 'Đang tạo danh mục...' : 'Lưu danh mục'}
                    onPress={handleCreateCategory}
                    loading={submitting}
                    variant={activeTab === 'income' ? 'success' : 'primary'}
                    fullWidth
                    icon={<Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                  />
                </Card>
              )}

              {/* Categories list section */}
              <View style={styles.listSection}>
                <Text style={styles.sectionHeader}>
                  Danh mục hiện tại ({filteredCategories.length})
                </Text>

                {filteredCategories.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Ionicons name="folder-open-outline" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>Chưa có danh mục nào được tạo.</Text>
                    <Text style={styles.emptySubtext}>
                      Bấm vào nút "Tạo thêm danh mục mới" ở trên để bắt đầu thêm cấu hình.
                    </Text>
                  </Card>
                ) : (
                  <View style={styles.listContainer}>
                    {filteredCategories.map((cat: any) => {
                      const catColor = cat.color || (activeTab === 'income' ? Colors.successDark : Colors.danger);
                      const catBg = `${catColor}15`;

                      return (
                        <Card key={cat.id} style={styles.catRow}>
                          <View style={styles.catInfo}>
                            <View style={[styles.catIconWrapper, { backgroundColor: catBg }]}>
                              <Text style={styles.catIconText}>{cat.icon || '💬'}</Text>
                            </View>
                            <View>
                              <Text style={styles.catName}>{cat.name}</Text>
                              <Text style={styles.catSubtext}>
                                {cat.wallet_name || 'Ví liên kết'} ·{' '}
                                {activeTab === 'income' ? 'Khoản thu' : 'Khoản chi'}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteCategory(cat.id, cat.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                          </TouchableOpacity>
                        </Card>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabBtnActiveIncome: {
    backgroundColor: Colors.successDark,
  },
  tabBtnActiveExpense: {
    backgroundColor: Colors.danger,
  },
  tabText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
    fontFamily: Typography.fontFamily.bold,
  },
  toggleFormBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleFormLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleFormText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  formCard: {
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
  },
  formTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  formField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  emojiText: {
    fontSize: 18,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBtnActive: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  walletScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 6,
  },
  walletChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  walletLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  walletLabelActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  listSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconText: {
    fontSize: 18,
  },
  catName: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  catSubtext: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted,
    marginTop: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
