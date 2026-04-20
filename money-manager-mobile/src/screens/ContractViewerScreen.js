import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { COLORS, RADIUS, FONTS } from '../theme';
import { formatCurrency } from '../utils/format';
import { getInvoiceHistory } from '../database/queries';
import { useFocusEffect } from '@react-navigation/native';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function ContractViewerScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const { contract } = route.params;
  const [history, setHistory] = useState([]);
  const viewRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getInvoiceHistory(contract.id);
      setHistory(data);
    } catch (e) {
      console.error('Loi lay lich su:', e);
    }
  }, [contract.id]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Gui hop dong' });
      } else {
        Alert.alert('Loi', 'Chuc nang chia se khong kha dung');
      }
    } catch (e) {
      Alert.alert('Loi', `Khong the xuat hinh hop dong: ${e.message}`);
    }
  };

  const today = new Date();
  const d = today.getDate();
  const m = today.getMonth() + 1;
  const y = today.getFullYear();
  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? 1080 : width >= 1024 ? 980 : 860;

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? (
        <TopAppBar
          light
          title="Hop dong thue phong"
          subtitle="Van ban va lich su"
          onBack={() => navigation.goBack()}
          rightIcon="share-social-outline"
          onRightPress={handleShare}
        />
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
        {isDesktopWeb ? (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Van ban hop dong</Text>
              <Text style={styles.headerSub}>Xem lai noi dung ky ket va lich su dong tien cua hop dong nay.</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>Chia se</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <SurfaceCard style={styles.paper} tone="lowest">
          <View ref={viewRef} collapsable={false}>
            <Text style={styles.nationalTitle}>CONG HOA XA HOI CHU NGHIA VIET NAM</Text>
            <Text style={styles.nationalSub}>Doc lap - Tu do - Hanh phuc</Text>
            <View style={styles.line} />

            <Text style={styles.contractTitle}>HOP DONG THUE PHONG TRO</Text>

            <Text style={styles.text}>
              Hom nay ngay {d} thang {m} nam {y}; tai dia chi: 60/7/4A duong so 4, phuong Thu Duc, TP Ho Chi Minh.
            </Text>
            <Text style={styles.text}>Chung toi gom:</Text>

            <Text style={styles.sectionTitle}>1. Ben cho thue (Ben A)</Text>
            <Text style={styles.text}>Ong/ba: <Text style={styles.bold}>Nguyen Dinh Ha Nam</Text> - Sinh ngay: 26/11/1999</Text>
            <Text style={styles.text}>Noi dang ky HK: 90 Nguyen Van Cu, Phuong Tuy Hoa, Tinh Dak Lak</Text>
            <Text style={styles.text}>CMND: 054099004728 cap ngay 21/01/2025 tai Bo Cong An</Text>
            <Text style={styles.text}>So dien thoai: 0927368772</Text>

            <Text style={styles.sectionTitle}>2. Ben thue phong (Ben B)</Text>
            <Text style={styles.text}>Ong/ba: <Text style={styles.bold}>{contract.tenant_name || '........................'}</Text> - Sinh ngay: {contract.tenant_dob || '...............'}</Text>
            <Text style={styles.text}>Noi dang ky HK thuong tru: {contract.tenant_address || '..................................................'}</Text>
            <Text style={styles.text}>So CMND: {contract.tenant_id_card || '................'} cap ngay ...../...../...... tai ....................</Text>
            <Text style={styles.text}>So dien thoai: {contract.tenant_phone || '........................'}</Text>

            <Text style={styles.text}>Sau khi ban bac, hai ben thong nhat nhu sau:</Text>
            <Text style={styles.text}>Ben A dong y cho Ben B thue 01 phong tai dia chi tren.</Text>

            <Text style={styles.text}><Text style={styles.bold}>Gia thue:</Text> {formatCurrency(contract.room_price)}/thang</Text>
            <Text style={styles.text}><Text style={styles.bold}>Hinh thuc thanh toan:</Text> Chuyen khoan hoac tien mat</Text>
            <Text style={styles.text}><Text style={styles.bold}>Tien dien:</Text> {contract.has_ac ? '4000 d/kwh (co may lanh)' : '3400 d/kwh (khong may lanh)'}</Text>
            <Text style={styles.text}><Text style={styles.bold}>Tien nuoc:</Text> 13.100 d/nguoi</Text>
            <Text style={styles.text}><Text style={styles.bold}>Tien rac:</Text> 36.500 d/thang</Text>
            <Text style={styles.text}><Text style={styles.bold}>Tien dat coc:</Text> {formatCurrency(contract.deposit)}</Text>
            <Text style={styles.text}>Hop dong co hieu luc tu {contract.start_date || '...'} den {contract.end_date || '................'}</Text>

            <Text style={styles.sectionTitle}>TRACH NHIEM CAC BEN</Text>
            <Text style={styles.text}>Ben A tao dieu kien thuan loi, cung cap dien nuoc day du.</Text>
            <Text style={styles.text}>Ben B thanh toan dung han, giu gin tai san va ve sinh chung.</Text>
            <Text style={styles.text}>Khi het han, Ben B thanh toan chi phi phat sinh truoc khi ban giao.</Text>

            <View style={styles.footerRow}>
              <View style={styles.signBox}>
                <Text style={styles.bold}>DAI DIEN BEN B</Text>
                <View style={styles.signSpace} />
              </View>
              <View style={styles.signBox}>
                <Text style={styles.bold}>DAI DIEN BEN A</Text>
                <View style={styles.signSpace} />
                <Text style={styles.bold}>Nguyen Dinh Ha Nam</Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.historyHeader}>
            <Ionicons name="time" size={18} color={COLORS.primary} />
            <Text style={styles.historyTitle}>Lich su dong tien</Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>Chua co lich su hoa don</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {history.map((inv, idx) => {
                const paid = inv.status === 'paid';
                return (
                  <View key={inv.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.dot, { backgroundColor: paid ? COLORS.success : COLORS.warning }]} />
                      {idx !== history.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineBody}>
                      <View style={styles.timelineTop}>
                        <Text style={styles.timelineMonth}>Thang {inv.month}/{inv.year}</Text>
                        <Text style={[styles.timelineStatus, { color: paid ? COLORS.success : COLORS.warning }]}>
                          {paid ? 'Da thu' : 'Cho thu'}
                        </Text>
                      </View>
                      <Text style={styles.timelineAmount}>{formatCurrency(inv.total_amount)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SurfaceCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  contentWeb: { width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },
  headerSub: { marginTop: 4, color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  shareBtn: { height: 42, borderRadius: RADIUS.lg, paddingHorizontal: 16, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareBtnText: { color: '#fff', ...FONTS.bold, fontSize: 12 },
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
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  historyTitle: { color: COLORS.textPrimary, fontSize: 16, ...FONTS.bold },
  emptyHistory: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },
  timeline: { paddingLeft: 2 },
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 64 },
  timelineLeft: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.borderSoft, marginTop: 4 },
  timelineBody: { flex: 1, paddingBottom: 8 },
  timelineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineMonth: { color: COLORS.textPrimary, ...FONTS.bold, fontSize: 14 },
  timelineStatus: { ...FONTS.bold, fontSize: 10 },
  timelineAmount: { marginTop: 4, color: COLORS.textSecondary, ...FONTS.medium },
});
