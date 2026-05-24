/**
 * TrọCare Mobile — Transaction Ledger Screen (Redesigned like MoMo App)
 * Designed under Senior UI/UX guidelines:
 * - Gorgeous header gradient panel with circular glowing shapes (Trắng & Xanh style).
 * - Total Balance (Số dư ví) card with eye toggle to hide/show balance.
 * - Quick action buttons: Ghi chép (Record), Hạng mục (Categories), Báo cáo (Reports).
 * - Monthly summary box showing Income (+), Expense (-) and Net Flow.
 * - Grouped chronological transaction timeline (Grouped by Date) inside porcelain cards.
 * - Direct swipe-like delete transactions action.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { loadTransactions, deleteTransaction, formatMoney, loadWallets } from '@/lib/rentalOps';

export default function TransactionsScreen() {
  const router = useRouter();
  const { walletId, walletName } = useLocalSearchParams<{ walletId?: string; walletName?: string }>();
  
  // States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Wallet states
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  // MoMo interactive states
  const [showBalance, setShowBalance] = useState(true);

  // Deleting State
  const [deletingTx, setDeletingTx] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchTransactions = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true);
      else setLoading(true);

      const list = await loadTransactions(activeWalletId || undefined);
      setTransactions(list);
    } catch (e: any) {
      showToast(e?.message || 'Không tải được lịch sử thu chi.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load wallets on mount
  useEffect(() => {
    loadWallets().then(setWallets).catch(() => {});
  }, []);

  // Sync route walletId param with active filter
  useEffect(() => {
    setActiveWalletId(walletId || null);
  }, [walletId]);

  // Fetch transactions when active wallet filter changes
  useEffect(() => {
    fetchTransactions();
  }, [activeWalletId]);

  const handleDeletePress = (tx: any) => {
    setDeletingTx(tx);
  };

  const confirmDelete = async () => {
    if (!deletingTx) return;

    try {
      setActionLoading(true);
      await deleteTransaction(deletingTx.id);
      showToast('Xóa giao dịch thành công!', 'success');
      setDeletingTx(null);
      fetchTransactions();
      // Reload wallets to update balance
      loadWallets().then(setWallets).catch(() => {});
    } catch (e: any) {
      showToast(e?.message || 'Không thể xóa giao dịch.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculations
  const metrics = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amt = Math.round(Number(tx.amount || 0));
        if (tx.type === 'income') {
          acc.income += amt;
        } else if (tx.type === 'expense') {
          acc.expense += amt;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const netFlow = metrics.income - metrics.expense;
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  }, [wallets]);

  // Filtering list
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter === 'income') return tx.type === 'income';
      if (filter === 'expense') return tx.type === 'expense';
      return true;
    });
  }, [transactions, filter]);

  // MoMo Date Grouping Algorithm
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { date: string; items: any[]; income: number; expense: number }> = {};
    
    filtered.forEach((tx) => {
      if (!tx.date) return;
      
      const dateObj = new Date(tx.date);
      const dateKey = tx.date.split('T')[0]; // YYYY-MM-DD
      
      if (!groups[dateKey]) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        let displayDate = '';
        if (dateKey === today) {
          displayDate = 'Hôm nay';
        } else if (dateKey === yesterday) {
          displayDate = 'Hôm qua';
        } else {
          displayDate = `Ngày ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
        }
        
        groups[dateKey] = {
          date: displayDate,
          items: [],
          income: 0,
          expense: 0,
        };
      }
      
      groups[dateKey].items.push(tx);
      const amt = Math.round(Number(tx.amount || 0));
      if (tx.type === 'income') {
        groups[dateKey].income += amt;
      } else {
        groups[dateKey].expense += amt;
      }
    });
    
    // Sort groups by date descending
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => groups[key]);
  }, [filtered]);

  const activeWallet = wallets.find((w) => w.id === activeWalletId);
  const currentWalletName = activeWallet ? activeWallet.name : (activeWalletId ? walletName : null);

  return (
    <SafeAreaView style={styles.safe}>
      <Tabs.Screen
        options={{
          headerShown: false, // Custom MoMo header covers it
        }}
      />
      <StatusBar barStyle="light-content" />

      {/* 👑 MoMo-Style Premium Sky-Blue Header */}
      <View style={styles.momoHeader}>
        <View style={styles.glowOrb} />
        
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerGreeting}>Xin chào Chủ trọ</Text>
            <Text style={styles.headerAppName}>Quản lý Sổ quỹ TrọCare</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push('/transactions/categories')} style={styles.headerIconBtn}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 💳 MoMo-style Total Balance Card */}
        <View style={[styles.momoWalletCard, { shadowColor: Colors.primary }]}>
          <View style={styles.walletHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="wallet-outline" size={16} color="#64748B" />
              <Text style={styles.walletTitle}>Tổng số dư khả dụng</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={styles.eyeBtn}>
              <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.walletBalance}>
            {showBalance ? formatMoney(totalBalance) : '******'}
          </Text>

          <View style={styles.walletDivider} />

          {/* ⚡ Quick Action Grid inside Wallet */}
          <View style={styles.quickActions}>
            <TouchableOpacity onPress={() => router.push('/transactions/new')} style={styles.actionBtn}>
              <View style={[styles.actionIconBg, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="add" size={22} color="#0071e3" />
              </View>
              <Text style={styles.actionText}>Ghi thu chi</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/transactions/categories')} style={styles.actionBtn}>
              <View style={[styles.actionIconBg, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="grid-outline" size={18} color="#0071e3" />
              </View>
              <Text style={styles.actionText}>Hạng mục</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(tabs)/reports')} style={styles.actionBtn}>
              <View style={[styles.actionIconBg, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="bar-chart-outline" size={18} color="#0071e3" />
              </View>
              <Text style={styles.actionText}>Xem báo cáo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Container */}
      <View style={styles.container}>
        
        {/* Summary Monthly Panel (Floating box style) */}
        <View style={styles.summaryPanel}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemTitleRow}>
                <View style={[styles.indicatorDot, { backgroundColor: '#0D9488' }]} />
                <Text style={styles.summaryLabel}>Tổng thu</Text>
              </View>
              <Text style={[styles.summaryValue, { color: '#0D9488' }]}>
                +{formatMoney(metrics.income)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryItemTitleRow}>
                <View style={[styles.indicatorDot, { backgroundColor: '#F43F5E' }]} />
                <Text style={styles.summaryLabel}>Tổng chi</Text>
              </View>
              <Text style={[styles.summaryValue, { color: '#F43F5E' }]}>
                -{formatMoney(metrics.expense)}
              </Text>
            </View>
          </View>
          
          <View style={styles.netSummaryRow}>
            <Text style={styles.netSummaryLabel}>Thực nhận chu kỳ này:</Text>
            <Text style={[styles.netSummaryValue, { color: netFlow >= 0 ? '#0D9488' : '#F43F5E' }]}>
              {netFlow >= 0 ? '+' : ''}{formatMoney(netFlow)}
            </Text>
          </View>
        </View>

        {/* Horizontal Wallets Filter chips */}
        {wallets.length > 0 && (
          <View style={styles.walletChipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.walletFilterScroll}>
              <TouchableOpacity
                style={[styles.walletChip, activeWalletId === null && styles.walletChipActive]}
                onPress={() => setActiveWalletId(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="card" size={12} color={activeWalletId === null ? '#fff' : '#64748B'} />
                <Text style={[styles.walletChipText, activeWalletId === null && styles.walletChipTextActive]}>
                  Tất cả tài khoản
                </Text>
              </TouchableOpacity>
              {wallets.map((w) => {
                const isActive = activeWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.walletChip, isActive && styles.walletChipActive]}
                    onPress={() => setActiveWalletId(w.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="wallet-outline" size={12} color={isActive ? '#fff' : '#64748B'} />
                    <Text style={[styles.walletChipText, isActive && styles.walletChipTextActive]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* MoMo-style Filter tabs (Tất cả, Thu nhập, Chi phí) */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.tab, filter === 'all' && styles.tabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'income' && styles.tabActive]}
            onPress={() => setFilter('income')}
          >
            <Text style={[styles.tabText, filter === 'income' && styles.tabTextActive]}>Khoản Thu (+)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'expense' && styles.tabActive]}
            onPress={() => setFilter('expense')}
          >
            <Text style={[styles.tabText, filter === 'expense' && styles.tabTextActive]}>Khoản Chi (-)</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải sổ quỹ thu chi...</Text>
          </View>
        ) : (
          <FlatList
            data={groupedTransactions}
            keyExtractor={(item, idx) => idx.toString()}
            refreshing={refreshing}
            onRefresh={() => fetchTransactions(true)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Sổ quỹ trống</Text>
                <Text style={styles.emptyDesc}>Chưa ghi nhận giao dịch thu chi nào phù hợp.</Text>
              </View>
            }
            renderItem={({ item: group }) => (
              <View style={styles.groupContainer}>
                {/* 📅 Group Date Header */}
                <View style={styles.groupHeader}>
                  <Text style={styles.groupDateText}>{group.date}</Text>
                  <View style={styles.groupHeaderSummary}>
                    {group.income > 0 && (
                      <Text style={[styles.groupSummaryText, { color: '#0D9488' }]}>
                        +{formatMoney(group.income)}
                      </Text>
                    )}
                    {group.expense > 0 && (
                      <Text style={[styles.groupSummaryText, { color: '#F43F5E' }]}>
                        -{formatMoney(group.expense)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Group Transactions Items List inside porcelain Card */}
                <Card style={[styles.groupItemsCard, { shadowColor: '#94A3B8' }]}>
                  {group.items.map((item, idx) => {
                    const isIncome = item.type === 'income';
                    const catColor = item.category_color || (isIncome ? Colors.successDark : Colors.danger);
                    const catBg = item.category_color ? `${item.category_color}10` : (isIncome ? 'rgba(13, 148, 136, 0.08)' : 'rgba(244, 63, 94, 0.08)');

                    return (
                      <View key={item.id}>
                        <TouchableOpacity
                          style={styles.txRow}
                          onPress={() => {
                            // Quick details display
                            Alert.alert(
                              'Chi tiết giao dịch',
                              `Mô tả: ${item.description || (isIncome ? 'Thu nhập' : 'Chi phí')}\n` +
                              `Số tiền: ${formatMoney(item.amount)}\n` +
                              `Tài khoản ví: ${item.wallet_name || 'Mặc định'}\n` +
                              `Loại danh mục: ${item.category_name || 'Chưa phân loại'}\n` +
                              `Ngày giao dịch: ${new Date(item.date).toLocaleDateString('vi-VN')}`
                            );
                          }}
                          onLongPress={() => handleDeletePress(item)}
                          activeOpacity={0.7}
                        >
                          {/* Circle Icon Badge */}
                          <View style={[styles.txIconContainer, { backgroundColor: catBg }]}>
                            {item.category_icon ? (
                              <Text style={styles.txIconText}>{item.category_icon}</Text>
                            ) : (
                              <Ionicons
                                name={isIncome ? 'arrow-down' : 'arrow-up'}
                                size={16}
                                color={catColor}
                              />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.txDesc} numberOfLines={1}>
                              {item.description || (isIncome ? 'Thu tiền phòng/dịch vụ' : 'Chi phí nội bộ')}
                            </Text>
                            <View style={styles.txMeta}>
                              <Text style={styles.txWallet}>{item.wallet_name || 'Ví quỹ'}</Text>
                              {item.category_name && (
                                <>
                                  <Text style={styles.dot}>·</Text>
                                  <Text style={[styles.txCategory, { color: catColor }]}>
                                    {item.category_name}
                                  </Text>
                                </>
                              )}
                            </View>
                          </View>

                          <View style={styles.rightContainer}>
                            <Text style={[styles.txAmount, { color: isIncome ? '#0D9488' : '#F43F5E' }]}>
                              {isIncome ? '+' : '-'}{formatMoney(item.amount)}
                            </Text>
                            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePress(item)}>
                              <Ionicons name="trash-outline" size={13} color={Colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {/* Thin separator */}
                        {idx < group.items.length - 1 && <View style={styles.txSeparator} />}
                      </View>
                    );
                  })}
                </Card>
              </View>
            )}
          />
        )}
      </View>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        visible={!!deletingTx}
        title="Xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch ${deletingTx?.description || ''} trị giá ${formatMoney(deletingTx?.amount)}? Hành động này sẽ cập nhật lại số dư ví.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTx(null)}
        loading={actionLoading}
      />

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
  safe: { flex: 1, backgroundColor: '#F4F4F6' },
  container: { flex: 1 },

  /* 🌌 MoMo-Style Premium Curved Header */
  momoHeader: {
    backgroundColor: '#0071e3', // Deep Apple Blue background
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingHorizontal: 16,
    paddingBottom: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerGreeting: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.76)',
  },
  headerAppName: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 💳 MoMo-style Total Balance Card */
  momoWalletCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    position: 'absolute',
    bottom: -32,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semibold,
    color: '#64748B',
  },
  eyeBtn: {
    padding: 2,
  },
  walletBalance: {
    fontSize: 22,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    marginVertical: 10,
    letterSpacing: -0.5,
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#F4F4F6',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  actionIconBg: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },

  /* Summary Monthly Box */
  summaryPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 48,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F4F4F6',
    marginHorizontal: 14,
  },
  netSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F4F4F6',
    marginTop: 10,
    paddingTop: 10,
  },
  netSummaryLabel: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#334155',
  },
  netSummaryValue: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
  },

  /* Wallet Chips Section */
  walletChipsSection: {
    paddingVertical: 12,
    backgroundColor: '#F4F4F6',
  },
  walletFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAEAEF',
    gap: 6,
  },
  walletChipActive: {
    backgroundColor: '#0071e3',
    borderColor: '#0071e3',
  },
  walletChipText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  walletChipTextActive: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Filter Tabs (MoMo style) */
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEF',
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 11.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0071e3',
    fontFamily: Typography.fontFamily.bold,
  },

  /* Chronological Timeline Groups */
  list: {
    paddingHorizontal: 16,
    paddingBottom: 110, // Full scroll past footer
    gap: 14,
  },
  groupContainer: {
    gap: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  groupDateText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
  },
  groupHeaderSummary: {
    flexDirection: 'row',
    gap: 8,
  },
  groupSummaryText: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.bold,
  },
  groupItemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },

  /* Transaction Items Row */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    fontSize: 16,
  },
  txDesc: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  txWallet: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.semibold,
    color: '#94A3B8',
  },
  dot: {
    fontSize: 10,
    color: '#94A3B8',
    marginHorizontal: 4,
  },
  txCategory: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.semibold,
  },
  rightContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 10,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    letterSpacing: -0.2,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEF',
  },
  txSeparator: {
    height: 1,
    backgroundColor: '#F4F4F6',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
