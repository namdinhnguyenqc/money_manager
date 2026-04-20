import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import RentalScreen from '../screens/RentalScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import ServicesScreen from '../screens/ServicesScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TradingScreen from '../screens/TradingScreen';
import WalletsManagerScreen from '../screens/WalletsManagerScreen';
import ContractViewerScreen from '../screens/ContractViewerScreen';
import TradingCategoriesScreen from '../screens/TradingCategoriesScreen';
import BankConfigScreen from '../screens/BankConfigScreen';
import SmartBatchBillingScreen from '../screens/SmartBatchBillingScreen';
import ModulesScreen from '../screens/ModulesScreen';
import LoginScreen from '../screens/LoginScreen';
import { subscribeToAuthChanges } from '../services/authService';
import { isApiDataEnabled } from '../services/dataMode';
import WebDesktopShell from '../components/ui/WebDesktopShell';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function withWebDesktopShell(Component, options) {
  return function WebDesktopScreen(props) {
    if (Platform.OS !== 'web') {
      return <Component {...props} />;
    }

    const title = typeof options.title === 'function' ? options.title(props) : options.title;
    const subtitle = typeof options.subtitle === 'function' ? options.subtitle(props) : options.subtitle;
    const searchPlaceholder = typeof options.searchPlaceholder === 'function'
      ? options.searchPlaceholder(props)
      : options.searchPlaceholder;

    return (
      <WebDesktopShell
        navigation={props.navigation}
        routeName={options.routeName}
        title={title}
        subtitle={subtitle}
        searchPlaceholder={searchPlaceholder}
      >
        <Component {...props} />
      </WebDesktopShell>
    );
  };
}

const WebAnalyticsScreen = withWebDesktopShell(AnalyticsScreen, {
  routeName: 'Analytics',
  title: 'Bao cao & thong ke',
  subtitle: 'Dong tien va hieu suat',
  searchPlaceholder: 'Tim bao cao, danh muc, ky thong ke...',
});

const WebRentalScreen = withWebDesktopShell(RentalScreen, {
  routeName: 'Rental',
  title: (props) => props.route?.params?.walletName || 'Quan ly nha tro',
  subtitle: 'Van hanh phong tro',
  searchPlaceholder: 'Tim phong, khach thue, hoa don...',
});

const WebTradingScreen = withWebDesktopShell(TradingScreen, {
  routeName: 'Trading',
  title: (props) => props.route?.params?.walletName || 'Kho va giao dich',
  subtitle: 'Ton kho, loi nhuan, lo hang',
  searchPlaceholder: 'Tim san pham, lo hang, danh muc...',
});

const WebInvoicesScreen = withWebDesktopShell(InvoicesScreen, {
  routeName: 'Invoices',
  title: 'Hoa don nha tro',
  subtitle: 'Thu tien theo thang',
  searchPlaceholder: 'Tim hoa don, phong, trang thai...',
});

const WebServicesScreen = withWebDesktopShell(ServicesScreen, {
  routeName: 'Services',
  title: 'Bang gia dich vu',
  subtitle: 'Cau hinh don gia',
  searchPlaceholder: 'Tim dich vu, don gia, cach tinh...',
});

const WebWalletsManagerScreen = withWebDesktopShell(WalletsManagerScreen, {
  routeName: 'WalletsManager',
  title: 'So & module',
  subtitle: 'Quan ly workspace',
  searchPlaceholder: 'Tim so, module, workspace...',
});

const WebSettingsScreen = withWebDesktopShell(SettingsScreen, {
  routeName: 'Settings',
  title: 'Cau hinh he thong',
  subtitle: 'Tai khoan, sync, ngan hang',
  searchPlaceholder: 'Tim cau hinh, ngan hang, sync...',
});

const WebContractViewerScreen = withWebDesktopShell(ContractViewerScreen, {
  routeName: 'Rental',
  title: 'Hop dong thue',
  subtitle: 'Xem va doi soat',
  searchPlaceholder: 'Tim hop dong, khach thue...',
});

const WebTradingCategoriesScreen = withWebDesktopShell(TradingCategoriesScreen, {
  routeName: 'Trading',
  title: 'Danh muc kinh doanh',
  subtitle: 'Phan loai hang hoa',
  searchPlaceholder: 'Tim danh muc hang hoa...',
});

const WebBankConfigScreen = withWebDesktopShell(BankConfigScreen, {
  routeName: 'Settings',
  title: 'Tai khoan nhan tien',
  subtitle: 'Cau hinh doi soat',
  searchPlaceholder: 'Tim tai khoan ngan hang...',
});

const WebModulesScreen = withWebDesktopShell(ModulesScreen, {
  routeName: 'WalletsManager',
  title: 'Danh sach nghiep vu',
  subtitle: 'Chon module',
  searchPlaceholder: 'Tim module, nghiep vu...',
});

const WebSmartBatchBillingScreen = withWebDesktopShell(SmartBatchBillingScreen, {
  routeName: 'Invoices',
  title: 'Batch billing',
  subtitle: 'Xu ly nhieu phong',
  searchPlaceholder: 'Tim batch billing, phong, chi so...',
});

const WebCategoriesScreen = withWebDesktopShell(CategoriesScreen, {
  routeName: 'Settings',
  title: 'Danh muc thu chi',
  subtitle: 'Cau hinh he thong',
  searchPlaceholder: 'Tim danh muc thu chi...',
});

const WebAddTransactionScreen = withWebDesktopShell(AddTransactionScreen, {
  routeName: 'Transactions',
  title: (props) => (props.route?.params?.editTx ? 'Sua giao dich' : 'Them giao dich'),
  subtitle: 'Quan ly thu chi',
  searchPlaceholder: 'Tim giao dich, danh muc, vi...',
});

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Analytics" component={WebAnalyticsScreen} />
      <Stack.Screen name="Modules" component={WebModulesScreen} />
      <Stack.Screen name="Rental" component={WebRentalScreen} />
      <Stack.Screen name="Trading" component={WebTradingScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="Invoices" component={WebInvoicesScreen} />
      <Stack.Screen name="Services" component={WebServicesScreen} />
      <Stack.Screen name="Categories" component={WebCategoriesScreen} />
      <Stack.Screen name="Settings" component={WebSettingsScreen} />
      <Stack.Screen name="WalletsManager" component={WebWalletsManagerScreen} />
      <Stack.Screen name="ContractViewer" component={WebContractViewerScreen} />
      <Stack.Screen name="TradingCategories" component={WebTradingCategoriesScreen} />
      <Stack.Screen name="BankConfig" component={WebBankConfigScreen} />
      <Stack.Screen name="SmartBatchBilling" component={WebSmartBatchBillingScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Analytics: focused ? 'bar-chart' : 'bar-chart-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Trang chu' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ tabBarLabel: 'Thong ke' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const requiresAuth = isApiDataEnabled();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const mainEntry = Platform.OS === 'web' ? HomeStack : MainTabs;

  useEffect(() => {
    if (!requiresAuth) {
      setInitializing(false);
      setUser({ id: 'local-user' });
      return () => {};
    }

    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsubscribe;
  }, [requiresAuth]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!requiresAuth || user ? (
          <>
            <Stack.Screen name="Main" component={mainEntry} />
            <Stack.Screen name="AddTransaction" component={Platform.OS === 'web' ? WebAddTransactionScreen : AddTransactionScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
