import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import { Signal } from '@/context/SignalContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SignalDetailModalProps {
  signal: Signal | null;
  isOpen: boolean;
  onClose: () => void;
}

const SignalDetailModal = ({ signal, isOpen, onClose }: SignalDetailModalProps) => {
  const [isAlertEnabled, setIsAlertEnabled] = useState(false);

  if (!signal) return null;

  // Mock data for sentiment chart
  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setHours(date.getHours() - 23 + i);
      return format(date, 'HH:mm');
    }),
    datasets: [
      {
        label: 'Sentiment Score',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 70) + 20),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Mentions',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 40) + 5),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Sentiment Score',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Mentions',
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Last 24 Hours Sentiment & Mentions',
      },
    },
  };

  // Get platform source name for display
  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'twitter': return 'Twitter/X';
      case 'reddit': return 'Reddit';
      default: return platform;
    }
  };

  // Format date
  const getFormattedDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'PPP p');
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Toggle alert
  const toggleAlert = () => {
    setIsAlertEnabled(!isAlertEnabled);
    // In a real implementation, this would save the alert preference to the user's account
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white dark:bg-neutral-800 text-neutral-400 hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
                      <img 
                        src={signal.assetLogo} 
                        alt={signal.assetName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {signal.assetSymbol}
                        <span className="ml-2 text-lg font-normal text-neutral-500 dark:text-neutral-400">
                          {signal.assetName}
                        </span>
                      </h3>
                      <div className="flex space-x-3 mt-1">
                        <span className="text-sm capitalize px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                          {signal.type}
                        </span>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {getFormattedDate(signal.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Signal Information */}
                  <div className="mt-6">
                    <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                      <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Signal Information</h4>
                      <p className="mt-2 text-neutral-700 dark:text-neutral-300">
                        {signal.description}
                      </p>
                    </div>

                    {/* Signal Strength */}
                    <div className="py-4 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex justify-between">
                        <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Signal Strength</h4>
                        <div className="text-2xl font-semibold">
                          {signal.strength}
                        </div>
                      </div>
                      <div className="mt-2 h-2.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            signal.strength < 40 ? 'bg-danger' : signal.strength < 70 ? 'bg-warning' : 'bg-success'
                          }`}
                          style={{ width: `${signal.strength}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Source Breakdown */}
                    <div className="py-4 border-b border-neutral-200 dark:border-neutral-700">
                      <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Source Breakdown</h4>
                      <div className="mt-2 space-y-2">
                        {signal.sources.map((source, index) => (
                          <div key={index} className="flex justify-between">
                            <div className="flex items-center">
                              <div className={`h-4 w-4 rounded-full mr-2 ${
                                source.platform === 'twitter' ? 'bg-blue-400' : 'bg-orange-500'
                              }`}></div>
                              <span>{getPlatformName(source.platform)}</span>
                            </div>
                            <span>{source.count} mentions</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="py-4 border-b border-neutral-200 dark:border-neutral-700">
                      <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">Trend Analysis</h4>
                      <div className="h-64">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    </div>

                    {/* Alert Settings */}
                    <div className="py-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Alert Settings</h4>
                        <button
                          type="button"
                          onClick={toggleAlert}
                          className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                            isAlertEnabled 
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                          }`}
                        >
                          {isAlertEnabled ? (
                            <>
                              <BellSlashIcon className="h-5 w-5 mr-1" />
                              Disable Alerts
                            </>
                          ) : (
                            <>
                              <BellIcon className="h-5 w-5 mr-1" />
                              Enable Alerts
                            </>
                          )}
                        </button>
                      </div>
                      {isAlertEnabled && (
                        <div className="mt-3 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-md text-sm text-primary-800 dark:text-primary-300">
                          You will receive email notifications for similar signals with a strength of 70+.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                      onClick={onClose}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default SignalDetailModal; 