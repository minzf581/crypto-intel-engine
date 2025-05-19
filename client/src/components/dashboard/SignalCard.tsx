import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { Signal } from '@/context/SignalContext';

interface SignalCardProps {
  signal: Signal;
  onClick: () => void;
}

const SignalCard = ({ signal, onClick }: SignalCardProps) => {
  // Determine signal strength class
  const getStrengthClass = (strength: number) => {
    if (strength < 40) return 'signal-strength-low';
    if (strength < 70) return 'signal-strength-medium';
    return 'signal-strength-high';
  };

  // Format the timestamp
  const getFormattedTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Get strength indicator background style
  const getStrengthIndicatorStyle = (strength: number) => {
    let color;
    if (strength < 40) color = 'var(--tw-danger)';
    else if (strength < 70) color = 'var(--tw-warning)';
    else color = 'var(--tw-success)';

    return {
      width: `${strength}%`,
      backgroundColor: color,
    };
  };

  // Get source icon components
  const sourcePlatforms = signal.sources.map(source => source.platform);
  
  return (
    <div 
      className={`signal-card ${getStrengthClass(signal.strength)} cursor-pointer transition-all hover:translate-x-1`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full overflow-hidden mr-3">
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
            <div className="font-medium">
              {signal.assetSymbol}
              <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">
                {signal.assetName}
              </span>
            </div>
            <div className="text-xs text-neutral-500 flex items-center mt-1">
              <span className="capitalize mr-2 inline-flex px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700">
                {signal.type}
              </span>
              <ClockIcon className="h-3 w-3 mr-1" />
              {getFormattedTimestamp(signal.timestamp)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium flex items-center justify-end">
            <span className="mr-1">Strength:</span>
            <span>{signal.strength}</span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            {sourcePlatforms.includes('twitter') && (
              <div className="h-4 w-4 rounded-full bg-blue-400 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-white">
                  <path 
                    fill="currentColor" 
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </div>
            )}
            {sourcePlatforms.includes('reddit') && (
              <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-white">
                  <path 
                    fill="currentColor" 
                    d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-18c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8zm6 9a1.5 1.5 0 0 0-1.5-1.5c-.384 0-.729.145-.989.379a4.118 4.118 0 0 0-2.268-.734l.361-1.676 1.151.232a1 1 0 1 0 .991-1.733 1 1 0 0 0-.991.267l-1.572-.314a.5.5 0 0 0-.577.386l-.503 2.326c-.967.011-1.922.271-2.67.734a1.483 1.483 0 0 0-.989-.379A1.5 1.5 0 0 0 7 14.5 1.5 1.5 0 0 0 8.5 16c.068 0 .135-.01.202-.025C8.64 16.639 8.5 17.306 8.5 18a3.5 3.5 0 0 0 7 0c0-.694-.14-1.361-.202-2.025.067.015.134.025.202.025A1.5 1.5 0 0 0 18 14.5zM9.5 15a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-2.5 4a1.5 1.5 0 0 1-1.5-1.5.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5 1.5 1.5 0 0 1-1.5 1.5z"
                  />
                </svg>
              </div>
            )}
            {signal.sources.length > 0 && (
              <span className="text-xs text-neutral-500">
                {signal.sources.reduce((acc, source) => acc + source.count, 0)} mentions
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {signal.description}
        </p>
      </div>
      
      {/* Strength indicator bar */}
      <div className="mt-3 h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={getStrengthIndicatorStyle(signal.strength)}
        ></div>
      </div>

      <div className="mt-2 flex justify-end">
        <button 
          className="text-xs text-primary-600 dark:text-primary-400 flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <span className="mr-1">View details</span>
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default SignalCard; 