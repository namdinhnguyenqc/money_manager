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
        await Sharing.shareAsync(uri, { dialogTitle: 'Gui hop dong cho khach' });
      } else {
        Alert.alert('Thong bao', 'Chuc nang chia se khong kha dung.');
      }
    } catch (e) {
      Alert.alert('Loi', `Khong the chup anh hop dong: ${e.message}`);
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
          <Text style={styles.headerTitle}>Hop dong thue phong tro</Text>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View ref={contractRef} style={[styles.contractPage, isWeb && styles.contractPageWeb, { maxWidth: contentWidth }]} collapsable={false}>
            <View style={styles.legalHeader}>
              <Text style={styles.nationalTitle}>CONG HOA XA HOI CHU NGHIA VIET NAM</Text>
              <Text style={styles.nationalSub}>Doc lap - Tu do - Hanh phuc</Text>
              <View style={styles.legalLine} />
            </View>

            <Text style={styles.contractMainTitle}>HOP DONG THUE PHONG TRO</Text>

            <Text style={styles.textBody}>
              Hom nay ngay {now.getDate()} thang {now.getMonth() + 1} nam {now.getFullYear()},
              tai dia chi 60/7/4A duong so 4, phuong Thu Duc, TP Ho Chi Minh.
            </Text>
            <Text style={styles.textBody}>Chung toi gom:</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>1. Ben cho thue (Ben A)</Text>
              <Text style={styles.infoLine}>Ong/ba: <Text style={styles.boldText}>Nguyen Dinh Ha Nam</Text> - Sinh ngay: 26/11/1999</Text>
              <Text style={styles.infoLine}>Noi dang ky HK: 90 Nguyen Van Cu, Phuong Tuy Hoa, Tinh Dak Lak</Text>
              <Text style={styles.infoLine}>CMND: 054099004728 cap ngay 21/01/2025 tai Bo Cong An</Text>
              <Text style={styles.infoLine}>So dien thoai: 0927368772</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>2. Ben thue (Ben B)</Text>
              <Text style={styles.infoLine}>Ong/ba: <Text style={styles.boldText}>{(data.tenantName || '................').toUpperCase()}</Text></Text>
              <Text style={styles.infoLine}>Noi dang ky HK thuong tru: {data.address || '................'}</Text>
              <Text style={styles.infoLine}>So CMND: {data.idCard || '................'}</Text>
              <Text style={styles.infoLine}>So dien thoai: {data.phone || '................'}</Text>
            </View>

            <View style={[styles.financeGrid, isWeb && styles.financeGridWeb]}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>3. Dieu khoan tai chinh</Text>
                <Text style={styles.textBody}>Gia thue: <Text style={styles.boldText}>{formatCurrency(room?.price)}/thang</Text></Text>
                <Text style={styles.textBody}>Hinh thuc thanh toan: Chuyen khoan hoac tien mat</Text>
                <Text style={styles.textBody}>Tien dien: 3400 d/kwh (khong may lanh) hoac 4000 d/kwh (co may lanh)</Text>
                <Text style={styles.textBody}>Tien nuoc: 13.100 d/nguoi/thang</Text>
                <Text style={styles.textBody}>Tien rac: 36.500 d/thang</Text>
                <Text style={styles.textBody}>Tien dat coc: <Text style={styles.boldText}>{formatCurrency(data.deposit)}</Text></Text>
                <Text style={styles.textBody}>Hop dong co gia tri tu ngay {data.startDate} den {data.endDate || '........'}</Text>
              </View>

              <View style={styles.summaryPanel}>
                <Text style={styles.summaryEyebrow}>TOM TAT HOP DONG</Text>
                <Text style={styles.summaryLine}>Phong: {room?.name || 'N/A'}</Text>
                <Text style={styles.summaryLine}>Khach: {data.tenantName || 'N/A'}</Text>
                <Text style={styles.summaryLine}>Tien coc: {formatCurrency(data.deposit || 0)}</Text>
                <Text style={styles.summaryLine}>Ngay vao o: {data.startDate || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TRACH NHIEM CAC BEN</Text>
              <Text style={styles.textSmall}>- Ben A dam bao dien, nuoc va dieu kien o theo thoa thuan.</Text>
              <Text style={styles.textSmall}>- Ben B thanh toan dung han, giu gin tai san, chap hanh noi quy.</Text>
              <Text style={styles.textSmall}>- Neu vi pham dieu khoan, ben con lai co quyen don phuong cham dut hop dong.</Text>
            </View>

            <View style={styles.signatureRow}>
              <View style={styles.sigBox}>
                <Text style={styles.sigLabel}>DAI DIEN BEN B</Text>
                <View style={{ height: 60 }} />
                <Text style={styles.sigName}>{data.tenantName}</Text>
              </View>
              <View style={styles.sigBox}>
                <Text style={styles.sigLabel}>DAI DIEN BEN A</Text>
                <View style={{ height: 60 }} />
                <Text style={styles.sigName}>Nguyen Dinh Ha Nam</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmBtnTxt}>Ky ket hop dong</Text>
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
