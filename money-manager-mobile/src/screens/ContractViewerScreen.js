import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Platform,
  TouchableOpacity, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { COLORS, RADIUS, FONTS, SHADOW } from '../theme';
import { formatCurrency } from '../utils/format';
import { useFocusEffect } from '@react-navigation/native';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import TerminateContractSheet from '../components/TerminateContractSheet';
import {
  getInvoicesByContractApi,
  getTransactionsApi,
  getWalletsApi,
  terminateContractApi,
} from '../services/rentalApiService';

// ─── Tab Bar ──────────────────────────────────────────────
const TABS = [
  { key: 'contract', label: 'Hợp đồng', icon: 'document-text-outline' },
  { key: 'invoices',  label: 'Hóa đơn',  icon: 'receipt-outline' },
  { key: 'transactions', label: 'Giao dịch', icon: 'swap-vertical-outline' },
];

// ─── Invoice Status ────────────────────────────────────────
function invoiceStatusColor(status) {
  if (status === 'paid') return { bg: '#e8f5e9', text: '#2e7d32', label: 'Đã thu' };
  if (status === 'partial') return { bg: '#fff8e1', text: '#f57f17', label: 'Đóng 1 phần' };
  if (status === 'overdue') return { bg: '#ffebee', text: '#c62828', label: 'Quá hạn' };
  return { bg: '#f5f5f5', text: '#757575', label: 'Chờ thu' };
}

