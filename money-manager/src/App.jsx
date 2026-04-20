import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import AppLayout from './components/AppLayout';

function AppRoot() {
  const auth = useAuth();
  
  // Phòng thủ: Nếu Provider chưa kịp khởi tạo giá trị
  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center text-slate-400">
        <div>Khởi tạo ứng dụng...</div>
      </div>
    );
  }

  const { user, loading } = auth;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return user ? <AppLayout /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
