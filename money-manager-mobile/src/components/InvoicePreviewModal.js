import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme';
import { formatCurrency } from '../utils/format';
import TopAppBar from './ui/TopAppBar';
import SurfaceCard from './ui/SurfaceCard';

const buildWalletetQrValue = (amount, month, year, config) => {
  if (!config?.bank_id || !config?.account_no) return 'https://vietqr.io';
  return `https://qr.sepay.vn/img?bank=${config.bank_id}&acc=${config.account_no}&template=compact&amount=${amount}&des=Tien+Phong+T${month}/${year}`;
};

export default function InvoicePreviewModal({
  visible,
  invoice,
  bankConfig,
  onClose,
  onEdit,
  onDelete,
  onPay,
}) {
  const invoiceViewRef = useRef(null);

  if (!invoice) return null;

  const handleShare = async () => {
    try {
      const uri = await captureRef(invoiceViewRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Chia sẻ hóa đơn' });
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể chia sẻ hóa đơn: ' + e.message);
    }
  };

  const itemsTotal = (invoice.items || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const vietQrValue = buildWalletetQrValue(
    Math.round(invoice.total_amount || 0),
    invoice.month,
    invoice.year,
    bankConfig
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={s.root}>
        <TopAppBar
          title={`Hóa đơn - Phòng ${invoice.room_name}`}
          subtitle={`Tháng ${invoice.month}/${invoice.year}`}
          onBack={onClose}
          rightIcon="share-social-outline"
          onRightPress={handleShare}
          light
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View ref={invoiceViewRef} collapsable={false} style={s.paper}>
            <Text style={s.title}>Thông báo tiền phòng T{invoice.month}/{invoice.year}</Text>
            
            <View style={s.infoBox}>
              <Text style={s.infoLine}>Người thuê: <Text style={s.bold}>{invoice.tenant_name}</Text></Text>
              <Text style={s.infoLine}>Phòng: <Text style={s.bold}>{invoice.room_name}</Text></Text>
              <Text style={s.infoLine}>Ngày lập: {new Date().toLocaleDateString('vi-VN')}</Text>
            </View>

            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.col, { flex: 2 }]}>Khoản thu</Text>
                <Text style={[s.col, { flex: 3 }]}>Chi tiết</Text>
                <Text style={[s.col, { flex: 2, textAlign: 'right' }]}>Số tiền</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.cell, { flex: 2 }]}>Tiền phòng</Text>
                <Text style={[s.cell, { flex: 3 }]}>Cố định</Text>
                <Text style={[s.cell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(invoice.room_fee)}</Text>
              </View>
              {(invoice.items || []).map((item, idx) => (
                <View key={idx} style={s.tableRow}>
                  <Text style={[s.cell, { flex: 2 }]}>{item.name}</Text>
                  <Text style={[s.cell, { flex: 3 }]}>{item.detail}</Text>
                  <Text style={[s.cell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TỔNG CỘNG:</Text>
              <Text style={s.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
            </View>

            {invoice.paid_amount > 0 && (
              <View style={s.paidRow}>
                <Text style={s.paidLabel}>Đã thanh toán:</Text>
                <Text style={s.paidValue}>{formatCurrency(invoice.paid_amount)}</Text>
              </View>
            )}

            <View style={s.footer}>
              <View style={{ flex: 1 }}>
                <Text style={s.bankTitle}>Thông tin thanh toán:</Text>
                <Text style={s.bankText}>{bankConfig?.bank_id || 'N/A'}</Text>
                <Text style={s.bankText}>{bankConfig?.account_no || 'N/A'}</Text>
                <Text style={s.bankText}>{bankConfig?.account_name || 'N/A'}</Text>
              </View>
              <View style={s.qrWrap}>
                {bankConfig?.qr_uri ? (
                  <Image source={{ uri: bankConfig.qr_uri }} style={s.qr} />
                ) : (
                  <QRCode value={vietQrValue} size={80} />
                )}
              </View>
            </View>
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.btnDelete} onPress={() => onDelete(invoice)}>
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              <Text style={s.btnDeleteText}>Xóa</Text>
            </TouchableOpacity>

            {invoice.status !== 'paid' && (
              <>
                <TouchableOpacity style={s.btnEdit} onPress={onEdit}>
                  <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={s.btnEditText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnPay} onPress={onPay}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                  <Text style={s.btnPayText}>Thu tiền</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  content: { padding: 16, paddingBottom: 48 },
  paper: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 20,
    ...SHADOW.md,
  },
  title: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold, textAlign: 'center', marginBottom: 20 },
  infoBox: { marginBottom: 20, gap: 4 },
  infoLine: { fontSize: 13, color: COLORS.textSecondary },
  bold: { ...FONTS.bold, color: COLORS.textPrimary },
  table: { borderTopWidth: 1, borderTopColor: COLORS.borderSoft, marginTop: 10 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft },
  col: { fontSize: 11, color: COLORS.textMuted, ...FONTS.bold },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderSoft },
  cell: { fontSize: 12, color: COLORS.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 10, borderTopWidth: 2, borderTopColor: COLORS.primary },
  totalLabel: { fontSize: 15, ...FONTS.bold, color: COLORS.textPrimary },
  totalValue: { fontSize: 18, ...FONTS.bold, color: COLORS.primary },
  paidRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  paidLabel: { fontSize: 13, color: COLORS.success, ...FONTS.bold },
  paidValue: { fontSize: 13, color: COLORS.success, ...FONTS.bold },
  footer: { flexDirection: 'row', marginTop: 30, gap: 16, alignItems: 'center' },
  bankTitle: { fontSize: 12, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  bankText: { fontSize: 12, color: COLORS.textSecondary },
  qrWrap: { padding: 6, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderSoft },
  qr: { width: 80, height: 80 },
  actions: { flexDirection: 'row', marginTop: 24, gap: 12 },
  btnDelete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger },
  btnDeleteText: { color: COLORS.danger, fontSize: 13, ...FONTS.bold },
  btnEdit: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  btnEditText: { color: COLORS.textSecondary, fontSize: 13, ...FONTS.bold },
  btnPay: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
  btnPayText: { color: '#fff', fontSize: 14, ...FONTS.bold },
});
