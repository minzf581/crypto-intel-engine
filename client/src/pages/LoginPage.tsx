import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to login...');
      await login(email, password);
      console.log('Login successful, redirecting...');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.response) {
        console.error('Server response:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        if (err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else if (err.response.status === 401) {
          setError('Invalid email or password');
        } else if (err.response.status === 500) {
          setError('Server error, please try again later');
        } else {
          setError('Login failed, please check your credentials and try again');
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError('Unable to connect to server, please check your network connection');
      } else {
        console.error('Request configuration error:', err.message);
        setError('An error occurred, please try again later');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 text-center mb-6">
        Sign in to your account
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="you@example.com"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <div className="text-sm">
              <a href="#" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                Forgot password?
              </a>
            </div>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-2.5 relative"
          >
            {isLoading && (
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="animate-spin inline-block h-5 w-5 border-t-2 border-b-2 border-white rounded-full" />
              </span>
            )}
            <span className={isLoading ? 'opacity-0' : ''}>Sign in</span>
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
          Sign up
        </Link>
      </div>
      
      <div className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-500">
        <p>
          For demo purposes, you can use:<br />
          Email: <span className="font-mono">demo@example.com</span><br />
          Password: <span className="font-mono">demo123</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 