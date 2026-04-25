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
import TenantLandingScreen from '../screens/TenantLandingScreen';
import InvoiceHistoryScreen from '../screens/InvoiceHistoryScreen';
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
  title: 'Báo cáo & phân tích',
  subtitle: 'Dòng tiền và hiệu suất',
  searchPlaceholder: 'Tìm báo cáo, danh mục, kỳ...',
});

const WebRentalScreen = withWebDesktopShell(RentalScreen, {
  routeName: 'Rental',
  title: (props) => props.route?.params?.walletName || 'Quản lý nhà trọ',
  subtitle: 'Vận hành cho thuê',
  searchPlaceholder: 'Tìm phòng, người thuê, hóa đơn...',
});

const WebTradingScreen = withWebDesktopShell(TradingScreen, {
  routeName: 'Trading',
  title: (props) => props.route?.params?.walletName || 'Kho hàng & kinh doanh',
  subtitle: 'Tồn kho, lợi nhuận, lô hàng',
  searchPlaceholder: 'Tìm sản phẩm, lô hàng, phân loại...',
});

const WebInvoicesScreen = withWebDesktopShell(InvoicesScreen, {
  routeName: 'Invoices',
  title: 'Hóa đơn nhà trọ',
  subtitle: 'Lập hóa đơn theo tháng',
  searchPlaceholder: 'Tìm hóa đơn, phòng, trạng thái...',
});

const WebServicesScreen = withWebDesktopShell(ServicesScreen, {
  routeName: 'Services',
  title: 'Bảng giá dịch vụ',
  subtitle: 'Cấu hình mức phí',
  searchPlaceholder: 'Tìm dịch vụ, đơn giá, cách tính...',
});

const WebWalletsManagerScreen = withWebDesktopShell(WalletsManagerScreen, {
  routeName: 'WalletsManager',
  title: 'Sổ tiền & module',
  subtitle: 'Quản lý không gian làm việc',
  searchPlaceholder: 'Tìm sổ, module, không gian...',
});

const WebSettingsScreen = withWebDesktopShell(SettingsScreen, {
  routeName: 'Settings',
  title: 'Cài đặt hệ thống',
  subtitle: 'Tài khoản, đồng bộ, ngân hàng',
  searchPlaceholder: 'Tìm cài đặt, ngân hàng, đồng bộ...',
});

const WebContractViewerScreen = withWebDesktopShell(ContractViewerScreen, {
  routeName: 'Rental',
  title: 'Hợp đồng thuê phòng',
  subtitle: 'Kiểm tra và đối soát',
  searchPlaceholder: 'Tìm hợp đồng, người thuê...',
});

const WebTradingCategoriesScreen = withWebDesktopShell(TradingCategoriesScreen, {
  routeName: 'Trading',
  title: 'Phân loại hàng hóa',
  subtitle: 'Nhóm sản phẩm',
  searchPlaceholder: 'Tìm phân loại sản phẩm...',
});

const WebBankConfigScreen = withWebDesktopShell(BankConfigScreen, {
  routeName: 'Settings',
  title: 'Tài khoản nhận tiền',
  subtitle: 'Thiết lập đối soát',
  searchPlaceholder: 'Tìm tài khoản ngân hàng...',
});

const WebModulesScreen = withWebDesktopShell(ModulesScreen, {
  routeName: 'WalletsManager',
  title: 'Danh sách module',
  subtitle: 'Chọn module',
  searchPlaceholder: 'Tìm module...',
});

const WebSmartBatchBillingScreen = withWebDesktopShell(SmartBatchBillingScreen, {
  routeName: 'Invoices',
  title: 'Lập hóa đơn hàng loạt',
  subtitle: 'Xử lý nhiều phòng cùng lúc',
  searchPlaceholder: 'Tìm lập hóa đơn loạt, phòng, công tơ...',
});

const WebCategoriesScreen = withWebDesktopShell(CategoriesScreen, {
  routeName: 'Settings',
  title: 'Danh mục thu/chi',
  subtitle: 'Thiết lập hệ thống',
  searchPlaceholder: 'Tìm danh mục thu/chi...',
});

const WebAddTransactionScreen = withWebDesktopShell(AddTransactionScreen, {
  routeName: 'Transactions',
  title: (props) => (props.route?.params?.editTx ? 'Sửa giao dịch' : 'Thêm giao dịch'),
  subtitle: 'Quản lý thu/chi',
  searchPlaceholder: 'Tìm giao dịch, danh mục, sổ...',
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
      <Stack.Screen name="InvoiceHistory" component={InvoiceHistoryScreen} />
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
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ tabBarLabel: 'Phân tích' }} />
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
            <Stack.Screen name="TenantLanding" component={TenantLandingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="TenantLanding" component={TenantLandingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
