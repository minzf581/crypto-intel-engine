import React, { useState, useRef } from 'react';
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { BulkImportResult } from '../types/socialSentiment';

interface BulkImportModalProps {
  onImport: (usernames: string[]) => Promise<BulkImportResult>;
  onClose: () => void;
  coinSymbol: string;
  coinName: string;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  onImport,
  onClose,
  coinSymbol,
  coinName
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste');
  const [textInput, setTextInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseUsernames = (text: string): string[] => {
    // Remove @ symbols and clean up usernames
    return text
      .split(/[\n,;|\s]+/)
      .map(username => username.trim().replace(/^@/, ''))
      .filter(username => username.length > 0 && /^[a-zA-Z0-9_]+$/.test(username));
  };

  const handlePasteImport = async () => {
    const usernames = parseUsernames(textInput);
    
    if (usernames.length === 0) {
      alert('Please enter valid Twitter usernames');
      return;
    }

    if (usernames.length > 100) {
      alert('Maximum 100 usernames allowed per import');
      return;
    }

    setIsImporting(true);
    try {
      const result = await onImport(usernames);
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Please upload a CSV or TXT file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const usernames = parseUsernames(text);
      
      if (usernames.length === 0) {
        alert('No valid usernames found in the file');
        return;
      }

      if (usernames.length > 100) {
        alert('Maximum 100 usernames allowed per import');
        return;
      }

      setIsImporting(true);
      try {
        const result = await onImport(usernames);
        setImportResult(result);
      } catch (error) {
        console.error('Import failed:', error);
        alert('Import failed. Please try again.');
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  const handleClose = () => {
    if (importResult && importResult.successCount > 0) {
      // If there were successful imports, close and refresh
      onClose();
    } else {
      onClose();
    }
  };

  const renderPasteTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Twitter Usernames
        </label>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter Twitter usernames (one per line or separated by commas)&#10;Examples:&#10;elonmusk&#10;@VitalikButerin&#10;cz_binance, naval, balajis"
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          You can paste usernames with or without @ symbols. Maximum 100 usernames per import.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Supported formats:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>One username per line</li>
              <li>Comma-separated usernames</li>
              <li>Space-separated usernames</li>
              <li>With or without @ symbols</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handlePasteImport}
        disabled={isImporting || !textInput.trim()}
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
        {isImporting ? 'Importing...' : `Import ${parseUsernames(textInput).length} Accounts`}
      </button>
    </div>
  );

  const renderCsvTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload CSV or TXT File
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition-colors"
        >
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Click to upload a CSV or TXT file
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Maximum file size: 1MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            <p className="font-medium">File format requirements:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>CSV: One username per row or comma-separated</li>
              <li>TXT: One username per line</li>
              <li>Usernames can include or exclude @ symbols</li>
              <li>Empty lines and invalid usernames will be skipped</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!importResult) return null;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
            Import Complete
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Processed {importResult.totalProcessed} accounts for {coinName} ({coinSymbol})
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {importResult.successCount}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Successfully imported
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {importResult.failureCount}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Failed to import
            </p>
          </div>
        </div>

        {importResult.failed.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              Failed Imports:
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {importResult.failed.map((failure, index) => (
                <div key={index} className="text-xs text-red-700 dark:text-red-300">
                  <span className="font-medium">@{failure.username}</span>: {failure.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          Done
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Bulk Import Twitter Accounts
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {importResult ? (
              renderResults()
            ) : (
              <>
                {/* Tab Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                      { id: 'paste', name: 'Paste Text', icon: ClipboardDocumentIcon },
                      { id: 'csv', name: 'Upload File', icon: DocumentArrowUpIcon }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                      >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'paste' && renderPasteTab()}
                {activeTab === 'csv' && renderCsvTab()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal; 