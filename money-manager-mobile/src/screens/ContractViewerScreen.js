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
      console.error('History load error:', e);
    }
  }, [contract.id]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Chia sẻ hợp đồng' });
      } else {
        Alert.alert('Lỗi', 'Thiết bị không hỗ trợ chia sẻ');
      }
    } catch (e) {
      Alert.alert('Lỗi', `Không thể xuất ảnh hợp đồng: ${e.message}`);
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
          title="Hợp đồng thuê phòng"
          subtitle="Tài liệu và lịch sử"
          onBack={() => navigation.goBack()}
          rightIcon="share-social-outline"
          onRightPress={handleShare}
        />
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
        {isDesktopWeb ? (
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Tài liệu hợp đồng</Text>
              <Text style={styles.headerSub}>Xem nội dung đã ký và lịch sử thanh toán của hợp đồng này.</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <SurfaceCard style={styles.paper} tone="lowest">
          <View ref={viewRef} collapsable={false}>
            <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
            <Text style={styles.nationalSub}>Độc lập - Tự do - Hạnh phúc</Text>
            <View style={styles.line} />

            <Text style={styles.contractTitle}>HỢP ĐỒNG THUÊ PHÒNG</Text>

            <Text style={styles.text}>
              Hôm nay, ngày {d} tháng {m} năm {y}; tại địa chỉ: 60/7/4A Đường số 4, phường Thủ Đức, TP. Hồ Chí Minh.
            </Text>
            <Text style={styles.text}>Các bên tham gia:</Text>

            <Text style={styles.sectionTitle}>1. Bên cho thuê (Bên A)</Text>
            <Text style={styles.text}>Họ tên: <Text style={styles.bold}>Nguyen Dinh Ha Nam</Text> - Ngày sinh: 26/11/1999</Text>
            <Text style={styles.text}>Địa chỉ đăng ký: 90 Nguyen Van Cu, Phuong Tuy Hoa, Tinh Dak Lak</Text>
            <Text style={styles.text}>Số CCCD/CMND: 054099004728 cấp ngày 21/01/2025 bởi Bộ Công an</Text>
            <Text style={styles.text}>Điện thoại: 0927368772</Text>

            <Text style={styles.sectionTitle}>2. Bên thuê (Bên B)</Text>
            <Text style={styles.text}>Họ tên: <Text style={styles.bold}>{contract.tenant_name || '........................'}</Text> - Ngày sinh: {contract.tenant_dob || '...............'}</Text>
            <Text style={styles.text}>Địa chỉ thường trú: {contract.tenant_address || '..................................................'}</Text>
            <Text style={styles.text}>Số CCCD/CMND: {contract.tenant_id_card || '................'} cấp ngày ...../...../...... tại ....................</Text>
            <Text style={styles.text}>Điện thoại: {contract.tenant_phone || '........................'}</Text>

            <Text style={styles.text}>Sau khi trao đổi, hai bên thống nhất như sau:</Text>
            <Text style={styles.text}>Bên A đồng ý cho Bên B thuê một phòng tại địa chỉ nêu trên.</Text>

            <Text style={styles.text}><Text style={styles.bold}>Tiền phòng:</Text> {formatCurrency(contract.room_price)}/tháng</Text>
            <Text style={styles.text}><Text style={styles.bold}>Phương thức thanh toán:</Text> Chuyển khoản hoặc tiền mặt</Text>
            <Text style={styles.text}><Text style={styles.bold}>Điện:</Text> {contract.has_ac ? '4000 VND/kWh (phòng có máy lạnh)' : '3400 VND/kWh (phòng thường)'}</Text>
            <Text style={styles.text}><Text style={styles.bold}>Nước:</Text> 13,100 VND/người</Text>
            <Text style={styles.text}><Text style={styles.bold}>Phí rác:</Text> 36.500 VNĐ/tháng</Text>
            <Text style={styles.text}><Text style={styles.bold}>Tiền cọc:</Text> {formatCurrency(contract.deposit)}</Text>
            <Text style={styles.text}>Hợp đồng có hiệu lực từ {contract.start_date || '...'} đến {contract.end_date || '................'}</Text>

            <Text style={styles.sectionTitle}>TRÁCH NHIỆM CỦA HAI BÊN</Text>
            <Text style={styles.text}>Bên A đảm bảo điều kiện ở và tiện ích đầy đủ.</Text>
            <Text style={styles.text}>Bên B thanh toán đúng hạn và giữ gìn tài sản/khu vực chung sạch sẽ.</Text>
            <Text style={styles.text}>Khi hết hợp đồng, Bên B thanh toán toàn bộ chi phí phát sinh trước khi bàn giao.</Text>

            <View style={styles.footerRow}>
              <View style={styles.signBox}>
                <Text style={styles.bold}>ĐẠI DIỆN BÊN B</Text>
                <View style={styles.signSpace} />
              </View>
              <View style={styles.signBox}>
                <Text style={styles.bold}>ĐẠI DIỆN BÊN A</Text>
                <View style={styles.signSpace} />
                <Text style={styles.bold}>Nguyen Dinh Ha Nam</Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.historyHeader}>
            <Ionicons name="time" size={18} color={COLORS.primary} />
            <Text style={styles.historyTitle}>Lịch sử thanh toán</Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>Chưa có lịch sử hóa đơn</Text>
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
                        <Text style={styles.timelineMonth}>Tháng {inv.month}/{inv.year}</Text>
                        <Text style={[styles.timelineStatus, { color: paid ? COLORS.success : COLORS.warning }]}>
                          {paid ? 'Đã thu' : 'Chờ thu'}
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
