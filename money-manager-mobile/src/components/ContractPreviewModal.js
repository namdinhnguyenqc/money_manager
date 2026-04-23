import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { COLORS, SHADOW, RADIUS, FONTS } from '../theme';
import { formatCurrency } from '../utils/format';

export default function ContractPreviewModal({ visible, data, room, onClose, onConfirm }) {
  const { width } = useWindowDimensions();
  const contractRef = useRef(null);

  if (!visible || !data) return null;

  const handleShare = async () => {
    try {
      const uri = await captureRef(contractRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Chia sẻ hợp đồng với người thuê' });
      } else {
        Alert.alert('Thông báo', 'Thiết bị không hỗ trợ chia sẻ.');
      }
    } catch (e) {
      Alert.alert('Lỗi', `Không thể xuất ảnh hợp đồng: ${e.message}`);
    }
  };

  const now = new Date();
  const isWeb = Platform.OS === 'web';
  const contentWidth = width >= 1440 ? 1180 : width >= 1180 ? 1080 : 920;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={[styles.header, isWeb && styles.headerWeb]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hợp đồng thuê phòng</Text>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View ref={contractRef} style={[styles.contractPage, isWeb && styles.contractPageWeb, { maxWidth: contentWidth }]} collapsable={false}>
            <View style={styles.legalHeader}>
              <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
              <Text style={styles.nationalSub}>Độc lập - Tự do - Hạnh phúc</Text>
              <View style={styles.legalLine} />
            </View>

            <Text style={styles.contractMainTitle}>HỢP ĐỒNG THUÊ PHÒNG</Text>

            <Text style={styles.textBody}>
              Hôm nay, {now.getDate()}/{now.getMonth() + 1}/{now.getFullYear()}, tại địa chỉ 60/7/4A Đường số 4, phường Thủ Đức, TP. Hồ Chí Minh.
            </Text>
            <Text style={styles.textBody}>Các bên tham gia:</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>1. Bên cho thuê (Bên A)</Text>
              <Text style={styles.infoLine}>Họ tên: <Text style={styles.boldText}>Nguyen Dinh Ha Nam</Text> - Ngày sinh: 26/11/1999</Text>
              <Text style={styles.infoLine}>Địa chỉ đăng ký: 90 Nguyen Van Cu, Phuong Tuy Hoa, Tinh Dak Lak</Text>
              <Text style={styles.infoLine}>Số CCCD/CMND: 054099004728 cấp ngày 21/01/2025 bởi Bộ Công an</Text>
              <Text style={styles.infoLine}>Điện thoại: 0927368772</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>2. Bên thuê (Bên B)</Text>
              <Text style={styles.infoLine}>Họ tên: <Text style={styles.boldText}>{(data.tenantName || '................').toUpperCase()}</Text></Text>
              <Text style={styles.infoLine}>Địa chỉ thường trú: {data.address || '................'}</Text>
              <Text style={styles.infoLine}>Số CCCD/CMND: {data.idCard || '................'}</Text>
              <Text style={styles.infoLine}>Điện thoại: {data.phone || '................'}</Text>
            </View>

            <View style={[styles.financeGrid, isWeb && styles.financeGridWeb]}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>3. Điều khoản tài chính</Text>
                <Text style={styles.textBody}>Tiền phòng: <Text style={styles.boldText}>{formatCurrency(room?.price)}/tháng</Text></Text>
                <Text style={styles.textBody}>Phương thức thanh toán: Chuyển khoản hoặc tiền mặt</Text>
                <Text style={styles.textBody}>Điện: 3400 VND/kWh (phòng thường) hoặc 4000 VND/kWh (phòng có máy lạnh)</Text>
                <Text style={styles.textBody}>Nước: 13,100 VND/người/tháng</Text>
                <Text style={styles.textBody}>Phí rác: 36.500 VNĐ/tháng</Text>
                <Text style={styles.textBody}>Tiền cọc: <Text style={styles.boldText}>{formatCurrency(data.deposit)}</Text></Text>
                <Text style={styles.textBody}>Hợp đồng có hiệu lực từ {data.startDate} đến {data.endDate || '........'}</Text>
              </View>

              <View style={styles.summaryPanel}>
                <Text style={styles.summaryEyebrow}>TÓM TẮT HỢP ĐỒNG</Text>
                <Text style={styles.summaryLine}>Phòng: {room?.name || 'N/A'}</Text>
                <Text style={styles.summaryLine}>Người thuê: {data.tenantName || 'N/A'}</Text>
                <Text style={styles.summaryLine}>Tiền cọc: {formatCurrency(data.deposit || 0)}</Text>
                <Text style={styles.summaryLine}>Ngày vào ở: {data.startDate || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TRÁCH NHIỆM CỦA HAI BÊN</Text>
              <Text style={styles.textSmall}>- Bên A đảm bảo điện, nước và điều kiện sinh hoạt như thỏa thuận.</Text>
              <Text style={styles.textSmall}>- Bên B thanh toán đúng hạn, giữ gìn tài sản và tuân thủ nội quy.</Text>
              <Text style={styles.textSmall}>- Nếu vi phạm điều khoản, bên còn lại có quyền đơn phương chấm dứt hợp đồng.</Text>
            </View>

            <View style={styles.signatureRow}>
              <View style={styles.sigBox}>
                <Text style={styles.sigLabel}>ĐẠI DIỆN BÊN B</Text>
                <View style={{ height: 60 }} />
                <Text style={styles.sigName}>{data.tenantName}</Text>
              </View>
              <View style={styles.sigBox}>
                <Text style={styles.sigLabel}>ĐẠI DIỆN BÊN A</Text>
                <View style={{ height: 60 }} />
                <Text style={styles.sigName}>Nguyen Dinh Ha Nam</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmBtnTxt}>Ký hợp đồng</Text>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: COLORS.surfaceLowest,
    ...SHADOW.sm,
  },
  headerWeb: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 14, ...FONTS.bold },
  headerBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 12 },
  contractPage: {
    backgroundColor: COLORS.surfaceLowest,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.sm,
  },
  contractPageWeb: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 26,
  },
  legalHeader: { alignItems: 'center', marginBottom: 16 },
  nationalTitle: { color: '#000', fontSize: 10, ...FONTS.bold },
  nationalSub: { color: '#000', fontSize: 10, ...FONTS.semibold, marginTop: 2 },
  legalLine: { width: 100, height: 1, backgroundColor: '#000', marginTop: 6 },
  contractMainTitle: { color: '#000', textAlign: 'center', fontSize: 15, ...FONTS.bold, marginBottom: 14 },
  section: { marginBottom: 12 },
  sectionLabel: { color: '#000', fontSize: 11, ...FONTS.bold, marginBottom: 6 },
  infoLine: { color: '#000', fontSize: 11, lineHeight: 17, marginBottom: 3 },
  textBody: { color: '#000', fontSize: 11, lineHeight: 17, marginBottom: 6 },
  textSmall: { color: '#000', fontSize: 10, lineHeight: 16, marginBottom: 4 },
  boldText: { ...FONTS.bold },
  financeGrid: { gap: 12 },
  financeGridWeb: { flexDirection: 'row', alignItems: 'flex-start' },
  summaryPanel: {
    flex: 0.7,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  summaryEyebrow: { color: COLORS.textMuted, fontSize: 10, ...FONTS.bold, marginBottom: 8, letterSpacing: 0.4 },
  summaryLine: { color: '#000', fontSize: 11, lineHeight: 18, marginBottom: 4 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigBox: { width: '45%', alignItems: 'center' },
  sigLabel: { color: '#000', fontSize: 10, ...FONTS.bold },
  sigName: { color: '#000', fontSize: 11, ...FONTS.semibold },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
  },
  confirmBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnTxt: { color: '#fff', fontSize: 15, ...FONTS.semibold },
});
