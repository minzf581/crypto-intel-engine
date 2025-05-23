import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AssetProvider } from './context/AssetContext';
import { SignalProvider } from './context/SignalContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // 简单记录当前认证状态
    console.log('ProtectedRoute状态:', { isAuthenticated, isLoading });
    
    // 检查本地存储中的令牌
    const token = localStorage.getItem('token');
    
    // 如果加载完成且未认证或没有令牌，则重定向到登录页面
    if (!isLoading && (!isAuthenticated || !token)) {
      console.log('未认证，重定向到登录页面');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // 如果认证成功且有令牌，显示子组件
  if (isAuthenticated && localStorage.getItem('token')) {
    return <>{children}</>;
  }

  // 默认返回null，导航会在useEffect中处理
  return null;
};

// Redirect authenticated users away from auth pages
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <AssetProvider>
          <SignalProvider>
            <NotificationProvider>
              <Routes>
                {/* Auth routes */}
                <Route path="/" element={<AuthLayout />}>
                  <Route index element={<Navigate to="/login" replace />} />
                  <Route 
                    path="login" 
                    element={
                      <AuthRoute>
                        <AuthLayout>
                          <LoginPage />
                        </AuthLayout>
                      </AuthRoute>
                    } 
                  />
                  <Route 
                    path="register" 
                    element={
                      <AuthRoute>
                        <AuthLayout>
                          <RegisterPage />
                        </AuthLayout>
                      </AuthRoute>
                    } 
                  />
                </Route>

                {/* Onboarding route */}
                <Route 
                  path="/onboarding" 
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Dashboard routes */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* 404 page */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </NotificationProvider>
          </SignalProvider>
        </AssetProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App; 