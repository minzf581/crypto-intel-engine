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

  // 已认证则重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('开始登录流程...');
      
      // 执行登录请求
      const userData = await login(email, password);
      console.log('登录成功，用户数据:', userData);
      
      // 验证令牌
      const token = localStorage.getItem('token');
      
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        console.error('令牌无效:', token);
        throw new Error('登录成功但获取到的令牌无效');
      }
      
      console.log('令牌验证成功，令牌长度:', token.length);
      
      // 确保axios全局认证头设置正确
      if (!axios.defaults.headers.common['Authorization'] || 
          axios.defaults.headers.common['Authorization'] !== `Bearer ${token}`) {
        console.log('认证头需要更新，重新设置...');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('完成登录处理，准备导航到仪表板...');
      
      // 确保用户在导航前已更新到状态
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        console.log('已导航到仪表板');
      }, 300);
      
    } catch (err: any) {
      console.error('登录失败:', err);
      
      // 处理不同类型的错误
      if (err.response) {
        const statusCode = err.response.status;
        const errorData = err.response.data;
        
        if (errorData && errorData.message) {
          setError(errorData.message);
        } else if (statusCode === 401) {
          setError('邮箱或密码无效');
        } else if (statusCode === 500) {
          setError('服务器错误，请稍后再试');
        } else {
          setError('登录失败，请重试');
        }
      } else if (err.request) {
        setError('无法连接到服务器，请检查网络连接');
      } else {
        setError('登录过程中发生错误: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录您的账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              创建新账户
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="邮箱地址"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="密码"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
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
      </div>
    </div>
  );
};

export default LoginPage; 