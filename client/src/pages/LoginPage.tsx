import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, navigateAfterAuth } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting login process...');
      
      // Execute login request
      const userData = await login(email, password);
      console.log('Login successful, user data:', userData);
      
      // Verify token
      const token = localStorage.getItem('token');
      
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        console.error('Invalid token:', token);
        throw new Error('Login successful but retrieved token is invalid');
      }
      
      console.log('Token verification successful, token length:', token.length);
      
      // Ensure axios global auth header is set correctly
      if (!axios.defaults.headers.common['Authorization'] || 
          axios.defaults.headers.common['Authorization'] !== `Bearer ${token}`) {
        console.log('Auth header needs update, resetting...');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Login processing complete, preparing to navigate to dashboard...');
      
      // Ensure user is updated in state before navigation
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        console.log('Navigated to dashboard');
      }, 300);
      
    } catch (err: any) {
      console.error('Login failed:', err);
      
      // Handle different types of errors
      if (err.response) {
        const statusCode = err.response.status;
        const errorData = err.response.data;
        
        if (errorData && errorData.message) {
          setError(errorData.message);
        } else if (statusCode === 401) {
          setError('Invalid email or password');
        } else if (statusCode === 500) {
          setError('Server error, please try again later');
        } else {
          setError('Login failed, please try again');
        }
      } else if (err.request) {
        setError('Unable to connect to server, please check your network connection');
      } else {
        setError('Error during login process: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          登录
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          或{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
            创建新账户
          </Link>
        </p>
      </div>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              邮箱地址
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 placeholder-neutral-500 dark:placeholder-neutral-400 text-neutral-900 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-neutral-700 sm:text-sm"
              placeholder="输入邮箱地址"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 placeholder-neutral-500 dark:placeholder-neutral-400 text-neutral-900 dark:text-neutral-100 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-neutral-700 sm:text-sm"
              placeholder="输入密码"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:ring-offset-neutral-800 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </span>
            ) : null}
            {isLoading ? '登录中...' : '登录'}
          </button>
        </div>
      </form>
      
      {/* Demo account hint */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>Demo账户:</strong> demo@example.com / demo123
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 