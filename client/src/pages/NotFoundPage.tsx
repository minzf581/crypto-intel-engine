import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';

const NotFoundPage = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-danger/10 text-danger mb-8">
          <ExclamationTriangleIcon className="h-12 w-12" />
        </div>
        
        <h1 className="text-6xl font-bold text-neutral-900 dark:text-neutral-100">404</h1>
        <h2 className="text-3xl font-semibold text-neutral-800 dark:text-neutral-200 mt-2">Page Not Found</h2>
        
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="mt-10">
          <Link 
            to={isAuthenticated ? '/dashboard' : '/login'} 
            className="btn-primary inline-flex items-center"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            {isAuthenticated ? 'Back to Dashboard' : 'Go to Login'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 