/**
 * TrọCare Tenant Mobile — Personal Finance Tab
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

export default function FinanceTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Add Transaction Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [txsRes, catsRes] = await Promise.all([
        apiGet<any>('/tenant/transactions'),
        apiGet<any>('/tenant/categories'),
      ]);
      setTransactions(txsRes?.data ?? txsRes ?? []);
      const cats = catsRes?.data ?? catsRes ?? [];
      setCategories(cats);
      
      // Select first category as default
      const defaultCat = cats.find((c: any) => c.type === 'expense');
      if (defaultCat) setCategoryId(defaultCat.id);
    } catch (err) {
      console.error('Error fetching finance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAddTransaction = async () => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số tiền chính xác.');
      return;
    }

    setSubmitting(true);
    try {
      await apiPost('/tenant/transactions', {
        categoryId,
        type,
        amount: Number(amount),
        description: description.trim() || undefined,
        date,
        source: 'manual',
      });
      
      Alert.alert('Thành công 🎉', 'Đã thêm giao dịch mới.');
      setModalVisible(false);
      
      // Reset form
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      
      onRefresh();
    } catch (err: any) {
      Alert.alert('Lỗi thêm giao dịch', err.message || 'Không thể tạo giao dịch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    Alert.alert('Xóa giao dịch', 'Bạn có chắc chắn muốn xóa giao dịch này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/tenant/transactions/${id}`);
            onRefresh();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa giao dịch.');
          }
        },
      },
    ]);
  };

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace(/\s/g, '');
  };

  // Calculate monthly stats
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const renderTransactionItem = ({ item }: { item: any }) => {
    const isExpense = item.type === 'expense';
    const cat = item.tenant_categories;
    const catColor = cat?.color || (isExpense ? Colors.danger : Colors.success);
    const catIcon = cat?.icon || (isExpense ? 'arrow-down-circle' : 'arrow-up-circle');

    return (
      <Card style={styles.txCard}>
        <View style={styles.txRow}>
          <View style={[styles.iconBox, { backgroundColor: `${catColor}12` }]}>
            <Ionicons name={catIcon as any} size={20} color={catColor} />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={styles.txDescription}>{item.description || cat?.name || 'Giao dịch'}</Text>
            <View style={styles.txSubRow}>
              <Text style={styles.txDate}>{item.date}</Text>
              {item.source === 'auto_invoice' && (
                <View style={styles.autoTag}>
                  <Text style={styles.autoTagText}>Tự động</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.txAmountSection}>
            <Text style={[styles.txAmount, { color: isExpense ? Colors.danger : Colors.success }]}>
              {isExpense ? '-' : '+'}{formatMoney(item.amount)}
            </Text>
            {item.source !== 'auto_invoice' && (
              <TouchableOpacity onPress={() => handleDeleteTransaction(item.id)} style={styles.btnDelete}>
                <Ionicons name="trash-outline" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 💰 Summary Board */}
      <View style={styles.summaryBoard}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Thu nhập</Text>
          <Text style={[styles.summaryVal, { color: Colors.success }]}>{formatMoney(totalIncome)}</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Chi tiêu</Text>
          <Text style={[styles.summaryVal, { color: Colors.danger }]}>{formatMoney(totalExpense)}</Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Số dư ròng</Text>
          <Text style={[styles.summaryVal, { color: netBalance >= 0 ? Colors.primary : Colors.danger }]}>
            {netBalance >= 0 ? '+' : ''}{formatMoney(netBalance)}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <View style={{ flex: 1 }}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>Lịch sử thu chi</Text>
          <TouchableOpacity style={styles.btnAdd} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.btnAddText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : transactions.length > 0 ? (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="wallet-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Chưa có giao dịch chi tiêu nào trong tháng.</Text>
          </View>
        )}
      </View>

      {/* ➕ Modal: Add Transaction */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm giao dịch mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              
              {/* Type Switcher */}
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
                  onPress={() => {
                    setType('expense');
                    const defaultCat = categories.find((c) => c.type === 'expense');
                    if (defaultCat) setCategoryId(defaultCat.id);
                  }}
                >
                  <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>Chi tiêu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
                  onPress={() => {
                    setType('income');
                    const defaultCat = categories.find((c) => c.type === 'income');
                    if (defaultCat) setCategoryId(defaultCat.id);
                  }}
                >
                  <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>Thu nhập</Text>
                </TouchableOpacity>
              </View>

              {/* Amount input */}
              <Input
                label="Số tiền (VND)"
                placeholder="Nhập số tiền"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                leftIcon={<Ionicons name="logo-usd" size={18} color="#64748B" />}
              />

              {/* Description */}
              <View style={{ marginTop: 12 }}>
                <Input
                  label="Mô tả / Ghi chú"
                  placeholder="Ăn trưa, xăng xe, mua sắm..."
                  value={description}
                  onChangeText={setDescription}
                  leftIcon={<Ionicons name="create-outline" size={18} color="#64748B" />}
                />
              </View>

              {/* Category selector */}
              <Text style={styles.fieldLabel}>Danh mục</Text>
              <View style={styles.catGrid}>
                {categories
                  .filter((cat) => cat.type === type)
                  .map((cat) => {
                    const isSelected = categoryId === cat.id;
                    const cColor = cat.color || Colors.primary;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catItem,
                          isSelected && { borderColor: cColor, backgroundColor: `${cColor}08` }
                        ]}
                        onPress={() => setCategoryId(cat.id)}
                      >
                        <Ionicons name={cat.icon || 'star-outline'} size={18} color={cColor} />
                        <Text style={[styles.catName, isSelected && { color: cColor, fontFamily: Typography.fontFamily.bold }]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Date */}
              <View style={{ marginTop: 12 }}>
                <Input
                  label="Ngày ghi nhận (yyyy-mm-dd)"
                  placeholder="2026-05-31"
                  value={date}
                  onChangeText={setDate}
                  leftIcon={<Ionicons name="calendar-outline" size={18} color="#64748B" />}
                />
              </View>

              <Button
                title="Lưu giao dịch"
                onPress={handleAddTransaction}
                loading={submitting}
                style={{ marginTop: 24 }}
              />

            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  summaryBoard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    shadowColor: 'rgba(15, 23, 42, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.15,
  },
  summaryVal: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.extrabold,
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAEAEF',
    alignSelf: 'center',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listHeaderTitle: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnAddText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  txCard: {
    marginBottom: 10,
    padding: 12,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDescription: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  txDate: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
  },
  autoTag: {
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 113, 227, 0.15)',
  },
  autoTagText: {
    fontSize: 9.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  txAmountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txAmount: {
    fontSize: 14.5,
    fontFamily: Typography.fontFamily.extrabold,
  },
  btnDelete: {
    padding: 4,
  },

  /* Modal Form styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEF',
  },
  modalTitle: {
    fontSize: 16.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  modalForm: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEF',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  typeBtnActiveExpense: {
    backgroundColor: Colors.danger,
  },
  typeBtnActiveIncome: {
    backgroundColor: Colors.success,
  },
  typeBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    backgroundColor: '#FFFFFF',
  },
  catName: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
});
