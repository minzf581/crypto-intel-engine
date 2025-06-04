import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  detectFrontendEnvironment, 
  getAxiosConfig, 
  isInternalApiCall, 
  logFrontendEnvironmentInfo 
} from '../utils/environment';

// Log environment configuration for debugging
try {
  logFrontendEnvironmentInfo();
} catch (error) {
  console.error('Error logging environment info:', error);
}

// Configure axios with environment-aware settings
try {
  const axiosConfig = getAxiosConfig();
  if (axiosConfig && typeof axiosConfig === 'object') {
    Object.assign(axios.defaults, axiosConfig);
    console.log('Axios configured successfully with:', axiosConfig);
  } else {
    console.warn('Invalid axios config, using fallback configuration');
    axios.defaults.baseURL = 'http://localhost:5001';
    axios.defaults.timeout = 15000;
    axios.defaults.withCredentials = false;
  }
} catch (error) {
  console.error('Error configuring axios:', error);
  // Fallback configuration
  axios.defaults.baseURL = 'http://localhost:5001';
  axios.defaults.timeout = 15000;
  axios.defaults.withCredentials = false;
}

// Add request interceptor
axios.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      
      // Ensure config.headers exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      // Only add auth header for internal API calls (our backend)
      if (isInternalApiCall(config.url)) {
        // Ensure token is valid
        if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
          config.headers.Authorization = `Bearer ${token}`;
          // Debug information
          console.log('Request added auth header:', { 
            url: config.url,
            authHeaderLength: `Bearer ${token}`.length,
            tokenPrefix: token.substring(0, 10) + '...'
          });
        } else {
          // If token is invalid, remove auth header
          delete config.headers.Authorization;
          console.log('Request without auth header - token invalid', { url: config.url });
        }
      } else {
        // For external APIs, don't add auth header
        delete config.headers.Authorization;
        console.log('External API request (no auth header):', { url: config.url });
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
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
      console.error('Received 401 unauthorized response, clearing token');
      localStorage.removeItem('token');
      try {
        if (axios.defaults.headers?.common) {
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (e) {
        console.warn('Could not clear auth header on 401:', e);
      }
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

// Hard-coded demo user for when backend is unavailable
const DEMO_USER: User = {
  id: 'demo-user-id',
  name: 'Demo User',
  email: 'demo@example.com',
  hasCompletedOnboarding: true,
  selectedAssets: ['BTC', 'ETH', 'SOL']
};

// Hard-coded JWT token for demo user
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW8tdXNlci1pZCIsImlhdCI6MTYyMDQwNjk2MCwiZXhwIjoxNjUxOTQyOTYwfQ.QA4PFl6S66n6Qyc9LVm7yTzN-0BwlzYBhXQQnl4zG-w';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  // Use ref to prevent multiple simultaneous auth checks
  const authCheckInProgress = useRef(false);

  // Initialize authentication on mount - only once
  useEffect(() => {
    if (authInitialized || authCheckInProgress.current) return;

    authCheckInProgress.current = true;
    
    const initializeAuth = async () => {
      console.log('Initializing authentication...');
      
      try {
        const token = localStorage.getItem('token');
        
        if (!token || token === 'undefined' || token === 'null') {
          console.log('No valid token found, setting unauthenticated state');
          setUser(null);
          setIsLoading(false);
          setAuthInitialized(true);
          return;
        }

        console.log('Token found, verifying with server...');
        
        // Set auth header for this request
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };
        
        const response = await axios.get('/api/users/me', config);
        
        if (response.data && response.data.data) {
          const userData = response.data.data;
          setUser(userData);
          console.log('Authentication successful:', userData.email);
          
          // Update axios default headers after successful verification
          if (!axios.defaults.headers) {
            axios.defaults.headers = {} as any;
          }
          if (!axios.defaults.headers.common) {
            axios.defaults.headers.common = {} as any;
          }
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          throw new Error('Invalid user data response');
        }
      } catch (error: any) {
        console.error('Authentication initialization failed:', error.message);
        localStorage.removeItem('token');
        if (axios.defaults.headers?.common) {
          delete axios.defaults.headers.common['Authorization'];
        }
        setUser(null);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
        authCheckInProgress.current = false;
      }
    };

    initializeAuth();
  }, []); // Empty dependency array - run only once

  // Login function
  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('Attempting login:', { email });
      
      // Clear old auth state
      localStorage.removeItem('token');
      
      // Properly clear axios headers
      if (axios.defaults.headers?.common) {
        delete axios.defaults.headers.common['Authorization'];
      }
      
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (!response.data || !response.data.success) {
        throw new Error('Login failed: Invalid server response');
      }
      
      const { user: userData, token } = response.data.data;
      
      if (!token || !userData || !userData.id) {
        throw new Error('Server returned invalid data');
      }
      
      // Save token and update auth header
      localStorage.setItem('token', token);
      
      // Ensure headers structure exists
      if (!axios.defaults.headers) {
        axios.defaults.headers = {} as any;
      }
      if (!axios.defaults.headers.common) {
        axios.defaults.headers.common = {} as any;
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      console.log('Login successful');

      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      localStorage.removeItem('token');
      if (axios.defaults.headers?.common) {
        delete axios.defaults.headers.common['Authorization'];
      }
      throw error;
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await axios.post('/api/auth/register', { email, password, name });
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('token', token);
      
      // Ensure headers structure exists
      if (!axios.defaults.headers) {
        axios.defaults.headers = {} as any;
      }
      if (!axios.defaults.headers.common) {
        axios.defaults.headers.common = {} as any;
      }
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
    if (axios.defaults.headers?.common) {
      delete axios.defaults.headers.common['Authorization'];
    }
    setUser(null);
    setAuthInitialized(false); // Allow re-initialization after logout
    return Promise.resolve();
  };

  // Update user function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  // Navigate after auth function
  const navigateAfterAuth = (path: string) => {
    console.log(`Navigating to: ${path}`);
    
    const token = localStorage.getItem('token');
    if (!token || !user) {
      console.error('Navigation failed: No valid authentication');
      return;
    }
    
    setTimeout(() => {
      navigate(path, { replace: true });
    }, 100);
  };

  const value = {
    user,
    isAuthenticated: !!user && authInitialized,
    isLoading: isLoading || !authInitialized,
    login,
    register,
    logout,
    updateUser,
    navigateAfterAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 