import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-700 to-secondary-700">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">
              Crypto Intelligence Engine
            </h1>
            <p className="mt-2 text-sm text-white/80">
              Real-time signal extraction from cryptocurrency data
            </p>
          </div>
          
          <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-lg overflow-hidden">
            <Outlet />
          </div>
          
          <div className="mt-4 text-center text-xs text-white/60">
            <p>Beta Version - For testing purposes only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 