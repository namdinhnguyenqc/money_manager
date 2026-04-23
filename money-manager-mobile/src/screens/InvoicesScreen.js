import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { formatCurrency, getCurrentMonthYear } from '../utils/format';
import {
  addTransaction,
  deleteInvoice,
  getActiveContracts,
  getBankConfig,
  getInvoiceDetails,
  getInvoices,
  getLatestMeterReadings,
  getWallets,
  getServices,
  markInvoicePaid,
} from '../database/queries';
import { executeCreateInvoice, generateInvoiceData } from '../services/invoiceService';
import MonthYearPicker from '../components/MonthYearPicker';
import TopAppBar from '../components/ui/TopAppBar';
import SurfaceCard from '../components/ui/SurfaceCard';
import BankConfigModal from '../components/BankConfigModal';
import { confirmDialog } from '../utils/dialogs';

const stripToDigits = (text) => (text || '').replace(/[^0-9]/g, '');

const buildWalletetQrValue = (amount, month, year, config) => {
  if (!config?.bank_id || !config?.account_no) return 'https://vietqr.io';
  return `https://qr.sepay.vn/img?bank=${config.bank_id}&acc=${config.account_no}&template=compact&amount=${amount}&des=Tien+Phong+T${month}/${year}`;
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'not_created', label: 'Chưa tạo' },
  { id: 'unpaid', label: 'Chờ thu' },
  { id: 'paid', label: 'Đã thu' },
];

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const hasAnyKeyword = (value, keywords) => {
  const normalized = normalizeText(value);
  return keywords.some((keyword) => normalized.includes(keyword));
};

const findMeteredService = (services, keywords) =>
  services.find((service) => hasAnyKeyword(service.name, keywords));

const sumInvoiceItems = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

const getInvoiceStatusMeta = (invoice) => {
  if (!invoice) {
    return {
      label: 'Chưa tạo',
      backgroundColor: COLORS.surfaceLow,
      color: COLORS.textMuted,
      subText: 'Không có hóa đơn trong kỳ này',
    };
  }

  if (invoice.status === 'paid') {
    return {
      label: 'Đã thu',
      backgroundColor: COLORS.successLight,
      color: COLORS.secondary,
      subText: 'Đã ghi nhận thanh toán vào ví',
    };
  }

  return {
    label: 'Chờ thu',
    backgroundColor: COLORS.warningLight,
    color: COLORS.warning,
    subText: 'Đang chờ thanh toán',
  };
};

const matchesFilter = (filterId, invoice) => {
  if (filterId === 'all') return true;
  if (filterId === 'not_created') return !invoice;
  if (filterId === 'unpaid') return !!(invoice && invoice.status !== 'paid');
  if (filterId === 'paid') return !!(invoice && invoice.status === 'paid');
  return true;
};

