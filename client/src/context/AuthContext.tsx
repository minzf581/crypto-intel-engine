import React, { createContext, useState, useContext, useEffect } from 'react';
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
        config.headers = {};
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
  const navigate = useNavigate();

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('Checking authentication status...');
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('Found token in localStorage, length:', token.length);
          
          // Set auth header safely
          try {
            if (!axios.defaults.headers) {
              axios.defaults.headers = {};
            }
            if (!axios.defaults.headers.common) {
              axios.defaults.headers.common = {};
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          } catch (headerError) {
            console.warn('Could not set auth header in useEffect:', headerError);
          }
          
          // Get current user info
          console.log('Getting current user info...');
          const response = await axios.get('/api/users/me');
          
          if (response.data && response.data.data) {
            const userData = response.data.data;
            setUser(userData);
            console.log('Authentication successful, user info:', userData);
          } else {
            throw new Error('Invalid user data response');
          }
        } catch (error: any) {
          console.error('Authentication token verification error:', error);
          localStorage.removeItem('token');
          try {
            if (axios.defaults.headers?.common) {
              delete axios.defaults.headers.common['Authorization'];
            }
          } catch (e) {
            console.warn('Could not clear auth header in useEffect:', e);
          }
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
      console.log('Attempting login:', { email });
      
      // Clear old auth state
      localStorage.removeItem('token');
      // Safely clear auth header
      try {
        if (axios.defaults.headers?.common) {
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (e) {
        console.warn('Could not clear auth header:', e);
      }
      
      // Try multiple login approaches to avoid CORS issues
      let userData;
      let token;
      let response;
      
      try {
        // First try: Regular axios POST
        console.log('Login attempt 1: Using axios');
        response = await axios.post('/api/auth/login', { email, password });
        
        if (response && response.data && response.data.data) {
          userData = response.data.data.user;
          token = response.data.data.token;
        }
      } catch (axiosError) {
        console.log('Axios login failed, trying alternative method', axiosError);
        
        // Second try: Direct fetch without credentials
        // Safely get baseURL
        const baseURL = axios.defaults.baseURL || 'http://localhost:5001';
        const loginUrl = `${baseURL}/api/auth/login`;
        console.log('Login attempt 2: Using fetch to', loginUrl);
        
        try {
          const fetchResponse = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            // Don't include credentials to avoid CORS issues
            credentials: 'omit'
          });
          
          if (!fetchResponse.ok) {
            throw new Error(`Login request failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
          }
          
          const data = await fetchResponse.json();
          console.log('Login fetch response:', data);
          
          if (data && data.data) {
            userData = data.data.user;
            token = data.data.token;
          } else {
            throw new Error('Server response format error');
          }
        } catch (fetchError) {
          console.error('Fetch login also failed:', fetchError);
          throw fetchError;
        }
      }
      
      // Validate token and user data
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error('Server returned invalid token:', token);
        throw new Error('Server returned invalid token');
      }
      
      if (!userData || !userData.id) {
        console.error('Server returned invalid user data:', userData);
        throw new Error('Server returned invalid user data');
      }
      
      console.log('Received valid token:', { 
        tokenLength: token.length, 
        tokenPrefix: token.substring(0, 10) + '...' 
      });
      
      // Save token to localStorage
      try {
        localStorage.setItem('token', token);
        console.log('Token saved to localStorage');
        
        // Verify save was successful
        const savedToken = localStorage.getItem('token');
        if (!savedToken) {
          throw new Error('localStorage token save failed');
        }
        
        if (savedToken !== token) {
          console.error('Saved token does not match original token:', {
            original: token.substring(0, 10) + '...',
            saved: savedToken.substring(0, 10) + '...'
          });
          throw new Error('Token save inconsistency');
        }
      } catch (storageError) {
        console.error('Error saving token to localStorage:', storageError);
        throw new Error('Cannot save token: ' + (storageError as Error).message);
      }
      
      // Set axios default auth header safely
      try {
        // Ensure axios.defaults.headers exists
        if (!axios.defaults.headers) {
          axios.defaults.headers = {};
        }
        if (!axios.defaults.headers.common) {
          axios.defaults.headers.common = {};
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Set axios global auth header');
      } catch (headerError) {
        console.error('Could not set auth header:', headerError);
        // Continue without setting header - request interceptor will handle it
      }
      
      // Update user state
      setUser(userData);
      console.log('Login successful, user state updated');

      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      localStorage.removeItem('token');
      try {
        if (axios.defaults.headers?.common) {
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (e) {
        console.warn('Could not clear auth header on error:', e);
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

  // Fix navigateAfterAuth function to ensure proper auth status check
  const navigateAfterAuth = (path: string) => {
    console.log(`Preparing to navigate to path: ${path}`);
    
    const token = localStorage.getItem('token');
    
    // Detailed token check
    if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
      console.error('Navigation failed: No valid authentication token');
      return;
    }
    
    // Use short delay to ensure state is updated
    setTimeout(() => {
      // Re-verify token exists
      const currentToken = localStorage.getItem('token');
      const headerAuth = axios.defaults.headers.common['Authorization'];
      
      console.log('Navigation check:', { 
        path, 
        hasToken: !!currentToken, 
        isAuthenticated: !!user,
        hasAuthHeader: !!headerAuth
      });
      
      if (currentToken && user) {
        navigate(path, { replace: true });
      } else {
        console.error('Navigation failed: Authentication state incomplete');
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