export default function ContractViewerScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const { contract } = route.params;
  const viewRef = useRef(null);

  const [activeTab, setActiveTab] = useState('contract');
  const [invoices, setInvoices]   = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets]     = useState([]);
  const [loading, setLoading]     = useState(true);

  // Terminate sheet
  const [showTerminate, setShowTerminate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, txs, wals] = await Promise.all([
        getInvoicesByContractApi(contract.id).catch(() => []),
        getTransactionsApi({ contractId: contract.id }).catch(() => []),
        getWalletsApi().catch(() => []),
      ]);
      setInvoices(inv);
      setTransactions(txs);
      setWallets(wals);
    } catch (e) {
      console.error('ContractViewer load error:', e);
    } finally {
      setLoading(false);
    }
  }, [contract.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Chia sẻ hợp đồng' });
      }
    } catch (e) {
      Alert.alert('Lỗi', `Không thể xuất ảnh: ${e.message}`);
    }
  };

  const handleConfirmTerminate = async (data) => {
    await terminateContractApi(contract.id, { roomId: contract.room_id, ...data });
    setShowTerminate(false);
    Alert.alert('Thành công', 'Đã trả phòng thành công! Số dư ví đã được cập nhật.');
    navigation.goBack();
  };

  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;
  const today = new Date();
  const d = today.getDate(), m = today.getMonth() + 1, y = today.getFullYear();
  const isEnded = contract.status === 'ended';

  // ─── Tab Contents ────────────────────────────────────────
  const renderContract = () => (
    <View collapsable={false} ref={viewRef}>
      <SurfaceCard style={s.paper} tone="lowest">
        <Text style={s.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
        <Text style={s.nationalSub}>Độc lập - Tự do - Hạnh phúc</Text>
        <View style={s.line} />
        <Text style={s.contractTitle}>HỢP ĐỒNG THUÊ PHÒNG</Text>
        <Text style={s.text}>Hôm nay, ngày {d} tháng {m} năm {y}.</Text>
        <Text style={s.sectionTitle}>2. Bên thuê (Bên B)</Text>
        <Text style={s.text}>Họ tên: <Text style={s.bold}>{contract.tenant_name || '........................'}</Text></Text>
        <Text style={s.text}>Địa chỉ: {contract.tenant_address || '....'}</Text>
        <Text style={s.text}>CCCD: {contract.tenant_id_card || '....'}</Text>
        <Text style={s.text}>SĐT: {contract.tenant_phone || '....'}</Text>
        <Text style={s.sectionTitle}>Điều khoản</Text>
        <Text style={s.text}><Text style={s.bold}>Tiền phòng:</Text> {formatCurrency(contract.room_price || contract.rent_amount)}/tháng</Text>
        <Text style={s.text}><Text style={s.bold}>Tiền cọc:</Text> {formatCurrency(contract.deposit || contract.deposit_amount)}</Text>
        <Text style={s.text}>Hiệu lực từ {contract.start_date || '...'} đến {contract.end_date || 'không xác định'}</Text>
        <View style={s.footerRow}>
          <View style={s.signBox}><Text style={s.bold}>BÊN B</Text><View style={s.signSpace} /></View>
          <View style={s.signBox}><Text style={s.bold}>BÊN A</Text><View style={s.signSpace} /></View>
        </View>
      </SurfaceCard>
    </View>
  );

  const renderInvoices = () => (
    <View style={{ gap: 10 }}>
      {invoices.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="receipt-outline" size={40} color={COLORS.borderStrong} />
          <Text style={s.emptyText}>Chưa có hóa đơn nào</Text>
        </View>
      ) : invoices.map((inv) => {
        const st = invoiceStatusColor(inv.status);
        return (
          <SurfaceCard key={inv.id} tone="lowest" style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={s.invMonth}>Tháng {inv.month}/{inv.year}</Text>
                <Text style={s.invAmount}>{formatCurrency(inv.total_amount)}</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                <Text style={[s.statusPillText, { color: st.text }]}>{st.label}</Text>
              </View>
            </View>
            {inv.paid_amount > 0 && inv.status !== 'paid' && (
              <Text style={s.invPaid}>Đã đóng: {formatCurrency(inv.paid_amount)}</Text>
            )}
          </SurfaceCard>
        );
      })}
    </View>
  );

  const renderTransactions = () => (
    <View style={{ gap: 10 }}>
      {transactions.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="swap-vertical-outline" size={40} color={COLORS.borderStrong} />
          <Text style={s.emptyText}>Chưa có giao dịch nào</Text>
        </View>
      ) : transactions.map((tx) => (
        <SurfaceCard key={tx.id} tone="lowest" style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.txIcon, { backgroundColor: tx.type === 'income' ? '#e8f5e9' : '#ffebee' }]}>
              <Ionicons
                name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'}
                size={18}
                color={tx.type === 'income' ? '#2e7d32' : '#c62828'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.txDesc} numberOfLines={1}>{tx.description || 'Giao dịch'}</Text>
              <Text style={s.txDate}>{tx.date}</Text>
            </View>
            <Text style={[s.txAmount, { color: tx.type === 'income' ? '#2e7d32' : '#c62828' }]}>
              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
            </Text>
          </View>
        </SurfaceCard>
      ))}
    </View>
  );

  return (
    <View style={s.root}>
      {!isDesktopWeb && (
        <TopAppBar
          light
          title="Chi tiết Hợp đồng"
          subtitle={`${contract.tenant_name} · Phòng ${contract.room_name || ''}`}
          onBack={() => navigation.goBack()}
          rightIcon="share-social-outline"
          onRightPress={handleShare}
        />
      )}

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
              {tab.key === 'invoices' && invoices.length > 0 ? ` (${invoices.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.body}
        >
          {activeTab === 'contract'      && renderContract()}
          {activeTab === 'invoices'      && renderInvoices()}
          {activeTab === 'transactions'  && renderTransactions()}

          {/* Terminate Button — chỉ hiện khi HĐ còn active */}
          {!isEnded && (
            <TouchableOpacity
              style={s.terminateBtn}
              onPress={() => setShowTerminate(true)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={s.terminateBtnText}>Kết thúc hợp đồng</Text>
            </TouchableOpacity>
          )}

          {isEnded && (
            <View style={s.endedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#757575" />
              <Text style={s.endedText}>Hợp đồng đã kết thúc</Text>
            </View>
          )}
        </ScrollView>
      )}

      <TerminateContractSheet
        visible={showTerminate}
        room={{
          id: contract.room_id,
          name: contract.room_name || 'Phòng',
          tenant_name: contract.tenant_name,
          price: contract.room_price || contract.rent_amount,
          deposit: contract.deposit || contract.deposit_amount,
          contract_id: contract.id,
        }}
        invoices={invoices}
        wallets={wallets}
        onClose={() => setShowTerminate(false)}
        onConfirm={handleConfirmTerminate}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 12, paddingBottom: 48 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: COLORS.primary },
  tabLabel: { fontSize: 12, color: COLORS.textMuted, ...FONTS.semibold },
  tabLabelActive: { color: COLORS.primary, ...FONTS.bold },

  // Contract paper
  paper: { borderRadius: 8 },
  nationalTitle: { textAlign: 'center', color: COLORS.textPrimary, ...FONTS.bold, fontSize: 12 },
  nationalSub: { textAlign: 'center', color: COLORS.textPrimary, ...FONTS.bold, fontSize: 12, marginTop: 2 },
  line: { height: 1, backgroundColor: COLORS.textPrimary, width: 140, alignSelf: 'center', marginVertical: 12 },
  contractTitle: { textAlign: 'center', color: COLORS.textPrimary, ...FONTS.bold, fontSize: 17, marginBottom: 12 },
  sectionTitle: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 12, marginTop: 10, marginBottom: 4 },
  text: { color: COLORS.textPrimary, fontSize: 12, lineHeight: 18, marginBottom: 3, textAlign: 'justify' },
  bold: { ...FONTS.bold },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  signBox: { width: '45%', alignItems: 'center' },
  signSpace: { height: 56 },

  // Invoice tab
  invMonth: { fontSize: 14, color: COLORS.textPrimary, ...FONTS.bold },
  invAmount: { fontSize: 13, color: COLORS.textSecondary, ...FONTS.medium, marginTop: 2 },
  invPaid: { fontSize: 12, color: COLORS.textMuted, ...FONTS.medium, marginTop: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 11, ...FONTS.bold },

  // Transaction tab
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 13, color: COLORS.textPrimary, ...FONTS.semibold },
  txDate: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  txAmount: { fontSize: 14, ...FONTS.bold },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, ...FONTS.medium },

  // Terminate button
  terminateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#c62828', borderRadius: RADIUS.md,
    padding: 16, marginTop: 8, ...SHADOW.sm,
  },
  terminateBtnText: { color: '#fff', fontSize: 15, ...FONTS.bold },

  // Ended banner
  endedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.surfaceHigh, borderRadius: RADIUS.md, padding: 14,
  },
  endedText: { fontSize: 14, color: COLORS.textSecondary, ...FONTS.semibold },
});
