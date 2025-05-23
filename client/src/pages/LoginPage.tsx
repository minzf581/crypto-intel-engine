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
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Login
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            Sign in to your account or{' '}
            <button type="button" onClick={() => navigate('/register')} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
              create a new account
            </button>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your email address"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <strong>Demo Account:</strong> demo@example.com / demo123
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 