import { useState, Fragment } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  MoonIcon,
  SunIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useAssets } from '@/context/AssetContext';
import AssetSelector from '@/components/dashboard/AssetSelector';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const { user, logout } = useAuth();
  const { selectedAssets } = useAssets();
  const navigate = useNavigate();

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-900">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-neutral-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-neutral-800 px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <h1 className="text-xl font-semibold text-primary-600">Crypto Intelligence</h1>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <div className="text-xs font-semibold leading-6 text-neutral-400">Navigation</div>
                        <ul role="list" className="-mx-2 mt-2 space-y-1">
                          <li>
                            <NavLink
                              to="/dashboard"
                              className={({ isActive }) =>
                                `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                                  isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`
                              }
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ChartBarIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                              Dashboard
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/social-sentiment"
                              className={({ isActive }) =>
                                `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                                  isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`
                              }
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ChatBubbleLeftRightIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                              Social Sentiment
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/settings"
                              className={({ isActive }) =>
                                `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                                  isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`
                              }
                              onClick={() => setSidebarOpen(false)}
                            >
                              <Cog6ToothIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                              Settings
                            </NavLink>
                          </li>
                          <li>
                            <NavLink
                              to="/system-status"
                              className={({ isActive }) =>
                                `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                                  isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                }`
                              }
                              onClick={() => setSidebarOpen(false)}
                            >
                              <ServerIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                              System Status
                            </NavLink>
                          </li>
                        </ul>
                      </li>
                      <li>
                        <div className="text-xs font-semibold leading-6 text-neutral-400">Your Assets</div>
                        <ul role="list" className="mt-2 space-y-1">
                          <AssetSelector isMobile={true} />
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-semibold text-primary-600">Crypto Intelligence</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <div className="text-xs font-semibold leading-6 text-neutral-400">Navigation</div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  <li>
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`
                      }
                    >
                      <ChartBarIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      Dashboard
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/social-sentiment"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`
                      }
                    >
                      <ChatBubbleLeftRightIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      Social Sentiment
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/settings"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`
                      }
                    >
                      <Cog6ToothIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      Settings
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/system-status"
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`
                      }
                    >
                      <ServerIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      System Status
                    </NavLink>
                  </li>
                </ul>
              </li>
              <li>
                <div className="text-xs font-semibold leading-6 text-neutral-400">Your Assets</div>
                <ul role="list" className="mt-2 space-y-1">
                  <AssetSelector />
                </ul>
              </li>
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-neutral-700 dark:text-neutral-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 justify-between gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              {/* Page title could go here */}
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Dark mode toggle */}
              <button
                type="button"
                className="rounded-full p-1 text-neutral-400 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-300"
                onClick={toggleDarkMode}
              >
                <span className="sr-only">Toggle dark mode</span>
                {darkMode ? (
                  <SunIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <MoonIcon className="h-6 w-6" aria-hidden="true" />
                )}
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <div className="flex items-center gap-x-3">
                  <div className="flex-none rounded-full bg-neutral-100 dark:bg-neutral-700 p-1">
                    <div className="h-8 w-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                      {user?.name.charAt(0)}
                    </div>
                  </div>
                  <span className="hidden lg:flex lg:items-center">
                    <span className="text-sm font-semibold leading-6 text-neutral-900 dark:text-neutral-100" aria-hidden="true">
                      {user?.name}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 