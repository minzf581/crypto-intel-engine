import React, { useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface SentimentScoreTooltipProps {
  score: number;
}

const SentimentScoreTooltip: React.FC<SentimentScoreTooltipProps> = ({ score }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getSentimentLabel = (score: number): string => {
    if (score >= 0.8) return 'Extremely Bullish';
    if (score >= 0.4) return 'Positive';
    if (score >= -0.4) return 'Neutral';
    if (score >= -0.8) return 'Negative';
    return 'Extremely Bearish';
  };

  const getSentimentColor = (score: number): string => {
    if (score >= 0.4) return 'text-green-600';
    if (score >= -0.4) return 'text-gray-600';
    return 'text-red-600';
  };

  const getSentimentDescription = (score: number): string => {
    if (score >= 0.8) return 'Very strong positive sentiment. Market participants are extremely optimistic.';
    if (score >= 0.4) return 'Positive sentiment. Generally optimistic market outlook.';
    if (score >= -0.4) return 'Neutral sentiment. Mixed or balanced market opinions.';
    if (score >= -0.8) return 'Negative sentiment. Generally pessimistic market outlook.';
    return 'Very strong negative sentiment. Market participants are extremely pessimistic.';
  };

  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
      </button>
      
      {showTooltip && (
        <div className="absolute z-10 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg -top-2 left-6">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Sentiment Score: {score.toFixed(2)}
              </h4>
              <p className={`text-sm font-medium ${getSentimentColor(score)}`}>
                {getSentimentLabel(score)}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {getSentimentDescription(score)}
              </p>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h5 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                Score Range Guide:
              </h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-green-600">+0.8 to +1.0</span>
                  <span className="text-gray-600 dark:text-gray-400">Extremely Bullish</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-500">+0.4 to +0.8</span>
                  <span className="text-gray-600 dark:text-gray-400">Positive</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">-0.4 to +0.4</span>
                  <span className="text-gray-600 dark:text-gray-400">Neutral</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-500">-0.8 to -0.4</span>
                  <span className="text-gray-600 dark:text-gray-400">Negative</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">-1.0 to -0.8</span>
                  <span className="text-gray-600 dark:text-gray-400">Extremely Bearish</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-3 -left-1 w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default SentimentScoreTooltip; 