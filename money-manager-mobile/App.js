import 'react-native-gesture-handler';
import { initLogger } from './src/utils/logger';
if (__DEV__) {
  initLogger();
}
import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { initDb } from './src/database/db';
import { COLORS } from './src/theme';
import { AuthProvider } from './src/contexts/AuthContext';
import { configureGoogleSignIn } from './src/services/authService';

const DB_AUTO_RELOAD_KEY = '__mmDbAutoReloaded';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Root render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={[styles.center, { padding: 40 }]}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
          <Text style={{ marginTop: 20, fontSize: 18, color: COLORS.textPrimary, textAlign: 'center', fontWeight: 'bold' }}>
            App render error
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);
  const shouldReloadForError =
    typeof window !== 'undefined' &&
    typeof error === 'string' &&
    error.includes('Reload page');

  const setup = useCallback(async () => {
    setError(null);
    setDbReady(false);
    try {
      configureGoogleSignIn('231632049960-g6ji40vdfprdl8dq6otnatl8llt6utuk.apps.googleusercontent.com');
      await initDb();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.sessionStorage?.removeItem(DB_AUTO_RELOAD_KEY);

        // STABLE WEB LAYOUT
        const style = document.createElement('style');
        style.innerHTML = `
          html, body, #root {
            width: 100%;
            height: 100vh;
            margin: 0;
            padding: 0;
            overflow: hidden !important;
          }
          #root {
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
        `;
        document.head.appendChild(style);
      }
      setDbReady(true);
    } catch (e) {
      console.error('Database init failed:', e);
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        String(e?.message || '').includes('Reload page') &&
        !window.sessionStorage?.getItem(DB_AUTO_RELOAD_KEY)
      ) {
        window.sessionStorage.setItem(DB_AUTO_RELOAD_KEY, '1');
        window.location.reload();
        return;
      }
      setError(e.message || 'Database initialization failed');
    }
  }, []);

  useEffect(() => {
    setup();
  }, [setup]);

  if (error) {
    return (
      <View style={[styles.center, { padding: 40 }]}> 
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
        <Text style={{ marginTop: 20, fontSize: 18, color: COLORS.textPrimary, textAlign: 'center', fontWeight: 'bold' }}>
          Oops, something went wrong!
        </Text>
        <Text style={{ marginTop: 10, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 30, backgroundColor: COLORS.primary, padding: 15, borderRadius: 10 }}
          onPress={() => {
            if (shouldReloadForError) {
              window.location.reload();
              return;
            }
            setup();
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <RootErrorBoundary>
      <AuthProvider>
        <View style={styles.appRoot}>
          <AppNavigator />
        </View>
      </AuthProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
