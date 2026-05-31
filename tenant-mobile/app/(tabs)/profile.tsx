/**
 * TrọCare Tenant Mobile — Profile Tab
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Typography from '@/constants/Typography';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { changePassword } from '@/lib/auth';

export default function ProfileTab() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Change password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [showPass3, setShowPass3] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await apiGet<any>('/tenant/me');
      setProfileData(res?.data ?? res);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường mật khẩu.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi mật khẩu', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Mật khẩu xác nhận mới không trùng khớp.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword.trim(), newPassword.trim());
      setShowPasswordModal(false);
      Alert.alert('Thành công', 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.', [
        {
          text: 'Đồng ý',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]);
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace(/\s/g, '');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const contract = profileData?.contract;
  const room = contract?.room;
  const services = contract?.appliedServices || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      
      {/* 👤 Premium User Info Card */}
      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={styles.avatarGlow}>
            <Ionicons name="person" size={28} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{profileData?.name || user?.name}</Text>
            <Text style={styles.userPhone}>{profileData?.phone || user?.phone}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Khách thuê trọ</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* 📄 Contract Summary */}
      {contract ? (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Thông tin hợp đồng thuê</Text>
          <Card style={styles.contractCard}>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <StatusBadge status={contract.status} type="contract" />
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã phòng</Text>
              <Text style={styles.infoValue}>{room?.name || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nhà trọ</Text>
              <Text style={styles.infoValue}>{room?.boardingHouse?.name || 'N/A'}</Text>
            </View>

            {room?.boardingHouse?.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
                  {room.boardingHouse.address}
                </Text>
              </View>
            )}

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền phòng/tháng</Text>
              <Text style={[styles.infoValue, { fontFamily: Typography.fontFamily.bold, color: Colors.primary }]}>
                {formatMoney(contract.rentAmount)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tiền đặt cọc</Text>
              <Text style={styles.infoValue}>{formatMoney(contract.deposit)}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày bắt đầu</Text>
              <Text style={styles.infoValue}>{contract.startDate}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày hết hạn</Text>
              <Text style={styles.infoValue}>{contract.endDate || 'Vô thời hạn'}</Text>
            </View>

            {/* Contract file action button */}
            {contract.fileUrl ? (
              <View style={styles.contractFileSection}>
                <TouchableOpacity
                  style={styles.viewContractBtn}
                  onPress={() => {
                    if (contract.fileUrl) {
                      Linking.openURL(contract.fileUrl).catch(() =>
                        Alert.alert('Lỗi', 'Không thể mở file hợp đồng. Vui lòng thử lại.')
                      );
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-attach-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewContractBtnText}>Xem file hợp đồng</Text>
                  <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noFileNote}>
                <Ionicons name="document-outline" size={14} color="#94A3B8" />
                <Text style={styles.noFileText}>Chủ trọ chưa đính kèm file hợp đồng</Text>
              </View>
            )}

          </Card>
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Bạn hiện chưa có hợp đồng thuê phòng trọ nào được kích hoạt.</Text>
        </Card>
      )}

      {/* 👤 Tenant Basic Info */}
      {(profileData?.idCard || profileData?.address || profileData?.linkedAt) && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <Card style={styles.contractCard}>
            {profileData?.idCard && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số CMND/CCCD</Text>
                <Text style={styles.infoValue}>{profileData.idCard}</Text>
              </View>
            )}
            {profileData?.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ thường trú</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', marginLeft: 12 }]} numberOfLines={2}>
                  {profileData.address}
                </Text>
              </View>
            )}
            {profileData?.linkedAt && (
              <>
                {(profileData?.idCard || profileData?.address) && <View style={styles.separator} />}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ngày liên kết tài khoản</Text>
                  <Text style={styles.infoValue}>
                    {new Date(profileData.linkedAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </>
            )}
          </Card>
        </View>
      )}

      {/* 🛠️ Applied Services List */}
      {services.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Các dịch vụ đăng ký</Text>
          <Card style={styles.servicesCard}>
            {services.map((srv: any, idx: number) => {
              const unitLabel = srv.unit === 'kwh' ? 'kWh' : srv.unit === 'm3' ? 'm³' : srv.unit;
              const calcLabel = srv.calculation_type === 'metered' ? 'Số điện nước' : 'Cố định';
              return (
                <View key={srv.id || idx}>
                  <View style={styles.srvRow}>
                    <View style={styles.srvLeft}>
                      <Ionicons name="settings-outline" size={16} color={Colors.primary} />
                      <View>
                        <Text style={styles.srvName}>{srv.name}</Text>
                        <Text style={styles.srvCalc}>{calcLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.srvPrice}>
                      {formatMoney(srv.unit_price)}/{unitLabel}
                    </Text>
                  </View>
                  {idx < services.length - 1 && <View style={styles.separator} />}
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* ⚙️ Security Settings */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Bảo mật tài khoản</Text>
        <TouchableOpacity 
          style={styles.btnChangePassword} 
          onPress={() => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(true);
          }} 
          activeOpacity={0.8}
        >
          <Ionicons name="key-outline" size={20} color={Colors.primary} />
          <Text style={styles.btnChangePasswordText}>Thay đổi mật khẩu đăng nhập</Text>
        </TouchableOpacity>
      </View>

      {/* 🔴 Control Button */}
      <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.btnLogoutText}>Đăng xuất khỏi tài khoản</Text>
      </TouchableOpacity>

      {/* 🔒 Change Password Sliding Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalClose}>
                <Ionicons name="close-outline" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalDescription}>
                Vui lòng điền đầy đủ các thông tin bên dưới để cập nhật mật khẩu đăng nhập mới.
              </Text>

              <View style={{ gap: 16, marginTop: 12 }}>
                <View style={{ position: 'relative' }}>
                  <Input
                    label="Mật khẩu hiện tại"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showPass1}
                    leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#64748B" />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPass1(!showPass1)}>
                        <Ionicons name={showPass1 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748B" />
                      </TouchableOpacity>
                    }
                  />
                </View>

                <View style={{ position: 'relative' }}>
                  <Input
                    label="Mật khẩu mới"
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPass2}
                    leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color="#64748B" />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPass2(!showPass2)}>
                        <Ionicons name={showPass2 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748B" />
                      </TouchableOpacity>
                    }
                  />
                </View>

                <View style={{ position: 'relative' }}>
                  <Input
                    label="Xác nhận mật khẩu mới"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPass3}
                    leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color="#64748B" />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPass3(!showPass3)}>
                        <Ionicons name={showPass3 ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748B" />
                      </TouchableOpacity>
                    }
                  />
                </View>
              </View>

              <Button
                title="Cập nhật mật khẩu"
                onPress={handleChangePassword}
                loading={passwordLoading}
                style={{ marginTop: 28, marginBottom: 20 }}
              />

            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90, // safe tabs bottom dock padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F6',
  },
  userCard: {
    padding: 20,
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 113, 227, 0.15)',
  },
  userName: {
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(13, 148, 136, 0.2)',
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.success,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  contractCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.semibold,
    color: '#0F172A',
  },
  separator: {
    height: 0.8,
    backgroundColor: '#EAEAEF',
    marginVertical: 8,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    textAlign: 'center',
  },
  contractFileSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 0.8,
    borderTopColor: '#EAEAEF',
  },
  viewContractBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  viewContractBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  noFileNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.8,
    borderTopColor: '#EAEAEF',
  },
  noFileText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  servicesCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  srvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  srvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  srvName: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
  },
  srvCalc: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#94A3B8',
    marginTop: 1,
  },
  srvPrice: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.bold,
    color: '#334155',
  },
  btnChangePassword: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 113, 227, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  btnChangePasswordText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.primary,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  btnLogoutText: {
    fontSize: 13.5,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)', // translucent slate overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#EAEAEF',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalDescription: {
    fontSize: 12.5,
    fontFamily: Typography.fontFamily.medium,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
});
