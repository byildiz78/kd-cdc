'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Play, Clock, CheckCircle, XCircle } from 'lucide-react';
import SyncProgressModal from '@/components/SyncProgressModal';

export default function SalesSyncPage() {
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [syncForm, setSyncForm] = useState({
    companyId: '',
    startDate: today,
    endDate: today,
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchCompanies();
    fetchSyncHistory();
  }, [currentPage]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setCompanies(data.data);
        setSyncForm((prev) => ({ ...prev, companyId: data.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchSyncHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      const response = await fetch(`/api/sync/history?${params}`);
      const data = await response.json();

      if (data.success) {
        setSyncHistory(data.data.batches);
        setTotalRecords(data.data.totalRecords || 0);
      }
    } catch (error) {
      console.error('Failed to fetch sync history:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleManualSync = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!syncForm.companyId || !syncForm.startDate || !syncForm.endDate) {
      alert('Lutfen tum alanlari doldurun');
      return;
    }

    setSyncing(true);
    setShowModal(true);

    // Wait for modal to mount
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const getModal = () => (window as any).__syncProgressModal;

      // Stage 1: Connecting (0-20%)
      getModal()?.updateProgress('connecting', 10);
      await new Promise(resolve => setTimeout(resolve, 500));
      getModal()?.updateProgress('connecting', 20);

      // Stage 2: Fetching (20-50%)
      getModal()?.updateProgress('fetching', 30);

      // Format dates with time
      const formattedStartDate = `${syncForm.startDate} 00:00:00`;
      const formattedEndDate = `${syncForm.endDate} 23:59:59`;

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: syncForm.companyId,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        }),
      });

      const data = await response.json();

      getModal()?.updateProgress('fetching', 50);

      if (data.success) {
        // Stage 3: Processing (50-90%)
        getModal()?.updateProgress('processing', 60, {
          totalRecords: data.data.statistics.totalRecords,
        });
        await new Promise(resolve => setTimeout(resolve, 300));

        getModal()?.updateProgress('processing', 75, {
          totalRecords: data.data.statistics.totalRecords,
          newRecords: data.data.statistics.newRecords,
          updatedRecords: data.data.statistics.updatedRecords,
        });
        await new Promise(resolve => setTimeout(resolve, 300));

        getModal()?.updateProgress('processing', 90, {
          totalRecords: data.data.statistics.totalRecords,
          newRecords: data.data.statistics.newRecords,
          updatedRecords: data.data.statistics.updatedRecords,
          unchangedRecords: data.data.statistics.unchangedRecords,
        });

        // Stage 4: Completed
        await new Promise(resolve => setTimeout(resolve, 300));
        getModal()?.setCompleted({
          totalRecords: data.data.statistics.totalRecords,
          newRecords: data.data.statistics.newRecords,
          updatedRecords: data.data.statistics.updatedRecords,
          unchangedRecords: data.data.statistics.unchangedRecords,
        });

        fetchSyncHistory();
      } else {
        getModal()?.setFailed(data.error || 'Bilinmeyen hata olustu');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      const getModal = () => (window as any).__syncProgressModal;
      getModal()?.setFailed('Senkronizasyon basarisiz oldu');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'RUNNING':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (durationMs: number | null) => {
    if (!durationMs) return '-';

    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}dk ${remainingSeconds}s`;
  };

  return (
    <>
      <SyncProgressModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        companyName={companies.find((c) => c.id === syncForm.companyId)?.name}
        dateRange={{ start: syncForm.startDate, end: syncForm.endDate }}
      />

      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <RefreshCw className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Senkronizasyon Yonetimi</h1>
          </div>
          <p className="text-gray-600">
            Manuel senkronizasyon baslatma ve gecmis kayitlar
          </p>
        </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manuel Senkronizasyon</h2>
        <form onSubmit={handleManualSync} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma *
              </label>
              <select
                value={syncForm.companyId}
                onChange={(e) => setSyncForm({ ...syncForm, companyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {companies.length === 0 && (
                  <option value="">Yukleniyor...</option>
                )}
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Baslangic Tarihi *
              </label>
              <input
                type="date"
                value={syncForm.startDate}
                onChange={(e) => setSyncForm({ ...syncForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitis Tarihi *
              </label>
              <input
                type="date"
                value={syncForm.endDate}
                onChange={(e) => setSyncForm({ ...syncForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={syncing}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              <span>{syncing ? 'Senkronize ediliyor...' : 'Baslat'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Senkronizasyon Gecmisi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih Araligi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baslangic</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Yeni</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Guncellenen</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Degismeyen</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sure</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Yukleniyor...
                  </td>
                </tr>
              ) : syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Senkronizasyon kaydi bulunamadi
                  </td>
                </tr>
              ) : (
                syncHistory.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(batch.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(batch.status)}`}>
                          {batch.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {batch.dateRange.startDate} - {batch.dateRange.endDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(batch.timing.startedAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {batch.statistics.totalRecords}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {batch.statistics.newRecords}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                      {batch.statistics.updatedRecords}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {batch.statistics.unchangedRecords || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {formatDuration(batch.timing.duration)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Toplam {totalRecords} kayıt (Sayfa {currentPage} / {totalPages})
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İlk
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Son
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