export default function InvoicesScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const [contracts, setContracts] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [{ month, year }, setPeriod] = useState(getCurrentMonthYear());
  const [invoices, setInvoices] = useState([]);
  const [creatingFor, setCreatingFor] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [filter, setFilter] = useState('all');
  const [meterInputs, setMeterInputs] = useState({});
  const [bankConfig, setBankConfig] = useState(null);
  const [checkoutDateInput, setCheckoutDateInput] = useState('');
  const [invoiceNoteInput, setInvoiceNoteInput] = useState('');
  const [showBankConfig, setShowBankConfig] = useState(false);
  const [rentalWalletId, setRentalWalletId] = useState(null);

  const invoiceViewRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, svcs, invs, cfg, wallets] = await Promise.all([
        getActiveContracts(),
        getServices(),
        getInvoices(month, year),
        getBankConfig(),
        getWallets(),
      ]);
      setContracts(cs || []);
      setAllServices(svcs || []);
      setInvoices(invs || []);
      setBankConfig(cfg || null);
      const rental = (wallets || []).find((w) => w.type === 'rental');
      setRentalWalletId(rental?.id || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => {
    if (route?.params?.initialFilter) setFilter(route.params.initialFilter);
  }, [route?.params?.initialFilter]);

  const hasInvoice = (contractId) => invoices.find((i) => i.contract_id === contractId);
  const metered = allServices.filter((s) => s.type === 'metered' || s.type === 'meter');
  const electricityMetered = metered.filter((service) => hasAnyKeyword(service.name, ['dien', 'electric']));
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== 'paid');
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const notCreatedContracts = contracts.filter((contract) => !hasInvoice(contract.id));
  const visibleContracts = contracts.filter((contract) => matchesFilter(filter, hasInvoice(contract.id)));

  const openCreateInvoice = async (contract) => {
    const previousReadings = await getLatestMeterReadings(contract.room_id);
    if (previousReadings) {
      const nextInputs = { ...meterInputs };
      const electricityService = findMeteredService(metered, ['dien', 'electric']);
      const waterService = findMeteredService(metered, ['nuoc', 'water']);

      if (electricityService) {
        nextInputs[`${contract.id}_${electricityService.id}_old`] = String(previousReadings.elec_old || 0);
      }
      if (waterService) {
        nextInputs[`${contract.id}_${waterService.id}_old`] = String(previousReadings.water_old || 0);
      }

      setMeterInputs(nextInputs);
    }
    setCreatingFor(contract.id);
  };

  const openInvoiceDetail = async (invoiceId) => {
    const detail = await getInvoiceDetails(invoiceId);
    setViewingInvoice(detail);
  };

  const handleCreate = async (contract) => {
    try {
      const payload = await generateInvoiceData({
        contract,
        month,
        year,
        meterInputs,
        checkoutDateInput: checkoutDateInput || null,
        invoiceNoteInput: invoiceNoteInput || null,
      });
      const invoiceId = await executeCreateInvoice(payload);
      await loadData();
      const detail = await getInvoiceDetails(invoiceId);
      setViewingInvoice(detail);
      setCreatingFor(null);
      setMeterInputs({});
      setCheckoutDateInput('');
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể tạo hóa đơn');
    }
  };

  const handleMarkPaid = (invoice) => {
    (async () => {
      if (!rentalWalletId) {
        Alert.alert('Thiếu ví', 'Không tìm thấy ví nhà trọ đang hoạt động để ghi nhận thanh toán.');
        return;
      }

      const confirmed = await confirmDialog({
        title: 'Xác nhận đã thu',
        message: `Xác nhận đã thu ${formatCurrency(invoice.total_amount)} cho phòng ${invoice.room_name}?`,
        confirmText: 'Xác nhận',
      });
      if (!confirmed) return;

      try {
        const txId = await addTransaction({
          type: 'income',
          amount: invoice.total_amount,
          description: `Thu tiền phòng ${invoice.room_name} T${invoice.month}/${invoice.year}`,
          categoryId: null,
          walletId: rentalWalletId,
          imageUri: null,
          date: new Date().toISOString().split('T')[0],
        });
        await markInvoicePaid(invoice.id, invoice.total_amount, txId);
        await loadData();
        setViewingInvoice(null);
      } catch (e) {
        Alert.alert('Lỗi', e.message || 'Không thể cập nhật trạng thái thanh toán');
      }
    })();
  };

  const handleDeleteInvoice = (invoice) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xóa hóa đơn',
        message: 'Bạn có chắc muốn xóa hóa đơn này?',
        confirmText: 'Xóa',
      });
      if (!confirmed) return;

      await deleteInvoice(invoice.id);
      await loadData();
      setViewingInvoice(null);
    })();
  };

  const handleShare = async () => {
    try {
      if (!invoiceViewRef.current) return;
      const uri = await captureRef(invoiceViewRef, { format: 'png', quality: 1.0 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: 'Chia sẻ hóa đơn' });
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể chia sẻ');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const unpaidCount = unpaidInvoices.length;
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const notCreatedCount = notCreatedContracts.length;
  const paidCount = paidInvoices.length;
  const previewItemsTotal = sumInvoiceItems(viewingInvoice?.items || []);
  const activeFilterLabel = FILTER_OPTIONS.find((option) => option.id === filter)?.label || 'Tất cả';
  const vietQrValue = viewingInvoice
    ? buildWalletetQrValue(Math.round(viewingInvoice.total_amount || 0), month, year, bankConfig)
    : 'https://vietqr.io';
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb;
  const contentMaxWidth = width >= 1440 ? 1240 : width >= 1024 ? 1100 : 960;
  const previewMaxWidth = width >= 1280 ? 1040 : width >= 960 ? 920 : 760;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      {!isDesktopWeb ? (
        <TopAppBar
          title={`Tháng ${month}/${year}`}
          subtitle="Hóa đơn nhà trọ"
          onBack={() => navigation.goBack()}
          rightIcon="calendar-outline"
          onRightPress={() => setShowPicker(true)}
          light
        />
      ) : null}

      <MonthYearPicker
        visible={showPicker}
        initialMonth={month}
        initialYear={year}
        onClose={() => setShowPicker(false)}
        onSelect={(m, y) => setPeriod({ month: m, year: y })}
      />
      <BankConfigModal 
        visible={showBankConfig} 
        onClose={() => {
          setShowBankConfig(false);
          loadData(); // Reload to get updated bank config
        }} 
      />

      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentScrollContainer}
      >
        <View style={[styles.content, isWeb && styles.contentWeb, { maxWidth: contentMaxWidth }]}>
          {isDesktopWeb ? (
            <View style={styles.periodToolbar}>
              <TouchableOpacity style={styles.periodPickerBtn} onPress={() => setShowPicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.periodPickerText}>Kỳ hóa đơn T{month}/{year}</Text>
              </TouchableOpacity>
              <View style={styles.periodToolbarMeta}>
                <Text style={styles.periodToolbarMetaText}>Theo dõi trạng thái hóa đơn theo kỳ và mở nhanh luồng thu tiền.</Text>
              </View>
              <TouchableOpacity style={styles.periodPickerBtn} onPress={() => setShowBankConfig(true)}>
                <Ionicons name="card-outline" size={18} color={COLORS.primary} />
                <Text style={styles.periodPickerText}>Cấu hình NH</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
            <View style={styles.kpiRow}>
              <SurfaceCard tone="low" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Chưa tạo</Text>
                <Text style={styles.kpiValue}>{notCreatedCount}</Text>
              </SurfaceCard>
              <SurfaceCard tone="low" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Hóa đơn chờ thu</Text>
                <Text style={styles.kpiValue}>{unpaidCount}</Text>
              </SurfaceCard>
              <SurfaceCard tone="lowest" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Đã thu</Text>
                <Text style={[styles.kpiValue, { color: COLORS.secondary }]}>{paidCount}</Text>
              </SurfaceCard>
              <SurfaceCard tone="lowest" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Dự kiến thu</Text>
                <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{formatCurrency(unpaidTotal)}</Text>
              </SurfaceCard>
            </View>

            {isWeb ? (
              <SurfaceCard tone="lowest" style={styles.heroNote}>
                <Text style={styles.heroEyebrow}>HÓA ĐƠN NHÀ TRỌ</Text>
                <Text style={styles.heroTitle}>Trung tâm theo dõi thu tiền</Text>
                <Text style={styles.heroText}>Lọc theo trạng thái, tạo hóa đơn theo hợp đồng và mở xem trước để chốt thu tiền. Quy trình giữ nguyên, giao diện tối ưu cho máy tính.</Text>
              </SurfaceCard>
            ) : null}
          </View>

          <View style={[styles.entryActions, isWeb && styles.entryActionsWeb]}>
            <TouchableOpacity style={[styles.entryActionCard, styles.entryActionPrimary]} onPress={() => setFilter('not_created')}>
              <View style={styles.entryActionIcon}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryActionTitle}>Tạo hóa đơn tháng {month}</Text>
                <Text style={styles.entryActionText}>Lọc nhanh các phòng chưa có hóa đơn trong tháng hiện tại.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.entryActionCard} onPress={() => navigation.navigate('SmartBatchBilling')}>
              <View style={[styles.entryActionIcon, styles.entryActionIconSoft]}>
                <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryActionTitleDark}>Tạo hàng loạt</Text>
                <Text style={styles.entryActionTextDark}>Mở luồng hóa đơn hàng loạt để xử lý nhiều phòng nhanh hơn.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.entryActionCard} onPress={() => setShowBankConfig(true)}>
              <View style={[styles.entryActionIcon, styles.entryActionIconSoft]}>
                <Ionicons name="card-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryActionTitleDark}>Cấu hình thanh toán</Text>
                <Text style={styles.entryActionTextDark}>Thiết lập tài khoản ngân hàng để in VietQR lên hóa đơn.</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_OPTIONS.map((f) => (
              <TouchableOpacity key={f.id} style={[styles.filterChip, filter === f.id && styles.filterChipActive]} onPress={() => setFilter(f.id)}>
                <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.sectionRow, isWeb && styles.sectionRowWeb]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Hợp đồng theo kỳ hóa đơn</Text>
              <Text style={styles.sectionText}>Hiển thị {visibleContracts.length} phòng với bộ lọc {activeFilterLabel.toLowerCase()} trong {month}/{year}.</Text>
            </View>
            {isWeb ? (
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Kỳ T{month}/{year}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.contractList}>
            {contracts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="home-outline" size={56} color={COLORS.border} />
                <Text style={styles.emptyText}>Hiện chưa có phòng đang thuê</Text>
              </View>
            ) : visibleContracts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="filter-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>Không có phòng phù hợp bộ lọc hiện tại</Text>
              </View>
            ) : (
              visibleContracts.map((c) => {
                const existing = hasInvoice(c.id);
                const statusMeta = getInvoiceStatusMeta(existing);
                return (
                  <SurfaceCard key={c.id} tone="lowest" style={[styles.contractCard, isWeb && styles.contractCardWeb]}>
                    <View style={styles.contractHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>Phòng {c.room_name}</Text>
                        <Text style={styles.tenantName}>{c.tenant_name} - {c.tenant_phone}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: statusMeta.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: statusMeta.color }]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    {!existing ? (
                      creatingFor === c.id ? (
                        <View style={[styles.createBox, isWeb && styles.createBoxWeb]}>
                          {electricityMetered.length === 0 ? (
                            <View style={styles.inlineNotice}>
                              <Text style={styles.inlineNoticeText}>Hợp đồng này chưa có dịch vụ điện đang hoạt động.</Text>
                            </View>
                          ) : electricityMetered.map((svc) => (
                            <View key={svc.id} style={styles.meterRow}>
                              <Text style={styles.meterName}>{svc.icon} {svc.name}</Text>
                              <View style={styles.meterInputs}>
                                <TextInput
                                  style={styles.meterInput}
                                  keyboardType="number-pad"
                                  placeholder="Cũ"
                                  value={meterInputs[`${c.id}_${svc.id}_old`]}
                                  onChangeText={(v) => setMeterInputs((prev) => ({ ...prev, [`${c.id}_${svc.id}_old`]: stripToDigits(v) }))}
                                />
                                <TextInput
                                  style={[styles.meterInput, { color: COLORS.primary }]}
                                  keyboardType="number-pad"
                                  placeholder="Mới"
                                  value={meterInputs[`${c.id}_${svc.id}_new`]}
                                  onChangeText={(v) => setMeterInputs((prev) => ({ ...prev, [`${c.id}_${svc.id}_new`]: stripToDigits(v) }))}
                                />
                              </View>
                            </View>
                          ))}
                          <TextInput
                            style={styles.checkoutInput}
                            placeholder="Ngày trả phòng (YYYY-MM-DD, tùy chọn)"
                            value={checkoutDateInput}
                            onChangeText={setCheckoutDateInput}
                          />
                          <TextInput
                            style={styles.checkoutInput}
                            placeholder="Ghi chú hóa đơn (VD: Giảm 200k tiền đặt cọc...)"
                            value={invoiceNoteInput}
                            onChangeText={setInvoiceNoteInput}
                          />
                          {isWeb ? <Text style={styles.formHint}>Nhập chỉ số công tơ tháng này và ngày trả phòng nếu chốt hợp đồng.</Text> : null}
                          <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreatingFor(null)}>
                              <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.createBtn} onPress={() => handleCreate(c)}>
                              <Text style={styles.createText}>Tạo hóa đơn</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.primaryLineBtn, isWeb && styles.primaryLineBtnWeb]}
                          onPress={() => openCreateInvoice(c)}
                        >
                          <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.primaryLineText}>Tạo hóa đơn tháng {month}</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <View style={[styles.existingRow, isWeb && styles.existingRowWeb]}>
                        <View style={styles.existingMeta}>
                          <Text style={styles.existingAmount}>{formatCurrency(existing.total_amount)}</Text>
                          <Text style={styles.existingSub}>{statusMeta.subText}</Text>
                          {isWeb ? (
                            <View style={styles.existingInfoRow}>
                              <Text style={styles.existingInfoText}>Kỳ hóa đơn: T{existing.month}/{existing.year}</Text>
                              <Text style={styles.existingInfoText}>Người thuê: {c.tenant_name}</Text>
                            </View>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={[styles.detailBtn, { backgroundColor: existing.status === 'paid' ? COLORS.secondary : COLORS.primary }]}
                          onPress={() => openInvoiceDetail(existing.id)}
                        >
                          <Text style={styles.detailBtnText}>Chi tiết</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </SurfaceCard>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!viewingInvoice} animationType="slide">
        <View style={styles.previewRoot}>
          <TopAppBar
            title={`Hóa đơn - Phòng ${viewingInvoice?.room_name || ''}`}
            subtitle="Xem trước hóa đơn"
            onBack={() => setViewingInvoice(null)}
            rightIcon="share-social-outline"
            onRightPress={handleShare}
            light
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View ref={invoiceViewRef} collapsable={false} style={[styles.previewCard, isWeb && styles.previewCardWeb, { maxWidth: previewMaxWidth }]}>
              <Text style={styles.previewTitle}>Thông báo tiền phòng T{month}/{year}</Text>
              <Text style={styles.previewLine}>Người thuê: {viewingInvoice?.tenant_name}</Text>
              <Text style={styles.previewLine}>Phòng: {viewingInvoice?.room_name}</Text>
              <Text style={styles.previewLine}>Điện thoại: {viewingInvoice?.tenant_phone || ''}</Text>

              <View style={[styles.previewRuleBox, isWeb && styles.previewRuleBoxWeb]}>
                <View style={styles.previewRuleBlock}>
                  <Text style={styles.previewRuleTitle}>Công thức hóa đơn tháng</Text>
                  <Text style={styles.previewRuleText}>Tiền phòng + điện theo chỉ số công tơ + nước theo đầu người + dịch vụ cố định.</Text>
                </View>
                <View style={styles.previewRuleBlock}>
                  <Text style={styles.previewRuleTitle}>Trạng thái kỳ hóa đơn</Text>
                  <Text style={styles.previewRuleText}>{viewingInvoice?.status === 'paid' ? "Tiền phòng tháng này đã được thu." : 'Đang chờ thu và đối soát.'}</Text>
                </View>
              </View>

              {viewingInvoice?.invoice_note ? (
                <View style={styles.previewNoteBox}>
                  <Text style={styles.previewNoteTitle}>Ghi chú từ chủ nhà:</Text>
                  <Text style={styles.previewNoteText}>{viewingInvoice.invoice_note}</Text>
                </View>
              ) : null}

              <View style={styles.previewTable}>
                <View style={styles.previewTableHead}>
                  <Text style={[styles.previewCol, { flex: 2 }]}>Khoản thu</Text>
                  <Text style={[styles.previewCol, { flex: 3 }]}>Chi tiết</Text>
                  <Text style={[styles.previewCol, { flex: 2, textAlign: 'right' }]}>Số tiền</Text>
                </View>
                <View style={styles.previewTableRow}>
                  <Text style={[styles.previewCell, { flex: 2 }]}>Tiền phòng</Text>
                  <Text style={[styles.previewCell, { flex: 3 }]}>Cố định</Text>
                  <Text style={[styles.previewCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(viewingInvoice?.room_fee || 0)}</Text>
                </View>
                {(viewingInvoice?.items || []).map((item, idx) => (
                  <View key={`${idx}-${item.name}`} style={styles.previewTableRow}>
                    <Text style={[styles.previewCell, { flex: 2 }]}>{item.name}</Text>
                    <Text style={[styles.previewCell, { flex: 3 }]}>{item.detail || ''}</Text>
                    <Text style={[styles.previewCell, { flex: 2, textAlign: 'right' }]}>{formatCurrency(item.amount || 0)}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.previewSummaryRow, isWeb && styles.previewSummaryRowWeb]}>
                <SurfaceCard tone="low" style={styles.previewSummaryCard}>
                  <Text style={styles.previewSummaryLabel}>Tiền phòng</Text>
                  <Text style={styles.previewSummaryValue}>{formatCurrency(viewingInvoice?.room_fee || 0)}</Text>
                </SurfaceCard>
                <SurfaceCard tone="low" style={styles.previewSummaryCard}>
                  <Text style={styles.previewSummaryLabel}>Dịch vụ</Text>
                  <Text style={styles.previewSummaryValue}>
                    {formatCurrency(previewItemsTotal)}
                  </Text>
                </SurfaceCard>
                <SurfaceCard tone="low" style={styles.previewSummaryCard}>
                  <Text style={styles.previewSummaryLabel}>Nợ kỳ trước</Text>
                  <Text style={styles.previewSummaryValue}>{formatCurrency(viewingInvoice?.previous_debt || 0)}</Text>
                </SurfaceCard>
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.previewLine}>Nợ kỳ trước: {formatCurrency(viewingInvoice?.previous_debt || 0)}</Text>
                <Text style={styles.totalText}>Tổng cần thanh toán: {formatCurrency(viewingInvoice?.total_amount || 0)}</Text>
              </View>

              <View style={styles.qrRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLine}>Ngân hàng: {bankConfig?.bank_id || 'N/A'}</Text>
                  <Text style={styles.previewLine}>Số tài khoản: {bankConfig?.account_no || 'N/A'}</Text>
                  <Text style={styles.previewLine}>Chủ tài khoản: {bankConfig?.account_name || 'N/A'}</Text>
                </View>
                <View style={styles.qrBox}>
                  {bankConfig?.qr_uri ? (
                    <Image source={{ uri: bankConfig.qr_uri }} style={{ width: 96, height: 96, borderRadius: 4 }} />
                  ) : (
                    <QRCode value={vietQrValue} size={96} color="#000" backgroundColor="#fff" />
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.previewActions, isWeb && styles.previewActionsWeb, { maxWidth: previewMaxWidth }]}>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteInvoice(viewingInvoice)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
              {viewingInvoice?.status !== 'paid' ? (
                <TouchableOpacity style={styles.paidBtn} onPress={() => handleMarkPaid(viewingInvoice)}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                  <Text style={styles.paidText}>Đánh dấu đã thu</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentScroll: { flex: 1 },
  contentScrollContainer: { paddingBottom: 90 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  contentWeb: { width: '100%', alignSelf: 'center', paddingTop: 20 },
  periodToolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  periodPickerBtn: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surfaceLowest,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodPickerText: { color: COLORS.primary, fontSize: 12, ...FONTS.bold },
  periodToolbarMeta: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLow,
  },
  periodToolbarMetaText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  heroRow: { gap: 10 },
  heroRowWeb: { flexDirection: 'row', alignItems: 'stretch' },
  kpiRow: { flexDirection: 'row', gap: 10, flex: 1 },
  kpiCard: { flex: 1 },
  kpiLabel: { ...TYPOGRAPHY.label, color: COLORS.textMuted },
  kpiValue: { marginTop: 4, fontSize: 21, ...FONTS.bold, color: COLORS.textPrimary },
  heroNote: { flex: 0.95, justifyContent: 'center' },
  heroEyebrow: { color: COLORS.textMuted, fontSize: 11, ...FONTS.bold, letterSpacing: 0.4 },
  heroTitle: { marginTop: 8, fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  heroText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  entryActions: { gap: 10, marginTop: 12 },
  entryActionsWeb: { flexDirection: 'row', alignItems: 'stretch' },
  entryActionCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOW.sm,
  },
  entryActionPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  entryActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryActionIconSoft: {
    backgroundColor: COLORS.primaryLight,
  },
  entryActionTitle: { color: '#fff', fontSize: 14, ...FONTS.bold },
  entryActionText: { marginTop: 4, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 18, ...FONTS.medium },
  entryActionTitleDark: { color: COLORS.textPrimary, fontSize: 14, ...FONTS.bold },
  entryActionTextDark: { marginTop: 4, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, ...FONTS.medium },
  filterRow: { gap: 8, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surfaceLow },
  filterChipActive: { backgroundColor: COLORS.primaryDark },
  filterText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  filterTextActive: { color: '#fff' },
  sectionRow: { gap: 10, marginBottom: 4 },
  sectionRowWeb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, color: COLORS.textPrimary, ...FONTS.bold },
  sectionText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  sectionPill: {
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionPillText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.bold },
  emptyWrap: { alignItems: 'center', marginTop: 48 },
  emptyText: { marginTop: 8, fontSize: 13, color: COLORS.textMuted, ...FONTS.medium },
  contractList: { marginTop: 2 },
  contractCard: { marginBottom: 10 },
  contractCardWeb: { borderWidth: 1, borderColor: COLORS.borderSoft },
  contractHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  roomName: { fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  tenantName: { marginTop: 2, fontSize: 12, color: COLORS.textMuted, ...FONTS.medium },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 10, ...FONTS.bold },
  primaryLineBtn: { height: 42, borderRadius: 12, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  primaryLineBtnWeb: { justifyContent: 'flex-start', paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.borderSoft },
  primaryLineText: { fontSize: 12, color: COLORS.primary, ...FONTS.bold },
  createBox: { gap: 10 },
  createBoxWeb: { borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: 14, padding: 14, backgroundColor: COLORS.surfaceLow },
  inlineNotice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLowest,
    padding: 12,
  },
  inlineNoticeText: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  meterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meterName: { flex: 1, fontSize: 12, color: COLORS.textPrimary, ...FONTS.semibold },
  meterInputs: { flexDirection: 'row', gap: 8 },
  meterInput: { width: 72, height: 38, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, fontSize: 13, color: COLORS.textPrimary, ...FONTS.bold, backgroundColor: '#fff' },
  checkoutInput: { height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, fontSize: 12, color: COLORS.textPrimary, backgroundColor: '#fff' },
  formHint: { fontSize: 11, lineHeight: 16, color: COLORS.textMuted, ...FONTS.medium },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cancelBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: COLORS.surfaceLow, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, ...FONTS.bold },
  createBtn: { flex: 1.5, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#fff', ...FONTS.bold },
  existingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  existingRowWeb: { gap: 16 },
  existingMeta: { flex: 1 },
  existingAmount: { fontSize: 20, color: COLORS.textPrimary, ...FONTS.bold },
  existingSub: { marginTop: 2, fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  existingInfoRow: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  existingInfoText: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium },
  detailBtn: { height: 36, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  detailBtnText: { color: '#fff', ...FONTS.bold, fontSize: 12 },
  previewRoot: { flex: 1, backgroundColor: COLORS.surface },
  previewCard: { marginHorizontal: 16, marginTop: 10, backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 16, ...SHADOW.md },
  previewCardWeb: { width: '100%', alignSelf: 'center' },
  previewTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: 12 },
  previewLine: { fontSize: 12, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 3 },
  previewRuleBox: { marginTop: 14, gap: 10 },
  previewRuleBoxWeb: { flexDirection: 'row' },
  previewRuleBlock: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surfaceLow,
    padding: 12,
  },
  previewRuleTitle: { fontSize: 12, color: COLORS.textPrimary, ...FONTS.bold },
  previewRuleText: { marginTop: 6, fontSize: 11, lineHeight: 18, color: COLORS.textSecondary, ...FONTS.medium },
  previewNoteBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#fdfbf7', borderWidth: 1, borderColor: '#fcd34d' },
  previewNoteTitle: { fontSize: 12, color: '#b45309', ...FONTS.bold, marginBottom: 4 },
  previewNoteText: { fontSize: 12, color: '#92400e', lineHeight: 18, ...FONTS.medium },
  previewTable: { marginTop: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  previewTableHead: { flexDirection: 'row', backgroundColor: COLORS.surfaceLow, paddingVertical: 8, paddingHorizontal: 8 },
  previewTableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.borderSoft, paddingVertical: 8, paddingHorizontal: 8 },
  previewCol: { fontSize: 11, color: COLORS.textSecondary, ...FONTS.bold },
  previewCell: { fontSize: 11, color: COLORS.textPrimary, ...FONTS.medium },
  previewSummaryRow: { gap: 10, marginTop: 12 },
  previewSummaryRowWeb: { flexDirection: 'row' },
  previewSummaryCard: { flex: 1 },
  previewSummaryLabel: { fontSize: 11, color: COLORS.textMuted, ...FONTS.medium },
  previewSummaryValue: { marginTop: 6, fontSize: 16, color: COLORS.textPrimary, ...FONTS.bold },
  totalBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderSoft, paddingTop: 10 },
  totalText: { marginTop: 4, fontSize: 14, color: COLORS.primary, ...FONTS.bold },
  qrRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qrBox: { width: 104, height: 104, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderSoft, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  previewActions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 },
  previewActionsWeb: { width: '100%', alignSelf: 'center' },
  deleteBtn: { width: 60, height: 48, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },
  deleteText: { marginTop: 2, fontSize: 10, color: COLORS.danger, ...FONTS.bold },
  paidBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  paidText: { color: '#fff', ...FONTS.bold },
});
