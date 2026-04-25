import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  TextInput,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';
import { getRooms, addTenant, addContract, getBankConfig } from '../database/queries';
import { formatCurrency } from '../utils/format';

export default function TenantLandingScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bankConfig, setBankConfig] = useState(null);

  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load Rooms (Fake default walletId for preview, or load globally)
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Assuming walletId can be null to fetch all, or we fetch a specific one. 
        // For preview purpose, fetching all rooms.
        const [data, config] = await Promise.all([
          getRooms(null),
          getBankConfig()
        ]);
        setRooms(data || []);
        setBankConfig(config);
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }).start();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fadeAnim]);

  // Lọc ra các phòng trống
  const vacantRooms = rooms.filter(r => r.status !== 'occupied');

  const scrollToRooms = () => {
    const isWeb = Platform.OS === 'web';
    if (isWeb && window) {
      // Find the header height roughly
      window.scrollTo({ top: 600, behavior: 'smooth' });
    } else {
      scrollViewRef.current?.scrollTo({ y: 550, animated: true });
    }
  };

  const handleBooking = () => {
    if (!contactName || !contactPhone) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và số điện thoại để chúng tôi liên hệ.');
      return;
    }
    Alert.alert('Thành công', 'Cảm ơn ' + contactName + '. Host sẽ liên hệ ngay qua số ' + contactPhone);
    setContactName('');
    setContactPhone('');
  };

  const contentMaxWidth = width >= 1440 ? 1200 : width >= 1024 ? 1024 : width;
  const isWeb = Platform.OS === 'web';
  const roomCardBasis = width >= 1024 ? '31.5%' : width >= 760 ? '48%' : '100%';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Absolute top navbar for preview exit */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          <Text style={styles.navBackText}>Quay lại quản trị</Text>
        </TouchableOpacity>
        <View style={styles.navCall}>
          <Ionicons name="call" size={16} color={COLORS.primary} />
          <Text style={styles.navCallText}>{bankConfig?.phone || 'Hotline'}</Text>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1, width: '100%' }}
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* HERO SECTION */}
          <View style={[styles.heroSection, isWeb && styles.heroSectionWeb]}>
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Overlay pattern representation */}
            <View style={styles.heroPattern} />
            
            <View style={[styles.heroContent, { maxWidth: contentMaxWidth }]}>
              <View style={styles.badgeWrap}>
                <Text style={styles.heroBadge}>KHÔNG GIAN SỐNG LÝ TƯỞNG</Text>
              </View>
              <Text style={styles.heroTitle}>
                Phòng trọ tiện nghi,{'\n'}Tự do giờ giấc tại Trung tâm
              </Text>
              <Text style={styles.heroSubtitle}>
                Chỉ còn {vacantRooms.length} phòng trống. An ninh tuyệt đối, trang bị đầy đủ nội thất và dịch vụ dọn dẹp hàng tuần.
              </Text>
              <TouchableOpacity activeOpacity={0.8} style={styles.heroBtn} onPress={scrollToRooms}>
                <Text style={styles.heroBtnText}>Xem phòng trống</Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.primaryDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ROOMS SECTION */}
          <View style={[styles.container, { maxWidth: contentMaxWidth }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionSubTitle}>LỰA CHỌN CỦA BẠN</Text>
              <Text style={styles.sectionTitle}>Danh sách phòng trống</Text>
              <View style={styles.titleUnderline} />
            </View>

            {vacantRooms.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="sad-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>Hiện tại đã hết phòng</Text>
                <Text style={styles.emptyText}>Vui lòng để lại thông tin, chúng tôi sẽ báo cho bạn khi có phòng trống.</Text>
              </View>
            ) : (
              <View style={styles.roomGrid}>
                {vacantRooms.map((room) => (
                  <View key={room.id} style={[styles.roomCard, { width: roomCardBasis }]}>
                    {/* Fake Room Image */}
                    <View style={styles.roomImageWrap}>
                      <LinearGradient
                        colors={[COLORS.surfaceHigh, COLORS.surfaceContainer]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Ionicons name="home-outline" size={48} color={COLORS.borderStrong} style={{ opacity: 0.5 }} />
                      <View style={styles.roomTag}>
                        <Text style={styles.roomTagText}>P.{room.name}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.roomBody}>
                      <Text style={styles.roomPrice}>{formatCurrency(room.price || 0)} /tháng</Text>
                      
                      <View style={styles.roomAmenities}>
                        <View style={styles.amenityItem}>
                          <Ionicons name="snow-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.amenityText}>{room.has_ac ? 'Có Điều hòa' : 'Quạt trần'}</Text>
                        </View>
                        <View style={styles.amenityItem}>
                          <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.amenityText}>Tối đa {room.num_people || 2} người</Text>
                        </View>
                        <View style={styles.amenityItem}>
                          <Ionicons name="wifi-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.amenityText}>Internet tốc độ cao</Text>
                        </View>
                      </View>

                      <TouchableOpacity style={styles.bookBtn} onPress={() => {
                        Alert.alert('Thông tin phòng', `Bạn đang quan tâm phòng ${room.name}. Vui lòng điền form liên hệ bên dưới để chúng tôi gọi lại.`);
                        if (isWeb && window) {
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        } else {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }
                      }}>
                        <Text style={styles.bookBtnText}>Nhận Tư Vấn</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* TRUST & FORM SECTION */}
            <View style={styles.bookingCard}>
              <View style={styles.bookingInfo}>
                <Ionicons name="shield-checkmark" size={42} color={COLORS.success} />
                <Text style={styles.bookingTitle}>An tâm thuê phòng</Text>
                <Text style={styles.bookingText}>Hợp đồng rõ ràng minh bạch. Cam kết không phát sinh chi phí ẩn. Hỗ trợ xử lý sự cố trong 24h.</Text>
              </View>
              
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Đăng ký nhận tư vấn</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Họ và tên</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nguyễn Văn A"
                    value={contactName}
                    onChangeText={setContactName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Số điện thoại</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09xx xxx xxx"
                    keyboardType="phone-pad"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                  />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleBooking}>
                  <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfacePage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  navBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  navBackText: { fontSize: 13, ...FONTS.bold, color: COLORS.textPrimary },
  navCall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  navCallText: { fontSize: 13, ...FONTS.bold, color: COLORS.primaryDark },
  
  heroSection: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  heroSectionWeb: {
    paddingVertical: 120,
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    backgroundColor: '#fff', // Fake pattern using just an overlay
  },
  heroContent: {
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
  },
  badgeWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: 24,
  },
  heroBadge: {
    color: '#fff',
    fontSize: 12,
    letterSpacing: 2,
    ...FONTS.bold,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 46,
    color: '#fff',
    ...FONTS.black,
    marginBottom: 20,
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.9)',
    ...FONTS.medium,
    maxWidth: 600,
    marginBottom: 40,
  },
  heroBtn: {
    backgroundColor: '#fff',
    height: 54,
    borderRadius: RADIUS.full,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...SHADOW.md,
  },
  heroBtnText: {
    color: COLORS.primaryDark,
    fontSize: 15,
    ...FONTS.bold,
  },

  container: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  sectionHeader: { alignItems: 'center', marginBottom: 40 },
  sectionSubTitle: { color: COLORS.primary, fontSize: 12, ...FONTS.bold, letterSpacing: 1.5 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 28, ...FONTS.black, marginTop: 8 },
  titleUnderline: { width: 40, height: 4, backgroundColor: COLORS.primary, borderRadius: 2, marginTop: 16 },

  roomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 20,
  },
  roomCard: {
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
    marginBottom: 20,
  },
  roomImageWrap: {
    height: 180,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roomTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  roomTagText: { color: '#fff', fontSize: 13, ...FONTS.bold },
  roomBody: {
    padding: 20,
  },
  roomPrice: {
    color: COLORS.primary,
    fontSize: 22,
    ...FONTS.black,
    marginBottom: 16,
  },
  roomAmenities: {
    gap: 8,
    marginBottom: 20,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amenityText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  bookBtn: {
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    ...FONTS.bold,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  emptyTitle: { marginTop: 16, fontSize: 20, color: COLORS.textPrimary, ...FONTS.bold },
  emptyText: { marginTop: 8, color: COLORS.textSecondary, ...FONTS.medium },

  bookingCard: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: COLORS.surfaceLowest,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginTop: 60,
    ...SHADOW.lg,
  },
  bookingInfo: {
    flex: 1,
    backgroundColor: COLORS.surfaceLow,
    padding: 40,
    justifyContent: 'center',
  },
  bookingTitle: {
    marginTop: 24,
    fontSize: 24,
    color: COLORS.textPrimary,
    ...FONTS.black,
  },
  bookingText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  formContainer: {
    flex: 1.2,
    padding: 40,
  },
  formTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.surfacePage,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  submitBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    ...SHADOW.sm,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    ...FONTS.bold,
  }
});
