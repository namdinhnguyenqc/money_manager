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
import { confirmDialog } from '../utils/dialogs';

const stripToDigits = (text) => (text || '').replace(/[^0-9]/g, '');

const buildVietQrValue = (amount, month, year, config) => {
  if (!config?.bank_id || !config?.account_no) return 'https://vietqr.io';
  return `https://qr.sepay.vn/img?bank=${config.bank_id}&acc=${config.account_no}&template=compact&amount=${amount}&des=Tien+phong+T${month}/${year}`;
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tat ca' },
  { id: 'not_created', label: 'Chua lap' },
  { id: 'unpaid', label: 'Cho thu' },
  { id: 'paid', label: 'Da thu' },
];

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const findMeteredService = (services, keyword) =>
  services.find((service) => normalizeText(service.name).includes(keyword));

const sumInvoiceItems = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

const getInvoiceStatusMeta = (invoice) => {
  if (!invoice) {
    return {
      label: 'Chua lap',
      backgroundColor: COLORS.surfaceLow,
      color: COLORS.textMuted,
      subText: 'Chua co hoa don cho ky nay',
    };
  }

  if (invoice.status === 'paid') {
    return {
      label: 'Da thu',
      backgroundColor: COLORS.successLight,
      color: COLORS.secondary,
      subText: 'Tien da vao vi',
    };
  }

  return {
    label: 'Cho thu',
    backgroundColor: COLORS.warningLight,
    color: COLORS.warning,
    subText: 'Dang cho thanh toan',
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
  const electricityMetered = metered.filter((service) => normalizeText(service.name).includes('dien'));
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== 'paid');
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const notCreatedContracts = contracts.filter((contract) => !hasInvoice(contract.id));
  const visibleContracts = contracts.filter((contract) => matchesFilter(filter, hasInvoice(contract.id)));

  const openCreateInvoice = async (contract) => {
    const previousReadings = await getLatestMeterReadings(contract.room_id);
    if (previousReadings) {
      const nextInputs = { ...meterInputs };
      const electricityService = findMeteredService(metered, 'dien');
      const waterService = findMeteredService(metered, 'nuoc');

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
      });
      const invoiceId = await executeCreateInvoice(payload);
      await loadData();
      const detail = await getInvoiceDetails(invoiceId);
      setViewingInvoice(detail);
      setCreatingFor(null);
      setMeterInputs({});
      setCheckoutDateInput('');
    } catch (e) {
      Alert.alert('Loi', e.message || 'Khong the lap bill');
    }
  };

  const handleMarkPaid = (invoice) => {
    (async () => {
      if (!rentalWalletId) {
        Alert.alert('Thieu vi', 'Khong tim thay vi nha tro dang hoat dong de ghi nhan thu tien.');
        return;
      }

      const confirmed = await confirmDialog({
        title: 'Xac nhan da thu',
        message: `Thu ${formatCurrency(invoice.total_amount)} phong ${invoice.room_name}?`,
        confirmText: 'Xac nhan',
      });
      if (!confirmed) return;

      try {
        const txId = await addTransaction({
          type: 'income',
          amount: invoice.total_amount,
          description: `Thu tien phong ${invoice.room_name} T${invoice.month}/${invoice.year}`,
          categoryId: null,
          walletId: rentalWalletId,
          imageUri: null,
          date: new Date().toISOString().split('T')[0],
        });
        await markInvoicePaid(invoice.id, invoice.total_amount, txId);
        await loadData();
        setViewingInvoice(null);
      } catch (e) {
        Alert.alert('Loi', e.message || 'Khong the cap nhat thanh toan');
      }
    })();
  };

  const handleDeleteInvoice = (invoice) => {
    (async () => {
      const confirmed = await confirmDialog({
        title: 'Xoa hoa don',
        message: 'Ban chac chan muon xoa hoa don nay?',
        confirmText: 'Xoa',
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
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: 'Gui hoa don' });
    } catch (e) {
      Alert.alert('Loi', e.message || 'Khong the chia se');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const unpaidCount = unpaidInvoices.length;
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const notCreatedCount = notCreatedContracts.length;
  const paidCount = paidInvoices.length;
  const previewItemsTotal = sumInvoiceItems(viewingInvoice?.items || []);
  const activeFilterLabel = FILTER_OPTIONS.find((option) => option.id === filter)?.label || 'Tat ca';
  const vietQrValue = viewingInvoice
    ? buildVietQrValue(Math.round(viewingInvoice.total_amount || 0), month, year, bankConfig)
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
          title={`Thang ${month}/${year}`}
          subtitle="Hoa don nha tro"
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
                <Text style={styles.periodPickerText}>Ky bill T{month}/{year}</Text>
              </TouchableOpacity>
              <View style={styles.periodToolbarMeta}>
                <Text style={styles.periodToolbarMetaText}>Theo doi trang thai bill trong mot ky va mo nhanh luong thu tien.</Text>
              </View>
            </View>
          ) : null}
          <View style={[styles.heroRow, isWeb && styles.heroRowWeb]}>
            <View style={styles.kpiRow}>
              <SurfaceCard tone="low" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Chua lap</Text>
                <Text style={styles.kpiValue}>{notCreatedCount}</Text>
              </SurfaceCard>
              <SurfaceCard tone="low" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Hoa don cho thu</Text>
                <Text style={styles.kpiValue}>{unpaidCount}</Text>
              </SurfaceCard>
              <SurfaceCard tone="lowest" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Da thu</Text>
                <Text style={[styles.kpiValue, { color: COLORS.secondary }]}>{paidCount}</Text>
              </SurfaceCard>
              <SurfaceCard tone="lowest" style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Du kien thu</Text>
                <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{formatCurrency(unpaidTotal)}</Text>
              </SurfaceCard>
            </View>

            {isWeb ? (
              <SurfaceCard tone="lowest" style={styles.heroNote}>
                <Text style={styles.heroEyebrow}>HOA DON NHA TRO</Text>
                <Text style={styles.heroTitle}>Bang dieu phoi thu tien</Text>
                <Text style={styles.heroText}>Loc theo trang thai, lap bill theo tung hop dong va mo preview de chot thu tien. Luong nghiep vu khong doi, chi chuyen sang bo cuc hop cho website quan tri.</Text>
              </SurfaceCard>
            ) : null}
          </View>

          <View style={[styles.entryActions, isWeb && styles.entryActionsWeb]}>
            <TouchableOpacity style={[styles.entryActionCard, styles.entryActionPrimary]} onPress={() => setFilter('not_created')}>
              <View style={styles.entryActionIcon}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryActionTitle}>Lap bill thang {month}</Text>
                <Text style={styles.entryActionText}>Loc nhanh cac phong chua co hoa don trong thang hien tai.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.entryActionCard} onPress={() => navigation.navigate('SmartBatchBilling')}>
              <View style={[styles.entryActionIcon, styles.entryActionIconSoft]}>
                <Ionicons name="flash-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryActionTitleDark}>Lap hang loat</Text>
                <Text style={styles.entryActionTextDark}>Mo luong lap hoa don nhieu phong neu can thao tac nhanh.</Text>
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
              <Text style={styles.sectionTitle}>Hop dong theo ky bill</Text>
              <Text style={styles.sectionText}>Dang hien {visibleContracts.length} phong theo bo loc {activeFilterLabel.toLowerCase()} trong thang {month}/{year}.</Text>
            </View>
            {isWeb ? (
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Ky T{month}/{year}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.contractList}>
            {contracts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="home-outline" size={56} color={COLORS.border} />
                <Text style={styles.emptyText}>Chua co phong dang cho thue</Text>
              </View>
            ) : visibleContracts.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="filter-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>Khong co phong phu hop voi bo loc hien tai</Text>
              </View>
            ) : (
              visibleContracts.map((c) => {
                const existing = hasInvoice(c.id);
                const statusMeta = getInvoiceStatusMeta(existing);
                return (
                  <SurfaceCard key={c.id} tone="lowest" style={[styles.contractCard, isWeb && styles.contractCardWeb]}>
                    <View style={styles.contractHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomName}>Phong {c.room_name}</Text>
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
                              <Text style={styles.inlineNoticeText}>Hop dong nay chua co dich vu dien dang hoat dong.</Text>
                            </View>
                          ) : electricityMetered.map((svc) => (
                            <View key={svc.id} style={styles.meterRow}>
                              <Text style={styles.meterName}>{svc.icon} {svc.name}</Text>
                              <View style={styles.meterInputs}>
                                <TextInput
                                  style={styles.meterInput}
                                  keyboardType="number-pad"
                                  placeholder="Cu"
                                  value={meterInputs[`${c.id}_${svc.id}_old`]}
                                  onChangeText={(v) => setMeterInputs((prev) => ({ ...prev, [`${c.id}_${svc.id}_old`]: stripToDigits(v) }))}
                                />
                                <TextInput
                                  style={[styles.meterInput, { color: COLORS.primary }]}
                                  keyboardType="number-pad"
                                  placeholder="Moi"
                                  value={meterInputs[`${c.id}_${svc.id}_new`]}
                                  onChangeText={(v) => setMeterInputs((prev) => ({ ...prev, [`${c.id}_${svc.id}_new`]: stripToDigits(v) }))}
                                />
                              </View>
                            </View>
                          ))}
                          <TextInput
                            style={styles.checkoutInput}
                            placeholder="Ngay tra phong (YYYY-MM-DD, neu co)"
                            value={checkoutDateInput}
                            onChangeText={setCheckoutDateInput}
                          />
                          {isWeb ? <Text style={styles.formHint}>Nhap chi so dien thang nay va ngay tra phong neu la bill thanh ly.</Text> : null}
                          <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreatingFor(null)}>
                              <Text style={styles.cancelText}>Huy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.createBtn} onPress={() => handleCreate(c)}>
                              <Text style={styles.createText}>Lap bill</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.primaryLineBtn, isWeb && styles.primaryLineBtnWeb]}
                          onPress={() => openCreateInvoice(c)}
                        >
                          <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                          <Text style={styles.primaryLineText}>Lap bill thang {month}</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <View style={[styles.existingRow, isWeb && styles.existingRowWeb]}>
                        <View style={styles.existingMeta}>
                          <Text style={styles.existingAmount}>{formatCurrency(existing.total_amount)}</Text>
                          <Text style={styles.existingSub}>{statusMeta.subText}</Text>
                          {isWeb ? (
                            <View style={styles.existingInfoRow}>
                              <Text style={styles.existingInfoText}>Ky bill: T{existing.month}/{existing.year}</Text>
                              <Text style={styles.existingInfoText}>Khach: {c.tenant_name}</Text>
                            </View>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={[styles.detailBtn, { backgroundColor: existing.status === 'paid' ? COLORS.secondary : COLORS.primary }]}
                          onPress={() => openInvoiceDetail(existing.id)}
                        >
                          <Text style={styles.detailBtnText}>Chi tiet</Text>
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
            title={`Hoa don phong ${viewingInvoice?.room_name || ''}`}
            subtitle="Invoice preview"
            onBack={() => setViewingInvoice(null)}
            rightIcon="share-social-outline"
            onRightPress={handleShare}
            light
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View ref={invoiceViewRef} collapsable={false} style={[styles.previewCard, isWeb && styles.previewCardWeb, { maxWidth: previewMaxWidth }]}>
              <Text style={styles.previewTitle}>Thong bao tien phong T{month}/{year}</Text>
              <Text style={styles.previewLine}>Khach: {viewingInvoice?.tenant_name}</Text>
              <Text style={styles.previewLine}>Phong: {viewingInvoice?.room_name}</Text>
              <Text style={styles.previewLine}>Dien thoai: {viewingInvoice?.tenant_phone || ''}</Text>

              <View style={[styles.previewRuleBox, isWeb && styles.previewRuleBoxWeb]}>
                <View style={styles.previewRuleBlock}>
                  <Text style={styles.previewRuleTitle}>Cong thuc bill thang</Text>
                  <Text style={styles.previewRuleText}>Tien phong + Dien chenh lech chi so + Nuoc theo so nguoi + Dich vu co dinh.</Text>
                </View>
                <View style={styles.previewRuleBlock}>
                  <Text style={styles.previewRuleTitle}>Trang thai ky bill</Text>
                  <Text style={styles.previewRuleText}>{viewingInvoice?.status === 'paid' ? 'Da thu tien phong thang nay.' : 'Dang cho thu tien va doi soat.'}</Text>
                </View>
              </View>

              <View style={styles.previewTable}>
                <View style={styles.previewTableHead}>
                  <Text style={[styles.previewCol, { flex: 2 }]}>Khoan thu</Text>
                  <Text style={[styles.previewCol, { flex: 3 }]}>Chi tiet</Text>
                  <Text style={[styles.previewCol, { flex: 2, textAlign: 'right' }]}>So tien</Text>
                </View>
                <View style={styles.previewTableRow}>
                  <Text style={[styles.previewCell, { flex: 2 }]}>Tien phong</Text>
                  <Text style={[styles.previewCell, { flex: 3 }]}>Co dinh</Text>
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
                  <Text style={styles.previewSummaryLabel}>Tien phong</Text>
                  <Text style={styles.previewSummaryValue}>{formatCurrency(viewingInvoice?.room_fee || 0)}</Text>
                </SurfaceCard>
                <SurfaceCard tone="low" style={styles.previewSummaryCard}>
                  <Text style={styles.previewSummaryLabel}>Dich vu</Text>
                  <Text style={styles.previewSummaryValue}>
                    {formatCurrency(previewItemsTotal)}
                  </Text>
                </SurfaceCard>
                <SurfaceCard tone="low" style={styles.previewSummaryCard}>
                  <Text style={styles.previewSummaryLabel}>No cu</Text>
                  <Text style={styles.previewSummaryValue}>{formatCurrency(viewingInvoice?.previous_debt || 0)}</Text>
                </SurfaceCard>
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.previewLine}>No cu: {formatCurrency(viewingInvoice?.previous_debt || 0)}</Text>
                <Text style={styles.totalText}>Tong can thu: {formatCurrency(viewingInvoice?.total_amount || 0)}</Text>
              </View>

              <View style={styles.qrRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLine}>Ngan hang: {bankConfig?.bank_id || 'N/A'}</Text>
                  <Text style={styles.previewLine}>So TK: {bankConfig?.account_no || 'N/A'}</Text>
                  <Text style={styles.previewLine}>Chu TK: {bankConfig?.account_name || 'N/A'}</Text>
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
                <Text style={styles.deleteText}>Xoa</Text>
              </TouchableOpacity>
              {viewingInvoice?.status !== 'paid' ? (
                <TouchableOpacity style={styles.paidBtn} onPress={() => handleMarkPaid(viewingInvoice)}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                  <Text style={styles.paidText}>Danh dau da thu</Text>
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
  previewTable: { marginTop: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
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
