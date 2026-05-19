import apiClient from './apiClient';

export const emptyProfileForm = {
  fullName: '',
  phone: '',
  provinceCode: '',
  provinceName: '',
  districtCode: '',
  districtName: '',
  addressLine: '',
  avatarUrl: null,
};

export const profileToForm = (profile, user) => ({
  ...emptyProfileForm,
  fullName: profile?.fullName || user?.name || '',
  phone: profile?.phone || '',
  provinceCode: profile?.provinceCode || '',
  provinceName: profile?.provinceName || '',
  districtCode: profile?.districtCode || '',
  districtName: profile?.districtName || '',
  addressLine: profile?.addressLine || '',
  avatarUrl: profile?.avatarUrl || user?.avatarUrl || null,
});

export const validateProfileForm = (values) => {
  const errors = {};
  const phone = values.phone.trim();

  if (values.fullName.trim().length < 2) errors.fullName = 'Vui lòng nhập họ tên';
  if (!/^(0|\+84)\d{9,10}$/.test(phone)) errors.phone = 'Vui lòng nhập số điện thoại hợp lệ';
  if (!values.provinceCode) errors.provinceCode = 'Vui lòng chọn tỉnh/thành phố';
  if (!values.districtCode) errors.districtCode = 'Vui lòng chọn quận/huyện';
  if (values.addressLine.trim().length < 5) errors.addressLine = 'Vui lòng nhập địa chỉ chi tiết';

  return errors;
};

export const getMyProfile = () => apiClient.get('/me/profile');

export const completeProfile = (values) => {
  const { avatarUrl: _avatarUrl, ...payload } = values;
  return apiClient.post('/me/profile/complete', payload);
};

export const updateProfile = (values) => apiClient.put('/me/profile', values);

export const getProvinces = async () => {
  const res = await apiClient.get('/locations/provinces');
  return res.data || [];
};

export const getDistricts = async (provinceCode) => {
  if (!provinceCode) return [];
  const res = await apiClient.get(`/locations/districts?provinceCode=${encodeURIComponent(provinceCode)}`);
  return res.data || [];
};
