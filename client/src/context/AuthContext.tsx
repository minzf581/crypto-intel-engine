import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Configure axios defaults - 确保使用正确的后端端口
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
console.log('使用API地址:', API_URL);
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Add request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // 确保token是有效的
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
      config.headers.Authorization = `Bearer ${token}`;
      // 调试信息
      console.log('请求添加认证头:', { 
        url: config.url,
        authHeaderLength: `Bearer ${token}`.length,
        tokenPrefix: token.substring(0, 10) + '...'
      });
    } else {
      // 如果令牌无效，移除认证头
      delete config.headers.Authorization;
      console.log('请求未添加认证头 - 令牌无效', { url: config.url });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('收到401未授权响应，清除令牌');
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

interface User {
  id: string;
  email: string;
  name: string;
  hasCompletedOnboarding: boolean;
  selectedAssets?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  navigateAfterAuth: (path: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('检查认证状态...');
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('在localStorage中发现token，长度:', token.length);
          
          // 设置认证头
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // 获取当前用户信息
          console.log('正在获取当前用户信息...');
          const response = await axios.get('/api/users/me');
          
          if (response.data && response.data.data) {
            const userData = response.data.data;
            setUser(userData);
            console.log('认证成功，用户信息:', userData);
          } else {
            throw new Error('无效的用户数据响应');
          }
        } catch (error: any) {
          console.error('认证token验证错误:', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('尝试登录:', { email });
      
      // 清除旧认证状态
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      // 发送登录请求
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('登录响应:', response.data);
      
      if (!response.data || !response.data.data) {
        throw new Error('服务器响应格式错误');
      }
      
      const { token, user: userData } = response.data.data;
      
      // 验证token和用户数据
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error('服务器返回的token无效:', token);
        throw new Error('服务器返回的token无效');
      }
      
      if (!userData || !userData.id) {
        console.error('服务器返回的用户数据无效:', userData);
        throw new Error('服务器返回的用户数据无效');
      }
      
      console.log('收到有效令牌:', { 
        tokenLength: token.length, 
        tokenPrefix: token.substring(0, 10) + '...' 
      });
      
      // 保存token到localStorage
      try {
        localStorage.setItem('token', token);
        console.log('令牌已保存到localStorage');
        
        // 验证保存是否成功
        const savedToken = localStorage.getItem('token');
        if (!savedToken) {
          throw new Error('localStorage保存令牌失败');
        }
        
        if (savedToken !== token) {
          console.error('保存的令牌与原始令牌不匹配:', {
            original: token.substring(0, 10) + '...',
            saved: savedToken.substring(0, 10) + '...'
          });
          throw new Error('令牌保存不一致');
        }
      } catch (storageError) {
        console.error('保存令牌到localStorage时出错:', storageError);
        throw new Error('无法保存令牌: ' + (storageError as Error).message);
      }
      
      // 设置axios默认认证头
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('已设置axios全局认证头');
      
      // 更新用户状态
      setUser(userData);
      console.log('登录成功，用户状态已更新');

      return userData;
    } catch (error: any) {
      console.error('登录错误:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      throw error;
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await axios.post('/api/auth/register', { email, password, name });
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
    } catch (error) {
      console.error('注册错误:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    return Promise.resolve();
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  // 修复navigateAfterAuth函数，确保正确检查认证状态
  const navigateAfterAuth = (path: string) => {
    console.log(`准备导航到路径: ${path}`);
    
    const token = localStorage.getItem('token');
    
    // 详细检查token
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.error('导航失败: 没有有效的认证令牌');
      return;
    }
    
    // 使用短延迟确保状态已更新
    setTimeout(() => {
      // 重新验证token存在
      const currentToken = localStorage.getItem('token');
      const headerAuth = axios.defaults.headers.common['Authorization'];
      
      console.log('导航检查:', { 
        path, 
        hasToken: !!currentToken, 
        isAuthenticated: !!user,
        hasAuthHeader: !!headerAuth
      });
      
      if (currentToken && user) {
        navigate(path, { replace: true });
      } else {
        console.error('导航失败: 认证状态不完整');
      }
    }, 300);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    navigateAfterAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 