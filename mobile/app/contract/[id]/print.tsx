/**
 * TrọCare Mobile — Contract Print Preview & Share Screen
 * Renders the formal legal contract layout, matching the A4 web structure.
 * Supports sharing via Native Share Sheets (Zalo, Gmail, Messages, etc.).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import { formatMoney, loadContract, loadOwnerProfile } from '@/lib/rentalOps';

export default function ContractPrintScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [contract, setContract] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [c, o] = await Promise.all([
          loadContract(String(id)),
          loadOwnerProfile().catch(() => null),
        ]);
        setContract(c);
        setOwner(o);
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể tải thông tin in hợp đồng.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang chuẩn bị mẫu hợp đồng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Không tìm thấy hợp đồng.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonOutline}>
            <Text style={styles.backButtonOutlineText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const electricity = (contract.applied_services_snapshot || []).find((s: any) => s.name?.toLowerCase().includes("điện"));
  const water = (contract.applied_services_snapshot || []).find((s: any) => s.name?.toLowerCase().includes("nước"));
  const garbage = (contract.applied_services_snapshot || []).find((s: any) => s.name?.toLowerCase().includes("rác"));

  const contractTextContent = `
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập – Tự do – Hạnh phúc
--------------------

HỢP ĐỒNG THUÊ PHÒNG TRỌ

Hôm nay ngày ${day} tháng ${month} năm ${year}; tại địa chỉ: 60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh
Chúng tôi gồm:

1. Đại diện bên cho thuê phòng trọ (Bên A):
Ông/bà: ${owner?.name || "Nguyễn Đình Hà Nam"}
CMND/CCCD số: ${owner?.idCard || "054099004728"}
Số điện thoại: ${owner?.phone || "0927368772"}

2. Bên thuê phòng trọ (Bên B):
Ông/bà: ${contract.tenant_name}
Số CMND/CCCD: ${contract.tenant_id_card || "Chưa cung cấp"}
Số điện thoại: ${contract.tenant_phone || "Chưa cung cấp"}

Hai bên cùng thống nhất thỏa thuận thuê phòng trọ tại địa chỉ 60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh với các điều khoản sau:
- Giá thuê: ${formatMoney(contract.rent_amount)} VNĐ/tháng
- Tiền cọc: ${formatMoney(contract.deposit_amount)} VNĐ
- Tiền điện: ${formatMoney(electricity?.applied_unit_price || 3500)} đ/kwh ${contract.has_ac ? "(Có máy lạnh)" : "(Không máy lạnh)"}
- Tiền nước: ${formatMoney(water?.applied_unit_price || 50000)} đ/người
- Tiền rác: ${formatMoney(garbage?.applied_unit_price || 36500)} đ/tháng
- Hạn hợp đồng: Từ ${contract.start_date || "…"} đến ${contract.end_date || "…"}
  `;

  const handleShare = async () => {
    try {
      await Share.share({
        message: contractTextContent,
        title: `Hợp đồng thuê phòng ${contract.room_name}`,
      });
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể chia sẻ hợp đồng.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>In Hợp đồng</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        {/* Printable Paper */}
        <View style={styles.paper}>
          {/* Header */}
          <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
          <Text style={styles.nationalSubtitle}>Độc lập – Tự do – Hạnh phúc</Text>
          <View style={styles.lineDecoration} />

          <Text style={styles.mainTitle}>HỢP ĐỒNG THUÊ PHÒNG TRỌ</Text>

          {/* Intro */}
          <Text style={styles.paragraph}>
            Hôm nay ngày <Text style={styles.boldText}>{day}</Text> tháng <Text style={styles.boldText}>{month}</Text> năm <Text style={styles.boldText}>{year}</Text>; tại địa điểm: <Text style={styles.italicText}>60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh</Text>.
          </Text>

          {/* Section A */}
          <Text style={styles.sectionTitle}>Chúng tôi gồm:</Text>
          <Text style={styles.partyTitle}>1. Đại diện bên cho thuê phòng trọ (Bên A):</Text>
          <View style={styles.detailsBlock}>
            <Text style={styles.paragraph}>Ông/bà: <Text style={styles.boldText}>{owner?.name || "Nguyễn Đình Hà Nam"}</Text></Text>
            <Text style={styles.paragraph}>Nơi đăng ký HK: {owner?.address || "90 Nguyễn Văn Cừ, Phường Tuy Hòa, Tỉnh Đắk Lắk"}</Text>
            <Text style={styles.paragraph}>CMND/CCCD số: {owner?.idCard || "054099004728"}</Text>
            <Text style={styles.paragraph}>Số điện thoại: <Text style={styles.boldText}>{owner?.phone || "0927368772"}</Text></Text>
          </View>

          {/* Section B */}
          <Text style={styles.partyTitle}>2. Bên thuê phòng trọ (Bên B):</Text>
          <View style={styles.detailsBlock}>
            <Text style={styles.paragraph}>Ông/bà: <Text style={[styles.boldText, { textTransform: 'uppercase' }]}>{contract.tenant_name}</Text></Text>
            <Text style={styles.paragraph}>HKTT: {contract.tenant_address || "………………………………………………………………………"}</Text>
            <Text style={styles.paragraph}>Số CMND/CCCD: {contract.tenant_id_card || "…………………."}</Text>
            <Text style={styles.paragraph}>Số điện thoại: <Text style={styles.boldText}>{contract.tenant_phone || "………………………………………………..."}</Text></Text>
          </View>

          {/* Specifications */}
          <Text style={styles.paragraph}>
            Sau khi bàn bạc thống nhất, Bên A đồng ý cho Bên B thuê 01 phòng ở tại địa chỉ 60/7/4A đường số 4, phường Thủ Đức, TP Hồ Chí Minh với các thỏa thuận chi tiết như sau:
          </Text>

          <View style={styles.specList}>
            <Text style={styles.specItem}>
              · Giá thuê phòng: <Text style={styles.boldText}>{formatMoney(contract.rent_amount)} / tháng</Text>.
            </Text>
            <Text style={styles.specItem}>
              · Tiền đặt cọc: <Text style={styles.boldText}>{formatMoney(contract.deposit_amount)}</Text>.
            </Text>
            <Text style={styles.specItem}>
              · Tiền điện: <Text style={styles.boldText}>{formatMoney(electricity?.applied_unit_price || 3500)} / kwh</Text> {contract.has_ac ? "(Có máy lạnh)" : "(Không máy lạnh)"} tính theo số đo công tơ.
            </Text>
            <Text style={styles.specItem}>
              · Tiền nước: <Text style={styles.boldText}>{formatMoney(water?.applied_unit_price || 50000)} / người</Text>.
            </Text>
            {garbage && (
              <Text style={styles.specItem}>
                · Tiền rác: <Text style={styles.boldText}>{formatMoney(garbage?.applied_unit_price || 36500)} / tháng</Text>.
              </Text>
            )}
            <Text style={styles.specItem}>
              · Thời hạn hợp đồng: Kể từ ngày <Text style={styles.boldText}>{contract.start_date || "…"}</Text> đến ngày <Text style={styles.boldText}>{contract.end_date || "…"}</Text>.
            </Text>
          </View>

          {/* Terms */}
          <Text style={styles.termsHeader}>TRÁCH NHIỆM CHUNG & CAM KẾT</Text>
          <Text style={styles.termParagraph}>
            - Bên B phải có trách nhiệm thanh toán đầy đủ các khoản tiền phòng, dịch vụ đúng hạn định.
          </Text>
          <Text style={styles.termParagraph}>
            - Bên B cam kết giữ gìn vệ sinh chung, bảo quản nguyên vẹn trang thiết bị cơ sở vật chất phòng cho thuê. Không làm ảnh hưởng trật tự công cộng các phòng kế bên.
          </Text>
          <Text style={styles.termParagraph}>
            - Bên A cam kết bàn giao phòng đúng hạn định, cung cấp các điều kiện điện nước ổn định phục vụ nhu cầu sinh hoạt của Bên B.
          </Text>

          {/* Signatures */}
          <View style={styles.signatureSection}>
            <View style={styles.sigCol}>
              <Text style={styles.sigTitle}>ĐẠI DIỆN BÊN B</Text>
              <Text style={styles.sigSubtitle}>(Ký và ghi rõ họ tên)</Text>
              <Text style={styles.sigName}>{contract.tenant_name}</Text>
            </View>
            <View style={styles.sigCol}>
              <Text style={styles.sigTitle}>ĐẠI DIỆN BÊN A</Text>
              <Text style={styles.sigSubtitle}>(Ký và ghi rõ họ tên)</Text>
              <Text style={styles.sigName}>{owner?.name || "Nguyễn Đình Hà Nam"}</Text>
            </View>
          </View>
        </View>

        {/* Share Hint Bar */}
        <TouchableOpacity style={styles.shareIndicatorBtn} onPress={handleShare} activeOpacity={0.78}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={styles.shareIndicatorText}>Chia sẻ hợp đồng qua Zalo/Email</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryAlpha20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.danger, textAlign: 'center' },
  backButtonOutline: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  backButtonOutlineText: { fontSize: 13, fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  
  paper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  nationalTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  nationalSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    color: '#334155',
    marginTop: 2,
  },
  lineDecoration: {
    width: 80,
    height: 1,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  boldText: {
    fontFamily: Typography.fontFamily.bold,
  },
  italicText: {
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
    textDecorationLine: 'underline',
  },
  partyTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  detailsBlock: {
    paddingLeft: 12,
    marginBottom: 10,
  },
  specList: {
    paddingLeft: 4,
    marginVertical: 12,
    gap: 6,
  },
  specItem: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#334155',
  },
  termsHeader: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 8,
  },
  termParagraph: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.regular,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
    paddingLeft: 6,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 36,
    paddingHorizontal: 8,
  },
  sigCol: {
    alignItems: 'center',
    width: '45%',
  },
  sigTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0f172a',
  },
  sigSubtitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 48,
  },
  sigName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.bold,
    color: '#0f172a',
    textAlign: 'center',
  },
  shareIndicatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  shareIndicatorText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.bold,
    color: '#fff',
  },
});
