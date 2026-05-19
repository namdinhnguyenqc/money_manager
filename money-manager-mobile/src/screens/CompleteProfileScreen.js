import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import Logo from '../components/ui/Logo';
import SurfaceCard from '../components/ui/SurfaceCard';
import TopAppBar from '../components/ui/TopAppBar';
import { updateCurrentUser } from '../services/authService';
import {
  completeProfile,
  emptyProfileForm,
  getDistricts,
  getMyProfile,
  getProvinces,
  profileToForm,
  updateProfile,
  validateProfileForm,
} from '../services/profileService';

function SelectField({ label, value, placeholder, disabled, error, onPress }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.select, disabled && styles.disabledInput, error && styles.inputError]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.selectText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function OptionPicker({ visible, title, data, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.code)}
            style={{ maxHeight: 420 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.optionRow} onPress={() => onSelect(item)}>
                <Text style={styles.optionText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có dữ liệu</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function CompleteProfileScreen({ navigation, route }) {
  const mode = route?.params?.mode || 'complete';
  const isEditMode = mode === 'edit';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyProfileForm);
  const [errors, setErrors] = useState({});
  const [email, setEmail] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [picker, setPicker] = useState(null);

  const title = isEditMode ? 'Thông tin chủ trọ' : 'Thiết lập tài khoản';
  const description = isEditMode
    ? 'Cập nhật thông tin liên hệ của chủ trọ. Email, role và provider chỉ đọc.'
    : 'Hoàn tất thông tin chủ trọ để bắt đầu';

  const pickerData = useMemo(() => {
    if (picker === 'province') return provinces;
    if (picker === 'district') return districts;
    return [];
  }, [districts, picker, provinces]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, provinceList] = await Promise.all([getMyProfile(), getProvinces()]);
      setEmail(profileRes?.user?.email || '');
      setForm(profileToForm(profileRes?.profile, profileRes?.user));
      setProvinces(provinceList);
      if (profileRes?.profile?.provinceCode) {
        setDistricts(await getDistricts(profileRes.profile.provinceCode));
      }
      if (!isEditMode && profileRes?.user?.isProfileCompleted) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    } catch (err) {
      setError(err?.message || 'Không tải được hồ sơ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSelect = async (item) => {
    if (picker === 'province') {
      setForm((prev) => ({
        ...prev,
        provinceCode: item.code,
        provinceName: item.name,
        districtCode: '',
        districtName: '',
      }));
      setErrors((prev) => ({ ...prev, provinceCode: '', districtCode: '' }));
      setPicker(null);
      setDistricts(await getDistricts(item.code));
      return;
    }

    if (picker === 'district') {
      setForm((prev) => ({
        ...prev,
        districtCode: item.code,
        districtName: item.name,
      }));
      setErrors((prev) => ({ ...prev, districtCode: '' }));
      setPicker(null);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateProfileForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setError('');
    try {
      const res = isEditMode ? await updateProfile(form) : await completeProfile(form);
      await updateCurrentUser({
        ...res.user,
        name: res.user?.name || form.fullName,
        isProfileCompleted: true,
        onboardingStep: 'DONE',
      });
      if (isEditMode) {
        Alert.alert('Thành công', 'Cập nhật hồ sơ thành công.');
        navigation.goBack();
      } else {
        // Auth state switches the root navigator to Main after the profile is marked complete.
      }
    } catch (err) {
      const fieldErrors = err?.fieldErrors || err?.data?.fieldErrors || err?.data?.details?.fieldErrors || err?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const normalized = {};
        Object.entries(fieldErrors).forEach(([key, value]) => {
          normalized[key] = Array.isArray(value) ? value[0] : String(value);
        });
        setErrors(normalized);
        return;
      }
      setError(err?.message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin tài khoản...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surfacePage} />
      {isEditMode ? (
        <TopAppBar title="Hồ sơ chủ trọ" subtitle={email} onBack={() => navigation.goBack()} light />
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isEditMode ? (
          <View style={styles.hero}>
            <Logo size="lg" />
            <Text style={styles.heroTitle}>Thiết lập tài khoản</Text>
            <Text style={styles.heroSub}>Hoàn tất thông tin chủ trọ để bắt đầu</Text>
          </View>
        ) : null}

        <SurfaceCard tone="lowest" style={styles.card}>
          <Text style={styles.cardTitle}>{isEditMode ? title : 'Hoàn tất hồ sơ'}</Text>
          <Text style={styles.cardSub}>
            {isEditMode
              ? description
              : 'Bạn chỉ cần bổ sung thông tin liên hệ cơ bản một lần để hệ thống tạo hợp đồng, hóa đơn và biên nhận đúng thông tin chủ trọ.'}
          </Text>

          {email ? (
            <View style={styles.emailBox}>
              <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
              <Text style={styles.emailText}>{email}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={form.fullName}
              onChangeText={(text) => setField('fullName', text)}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={form.phone}
              onChangeText={(text) => setField('phone', text.replace(/[^\d+]/g, '').slice(0, 12))}
              placeholder="0901234567"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <SelectField
            label="Tỉnh/thành phố"
            value={form.provinceName}
            placeholder="Chọn tỉnh/thành phố"
            error={errors.provinceCode}
            onPress={() => setPicker('province')}
          />

          <SelectField
            label="Quận/huyện"
            value={form.districtName}
            placeholder="Chọn quận/huyện"
            disabled={!form.provinceCode}
            error={errors.districtCode}
            onPress={() => setPicker('district')}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Địa chỉ chi tiết</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.addressLine && styles.inputError]}
              value={form.addressLine}
              onChangeText={(text) => setField('addressLine', text)}
              placeholder="Số nhà, đường, phường/xã"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            {errors.addressLine ? <Text style={styles.errorText}>{errors.addressLine}</Text> : null}
          </View>

          <TouchableOpacity style={[styles.primaryBtn, saving && styles.disabledBtn]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>{isEditMode ? 'Lưu thay đổi' : 'Hoàn tất'}</Text>}
          </TouchableOpacity>

          {isEditMode ? (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()} disabled={saving}>
              <Text style={styles.secondaryTxt}>Hủy</Text>
            </TouchableOpacity>
          ) : null}
        </SurfaceCard>
      </ScrollView>

      <OptionPicker
        visible={Boolean(picker)}
        title={picker === 'province' ? 'Chọn tỉnh/thành phố' : 'Chọn quận/huyện'}
        data={pickerData}
        onClose={() => setPicker(null)}
        onSelect={handleSelect}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfacePage, padding: 24 },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 13, ...FONTS.medium },
  hero: { alignItems: 'center', marginTop: 14, marginBottom: 18 },
  heroTitle: { marginTop: 14, fontSize: 22, color: COLORS.textPrimary, ...FONTS.black },
  heroSub: { marginTop: 6, fontSize: 13, color: COLORS.textMuted, ...FONTS.medium },
  card: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.borderStrong, ...SHADOW.sm },
  cardTitle: { fontSize: 20, color: COLORS.textPrimary, ...FONTS.bold },
  cardSub: { marginTop: 8, marginBottom: 16, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, ...FONTS.medium },
  emailBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryContainer, padding: 12, marginBottom: 14 },
  emailText: { flex: 1, color: COLORS.primaryDark, fontSize: 13, ...FONTS.semibold },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.dangerLight, backgroundColor: '#fff5f5', padding: 12, marginBottom: 14 },
  errorBoxText: { flex: 1, color: COLORS.danger, fontSize: 13, ...FONTS.medium },
  field: { marginBottom: 14 },
  label: { ...TYPOGRAPHY.label, marginBottom: 7 },
  input: { minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: '#fff', paddingHorizontal: 14, color: COLORS.textPrimary, fontSize: 14, ...FONTS.medium },
  textArea: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  select: { minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: '#fff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectText: { flex: 1, color: COLORS.textPrimary, fontSize: 14, ...FONTS.medium },
  placeholder: { color: COLORS.textMuted },
  disabledInput: { opacity: 0.55 },
  inputError: { borderColor: COLORS.danger },
  errorText: { marginTop: 5, color: COLORS.danger, fontSize: 12, ...FONTS.medium },
  primaryBtn: { height: 50, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6, ...SHADOW.sm },
  primaryTxt: { color: '#fff', fontSize: 15, ...FONTS.bold },
  secondaryBtn: { height: 46, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: '#fff' },
  secondaryTxt: { color: COLORS.textSecondary, fontSize: 14, ...FONTS.bold },
  disabledBtn: { opacity: 0.7 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19, 27, 46, 0.36)' },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pickerTitle: { fontSize: 17, color: COLORS.textPrimary, ...FONTS.bold },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLow },
  optionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft, gap: 12 },
  optionText: { flex: 1, color: COLORS.textPrimary, fontSize: 14, ...FONTS.medium },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, paddingVertical: 24, ...FONTS.medium },
});
