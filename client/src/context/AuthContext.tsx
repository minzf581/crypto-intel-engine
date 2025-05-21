import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Add request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
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

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('localStorage中发现token，长度:', token.length);
          console.log('token前缀:', token.substring(0, 10) + '...');
          
          // 验证token格式是否正确
          if (token.trim() === '') {
            console.error('token为空字符串');
            localStorage.removeItem('token');
            setIsLoading(false);
            return;
          }
          
          // 设置认证头
          const authHeader = `Bearer ${token}`;
          console.log('设置认证头用于验证:', authHeader.substring(0, 20) + '...');
          axios.defaults.headers.common['Authorization'] = authHeader;
          
          // 获取当前用户信息
          console.log('正在获取当前用户信息...');
          const response = await axios.get('/api/users/me');
          console.log('用户信息响应:', response.data);
          
          if (!response.data || !response.data.data) {
            console.error('用户数据响应格式无效');
            throw new Error('无效的用户数据响应格式');
          }
          
          const userData = response.data.data;
          setUser(userData);
          console.log('认证成功，用户信息:', userData);
        } catch (error: any) {
          console.error('认证token验证错误:', error);
          if (error.response) {
            console.error('错误响应:', {
              状态码: error.response.status,
              数据: error.response.data
            });
          }
          console.log('从localStorage中移除无效token');
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } else {
        console.log('localStorage中未找到认证token');
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log('尝试登录:', { email });
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('登录响应完整数据:', JSON.stringify(response.data, null, 2));
      
      if (!response.data || !response.data.data) {
        console.error('服务器响应格式不正确，期望 response.data.data');
        throw new Error('服务器响应格式错误');
      }
      
      const { token, user: userData } = response.data.data;
      
      console.log('提取的token和用户数据:', { 
        token存在: !!token, 
        token长度: token ? token.length : 0,
        token前缀: token ? token.substring(0, 10) + '...' : 'N/A',
        userData存在: !!userData 
      });
      
      if (!token || !userData) {
        throw new Error('服务器响应格式错误，缺少token或用户数据');
      }
      
      // 保存token并设置认证头
      console.log('保存token到localStorage');
      localStorage.setItem('token', token);
      
      // 设置axios默认认证头
      const authHeader = `Bearer ${token}`;
      console.log('设置认证头:', authHeader.substring(0, 20) + '...');
      axios.defaults.headers.common['Authorization'] = authHeader;
      
      // 设置用户状态
      setUser(userData);
      console.log('登录成功，用户状态已更新:', userData);

      // 返回用户数据供调用组件使用
      return userData;
    } catch (error: any) {
      console.error('登录错误:', error);
      if (error.response) {
        console.error('服务器错误响应:', {
          状态码: error.response.status,
          数据: error.response.data
        });
      }
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
      
      // Save token and set auth header
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
    } catch (error) {
      console.error('Registration error:', error);
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

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 