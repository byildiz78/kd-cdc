'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, Clock, Database, RefreshCw } from 'lucide-react';

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  dateRange?: { start: string; end: string };
}

export default function SyncProgressModal({
  isOpen,
  onClose,
  companyName,
  dateRange,
}: SyncProgressModalProps) {
  const [stage, setStage] = useState<'connecting' | 'fetching' | 'processing' | 'completed' | 'failed'>('connecting');
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    totalRecords: 0,
    newRecords: 0,
    updatedRecords: 0,
    unchangedRecords: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isOpen && !startTime) {
      setStartTime(new Date());
    }
  }, [isOpen, startTime]);

  useEffect(() => {
    if (!startTime || stage === 'completed' || stage === 'failed') return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, stage]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setTimeout(() => {
        setStage('connecting');
        setProgress(0);
        setStats({ totalRecords: 0, newRecords: 0, updatedRecords: 0, unchangedRecords: 0 });
        setError(null);
        setStartTime(null);
        setElapsedTime(0);
      }, 300);
    }
  }, [isOpen]);

  const updateProgress = (newStage: typeof stage, newProgress: number, newStats?: Partial<typeof stats>) => {
    setStage(newStage);
    setProgress(newProgress);
    if (newStats) {
      setStats((prev) => ({ ...prev, ...newStats }));
    }
  };

  const setCompleted = (finalStats: typeof stats) => {
    setStage('completed');
    setProgress(100);
    setStats(finalStats);
  };

  const setFailed = (errorMessage: string) => {
    setStage('failed');
    setError(errorMessage);
  };

  // Make these functions available to parent component
  useEffect(() => {
    if (isOpen) {
      (window as any).__syncProgressModal = {
        updateProgress,
        setCompleted,
        setFailed,
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStageIcon = () => {
    switch (stage) {
      case 'connecting':
        return <Database className="h-12 w-12 text-blue-600 animate-pulse" />;
      case 'fetching':
        return <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'processing':
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'failed':
        return <XCircle className="h-12 w-12 text-red-600" />;
    }
  };

  const getStageText = () => {
    switch (stage) {
      case 'connecting':
        return 'RobotPOS API ye baglaniliyor...';
      case 'fetching':
        return 'Veriler cekiliyor...';
      case 'processing':
        return 'Veriler isleniyor...';
      case 'completed':
        return 'Senkronizasyon tamamlandi!';
      case 'failed':
        return 'Senkronizasyon basarisiz oldu';
    }
  };

  const getProgressColor = () => {
    if (stage === 'failed') return 'bg-red-600';
    if (stage === 'completed') return 'bg-green-600';
    return 'bg-blue-600';
  };

  const canClose = stage === 'completed' || stage === 'failed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          {getStageIcon()}
          <h2 className="text-2xl font-bold text-gray-900 mt-4">{getStageText()}</h2>
          {companyName && (
            <p className="text-sm text-gray-600 mt-2">{companyName}</p>
          )}
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">
              {dateRange.start} - {dateRange.end}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {stage !== 'failed' && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>{progress}%</span>
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{elapsedTime}s</span>
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {stage === 'failed' && error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics */}
        {(stage === 'processing' || stage === 'completed') && stats.totalRecords > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 mb-1">Toplam</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalRecords}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-600 mb-1">Yeni</div>
              <div className="text-2xl font-bold text-green-700">{stats.newRecords}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-xs text-yellow-600 mb-1">Guncellenen</div>
              <div className="text-2xl font-bold text-yellow-700">{stats.updatedRecords}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600 mb-1">Degismedi</div>
              <div className="text-2xl font-bold text-blue-700">{stats.unchangedRecords}</div>
            </div>
          </div>
        )}

        {/* Close Button */}
        {canClose && (
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Kapat
          </button>
        )}

        {/* Loading Spinner */}
        {!canClose && (
          <div className="flex justify-center">
            <div className="text-sm text-gray-500">Lutfen bekleyin...</div>
          </div>
        )}
      </div>
    </div>
  );
}
