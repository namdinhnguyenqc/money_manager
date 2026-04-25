import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { formatCurrency } from '../utils/format';
import { getInvoiceHistory, getInvoiceDetails, deleteInvoice, markInvoicePaid, addTransaction, getBankConfig, getWallets } from '../database/queries';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import CreateInvoiceSheet from '../components/CreateInvoiceSheet';
import { Alert } from 'react-native';
import { confirmDialog } from '../utils/dialogs';

// Reuse parts of InvoicesScreen detail view if possible, or create a streamlined version
export default function InvoiceHistoryScreen({ navigation, route }) {
  const { contractId, roomName } = route.params;
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvoiceHistory(contractId);
      setHistory(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const openInvoiceDetail = async (invoiceId) => {
    const detail = await getInvoiceDetails(invoiceId);
    setViewingInvoice(detail);
  };

  const getStatusLabel = (status) => {
    if (status === 'paid') return { label: 'Đã thu', color: COLORS.secondary, bg: COLORS.successLight };
    if (status === 'partially_paid') return { label: 'Thu thiếu', color: '#d97706', bg: COLORS.warningLight };
    return { label: 'Chờ thu', color: COLORS.warning, bg: COLORS.warningLight };
  };

  const renderItem = ({ item }) => {
    const status = getStatusLabel(item.status);
    return (
      <SurfaceCard tone="lowest" style={styles.invoiceCard} onPress={() => openInvoiceDetail(item.id)}>
        <View style={styles.cardMain}>
          <View>
            <Text style={styles.invoiceTitle}>Tháng {item.month}/{item.year}</Text>
            <Text style={styles.invoiceDate}>{item.created_at}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>
        {item.paid_amount > 0 && item.status !== 'paid' && (
          <View style={styles.partialInfo}>
            <Text style={styles.partialText}>Đã thu: {formatCurrency(item.paid_amount)}</Text>
          </View>
        )}
      </SurfaceCard>
    );
  };

  if (loading && !history.length) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <TopAppBar
        title={`Lịch sử: Phòng ${roomName}`}
        subtitle="Danh sách hóa đơn đã phát hành"
        onBack={() => navigation.goBack()}
        light
      />

      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>Chưa có hóa đơn nào cho phòng này</Text>
          </View>
        }
      />

      {/* Viewing Detail logic could be improved by sharing a component with InvoicesScreen */}
      {/* For now, I'll keep it simple or just navigate back to InvoicesScreen with a filter? 
          Actually, InvoicesScreen is month-based. HistoryScreen is room-based. 
          Let's just show a simple detail modal here too.
      */}
      {/* Reusing CreateInvoiceSheet for edit if needed */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  invoiceCard: { marginBottom: 12 },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.textPrimary },
  invoiceDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  amountBox: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, ...FONTS.bold, color: COLORS.primary, marginBottom: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, ...FONTS.bold },
  partialInfo: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.borderSoft, paddingTop: 8 },
  partialText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  emptyWrap: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted, ...FONTS.medium },
});
