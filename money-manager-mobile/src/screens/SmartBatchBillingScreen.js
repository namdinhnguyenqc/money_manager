import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, FlatList, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, FONTS } from '../theme';
import { getActiveContracts, getServices, getLatestMeterReadings, createInvoice, getContractServices, getPreviousDebt } from '../database/queries';
import { extractMeterReadings } from '../utils/aiService';
import { matchReadingsToRooms } from '../utils/mappingEngine';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';

export default function SmartBatchBillingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [results, setResults] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [elecSvc, setElecSvc] = useState(null);
  const [step, setStep] = useState(1); // 1: Select, 2: Process, 3: Review

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    try {
      const [cs, svcs] = await Promise.all([getActiveContracts(), getServices()]);
      setContracts(cs);
      const eSvc = svcs.find((svc) => {
        const name = String(svc.name || '').toLowerCase();
        return name.includes('dien') || name.includes('electric');
      });
      setElecSvc(eSvc);
    } catch (e) {
      console.error(e);
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền thư viện ảnh để chọn hình.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setImages((prev) => [...prev, ...result.assets]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const startAiAnalysis = async () => {
    if (images.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 ảnh công tơ điện');
      return;
    }

    setLoading(true);
    setStep(2);
    try {
      const populatedContracts = await Promise.all(contracts.map(async (contract) => {
        const readings = await getLatestMeterReadings(contract.room_id);
        return { ...contract, elec_old: readings?.elec_old || 0 };
      }));
      const extracted = await extractMeterReadings(images);
      const matched = matchReadingsToRooms(extracted, populatedContracts);
      setResults(matched);
      setStep(3);
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi AI', e.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const saveAllInvoices = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      for (const res of results) {
        if (res.status === 'match' && res.newValue > 0) {
          const activeServices = await getContractServices(res.contractId);
          const invoiceItems = [];
          for (const svc of activeServices) {
            if (svc.type === 'fixed') {
              invoiceItems.push({ name: svc.name, amount: svc.unit_price, detail: 'Cố định', serviceId: svc.id });
            } else if (svc.type === 'per_person') {
              const contract = contracts.find((c) => c.id === res.contractId);
              const amt = svc.unit_price * (contract?.num_people || 1);
              invoiceItems.push({ name: svc.name, amount: amt, detail: `x${contract?.num_people} người`, serviceId: svc.id });
            } else if ((svc.type === 'metered' || svc.type === 'meter') && svc.id === elecSvc?.id) {
              const used = res.newValue - res.oldValue;
              const amt = used * svc.unit_price;
              invoiceItems.push({ name: svc.name, amount: amt, detail: `(${res.oldValue} - ${res.newValue}) = ${used}kWh`, serviceId: svc.id });
            }
          }
          const contract = contracts.find((c) => c.id === res.contractId);
          const debt = await getPreviousDebt(res.roomId, month, year);
          await createInvoice({
            roomId: res.roomId,
            contractId: res.contractId,
            month,
            year,
            roomFee: contract.room_price,
            items: invoiceItems,
            previousDebt: debt,
            elecOld: res.oldValue,
            elecNew: res.newValue,
          });
        }
      }
      Alert.alert('Thành công', 'Đã tạo hóa đơn thành công.', [{ text: 'OK', onPress: () => navigation.navigate('Invoices') }]);
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderReviewItem = ({ item }) => {
    const matched = item.status === 'match';
    return (
      <SurfaceCard style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View>
            <Text style={styles.roomTitle}>{item.roomName}</Text>
            <Text style={styles.tenant}>{item.tenantName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: matched ? '#e8fff4' : '#ffeceb' }]}>
            <Ionicons name={matched ? 'checkmark-circle' : 'alert-circle'} size={14} color={matched ? COLORS.success : COLORS.danger} />
            <Text style={[styles.badgeText, { color: matched ? COLORS.success : COLORS.danger }]}>
              {matched ? 'Đã khớp' : 'Cần rà soát'}
            </Text>
          </View>
        </View>

        {matched ? (
          <View style={styles.dataRow}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Chỉ số cũ</Text>
              <Text style={styles.dataValue}>{item.oldValue}</Text>
            </View>
            <Ionicons name="chevron-forward" size={12} color={COLORS.outline} />
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Chỉ số mới</Text>
              <Text style={[styles.dataValue, { color: COLORS.primary }]}>{item.newValue}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Tiêu thụ</Text>
              <Text style={[styles.dataValue, { color: COLORS.success }]}>{item.consumption} kWh</Text>
            </View>
          </View>
        ) : (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {item.hasUnreadable ? 'AI chưa đọc rõ được ảnh này. Vui lòng nhập thủ công.' : 'Thiếu ảnh công tơ hoặc dữ liệu chưa khớp.'}
            </Text>
          </View>
        )}
      </SurfaceCard>
    );
  };

  const isDesktopWeb = Platform.OS === 'web';
  const contentMaxWidth = width >= 1440 ? 1180 : width >= 1024 ? 1080 : 960;

  return (
    <View style={styles.root}>
      {!isDesktopWeb ? <TopAppBar title="Lập hóa đơn điện bằng AI" subtitle="Tính năng AI" onBack={() => navigation.goBack()} /> : null}

      {step === 1 ? (
        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentScrollContainer}
        >
          <View style={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
            {isDesktopWeb ? (
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>Lập hóa đơn hàng loạt bằng AI</Text>
                  <Text style={styles.headerSub}>Tải nhiều ảnh công tơ, AI sẽ gợi ý chỉ số theo từng phòng trước khi tạo hóa đơn.</Text>
                </View>
              </View>
            ) : null}
            <SurfaceCard>
              <Text style={styles.welcomeTitle}>Quét công tơ điện hàng loạt</Text>
              <Text style={styles.welcomeSub}>Chọn nhiều ảnh cùng lúc, AI sẽ gợi ý chỉ số cho từng phòng.</Text>
            </SurfaceCard>

            <SurfaceCard>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
                {images.map((img, index) => (
                  <View key={`${img.uri}-${index}`} style={styles.imageWrap}>
                    <Image source={{ uri: img.uri }} style={styles.preview} />
                    <TouchableOpacity style={styles.removeBadge} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addImage} onPress={pickImages}>
                  <Ionicons name="add" size={30} color={COLORS.primary} />
                  <Text style={styles.addText}>Thêm ảnh</Text>
                </TouchableOpacity>
              </ScrollView>
            </SurfaceCard>

            {images.length > 0 ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={startAiAnalysis}>
                <Text style={styles.primaryBtnText}>Bắt đầu phân tích ({images.length} ảnh)</Text>
                <Ionicons name="flash" size={16} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      {step === 2 ? (
        <View style={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }, styles.center]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>AI đang xử lý dữ liệu...</Text>
          <Text style={styles.loadingSub}>Đang trích xuất chỉ số và đối chiếu phòng.</Text>
          <TouchableOpacity style={styles.cancelProcessingBtn} onPress={() => { setStep(1); setLoading(false); }}>
            <Text style={styles.cancelProcessingText}>Hủy bỏ</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={[styles.content, isDesktopWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
          <Text style={styles.reviewTitle}>Kết quả gợi ý ({results.filter((r) => r.status === 'match').length}/{contracts.length})</Text>
          <FlatList
            style={styles.reviewList}
            data={results}
            keyExtractor={(item) => item.roomId.toString()}
            renderItem={renderReviewItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.repickBtn} onPress={() => setStep(1)}>
              <Text style={styles.repickText}>Chọn lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={saveAllInvoices} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.confirmText}>Xác nhận và tạo hóa đơn</Text>
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  contentScroll: { flex: 1 },
  contentScrollContainer: { paddingBottom: 32 },
  content: { flex: 1, minHeight: 0, padding: 16, gap: 12 },
  contentWeb: { width: '100%', alignSelf: 'center' },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },
  headerSub: { marginTop: 4, color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  welcomeTitle: { color: COLORS.textPrimary, fontSize: 20, ...FONTS.bold },
  welcomeSub: { marginTop: 6, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  imageRow: { alignItems: 'center', gap: 12, paddingRight: 6 },
  imageWrap: { width: 110, height: 150 },
  preview: { width: '100%', height: '100%', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  removeBadge: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: RADIUS.full },
  addImage: {
    width: 110,
    height: 150,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { marginTop: 6, color: COLORS.primary, fontSize: 12, ...FONTS.bold },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', ...FONTS.bold },
  loadingTitle: { marginTop: 20, color: COLORS.textPrimary, fontSize: 18, ...FONTS.bold },
  loadingSub: { marginTop: 6, color: COLORS.textSecondary },
  cancelProcessingBtn: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 20, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLow },
  cancelProcessingText: { color: COLORS.textSecondary, ...FONTS.bold },
  reviewTitle: { color: COLORS.textSecondary, fontSize: 12, ...FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  reviewList: { flex: 1, minHeight: 0 },
  listContent: { paddingBottom: 90, gap: 10 },
  reviewCard: { marginTop: 2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  roomTitle: { color: COLORS.textPrimary, fontSize: 17, ...FONTS.bold },
  tenant: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.md, paddingHorizontal: 9, paddingVertical: 6 },
  badgeText: { fontSize: 10, ...FONTS.bold },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, padding: 12 },
  dataItem: { flex: 1, alignItems: 'center' },
  dataLabel: { fontSize: 10, color: COLORS.textMuted, ...FONTS.bold },
  dataValue: { marginTop: 2, color: COLORS.textPrimary, ...FONTS.bold },
  divider: { width: 1, height: 24, backgroundColor: COLORS.border },
  errorBox: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, padding: 10 },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 10,
  },
  repickBtn: {
    width: 108,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repickText: { color: COLORS.textSecondary, ...FONTS.semibold },
  confirmBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
  },
  confirmText: { color: '#fff', ...FONTS.bold },
});
