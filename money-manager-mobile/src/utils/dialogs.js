import { Alert, Platform } from 'react-native';

const canUseBrowserDialogs = Platform.OS === 'web' && typeof window !== 'undefined';

export const confirmDialog = async ({ title, message, confirmText = 'OK' }) => {
  if (canUseBrowserDialogs) {
    return window.confirm([title, message].filter(Boolean).join('\n\n'));
  }

  return await new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Huy', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, onPress: () => resolve(true) },
    ]);
  });
};

export const promptDialog = async ({ title, message, defaultValue = '' }) => {
  if (canUseBrowserDialogs) {
    const value = window.prompt([title, message].filter(Boolean).join('\n\n'), defaultValue);
    if (value === null) return null;
    return String(value);
  }

  if (typeof Alert.prompt === 'function') {
    return await new Promise((resolve) => {
      Alert.prompt(
        title,
        message,
        [
          { text: 'Huy', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Xac nhan', onPress: (value) => resolve(value ?? '') },
        ],
        'plain-text',
        defaultValue
      );
    });
  }

  return null;
};
