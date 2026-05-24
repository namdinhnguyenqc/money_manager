/**
 * TrọCare Mobile — Profile Screen
 * View & edit owner profile info (fullName, phone, idCard, address).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { loadProfile, updateProfile, type OwnerProfile } from '@/lib/profile';
import { useAuthStore } from '@/store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    idCard: '',
    address: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const p = await loadProfile();
      setProfile(p);
      if (p) {
        setForm({
          fullName: p.fullName || '',
          phone: p.phone || '',
          idCard: p.idCard || '',
          address: p.address || p.addressLine || '',
        });
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        idCard: form.idCard.trim(),
        address: form.address.trim(),
      });
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ.');
      setEditing(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
          <CardSkeleton /><CardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hồ sơ tài khoản</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
            <Text style={[styles.headerAction, saving && { opacity: 0.5 }]}>
              {editing ? (saving ? 'Đang lưu...' : 'Lưu') : 'Sửa'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={Colors.textWhite} />
          </View>
          <Text style={styles.avatarName}>{profile?.fullName || 'Chủ trọ'}</Text>
          <Text style={styles.avatarEmail}>{user?.email}</Text>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <InfoRow
            icon="person-outline"
            label="Họ và tên"
            value={form.fullName}
            editing={editing}
            onChangeText={(v) => setForm({ ...form, fullName: v })}
            placeholder="Nguyễn Văn A"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="call-outline"
            label="Số điện thoại"
            value={form.phone}
            editing={editing}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            placeholder="0912345678"
            keyboardType="phone-pad"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="card-outline"
            label="CCCD / CMND"
            value={form.idCard}
            editing={editing}
            onChangeText={(v) => setForm({ ...form, idCard: v })}
            placeholder="001234567890"
            keyboardType="number-pad"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="location-outline"
            label="Địa chỉ"
            value={form.address}
            editing={editing}
            onChangeText={(v) => setForm({ ...form, address: v })}
            placeholder="123 Đường ABC, Quận 1"
          />
        </Card>

        {/* Email (readonly) */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={16} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'Chưa cập nhật'}</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textMuted} />
          </View>
        </Card>

        {editing && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); fetchData(); }}>
            <Text style={styles.cancelBtnText}>Hủy chỉnh sửa</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

function InfoRow({
  icon, label, value, editing, onChangeText, placeholder, keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={styles.infoInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={[styles.infoValue, !value && styles.infoEmpty]}>
            {value || 'Chưa cập nhật'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 18, fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary, letterSpacing: -0.3,
  },
  headerAction: {
    fontSize: 15, fontFamily: Typography.fontFamily.semibold,
    color: Colors.primary,
  },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarName: {
    fontSize: 20, fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary, letterSpacing: -0.4,
  },
  avatarEmail: {
    fontSize: 13, fontFamily: Typography.fontFamily.regular,
    color: Colors.textMuted, marginTop: 2,
  },
  infoCard: { padding: 0, marginBottom: 12, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  infoIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11, fontFamily: Typography.fontFamily.semibold,
    color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15, fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary,
  },
  infoEmpty: { color: Colors.textMuted, fontStyle: 'italic' },
  infoInput: {
    fontSize: 15, fontFamily: Typography.fontFamily.medium,
    color: Colors.textPrimary, borderBottomWidth: 1,
    borderBottomColor: Colors.primary, paddingVertical: 2,
  },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 14 },
  cancelBtn: {
    alignItems: 'center', padding: 14, marginTop: 8,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  cancelBtnText: {
    fontSize: 15, fontFamily: Typography.fontFamily.medium,
    color: Colors.danger,
  },
});
