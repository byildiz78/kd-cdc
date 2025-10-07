'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';

export default function DeltaChangesPage() {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50;

  const formatDateUTC = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const [filters, setFilters] = useState({
    startDate: thirtyDaysAgo,
    endDate: today,
    deltaType: '',
    processed: '',
  });
  const [stats, setStats] = useState({
    totalDeltas: 0,
    processedDeltas: 0,
    pendingDeltas: 0,
  });

  useEffect(() => {
    fetchChanges();
  }, [filters, currentPage]);

  const fetchChanges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(filters.deltaType && { deltaType: filters.deltaType }),
        ...(filters.processed && { processed: filters.processed }),
      });

      const response = await fetch(`/api/reports/delta-changes?${params}`);
      const data = await response.json();

      if (data.success) {
        setChanges(data.data.records);
        setStats(data.data.stats);
        setTotalRecords(data.data.totalRecords || 0);
      }
    } catch (error) {
      console.error('Failed to fetch changes:', error);
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

  const handleExport = () => {
    const headers = ['Tarih', 'Sube', 'Muhasebe Kodu', 'Tip', 'Miktar Farki', 'Tutar Farki', 'Islendi', 'Snapshot'];
    const rows = changes.map(c => [
      c.sheetDate,
      c.branchCode,
      c.accountingCode,
      c.deltaType,
      c.quantityDelta != null ? c.quantityDelta.toFixed(2) : '0.00',
      c.totalDelta != null ? c.totalDelta.toFixed(2) : '0.00',
      c.processed ? 'Evet' : 'Hayir',
      c.snapshotId || '-',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delta-changes-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <AlertCircle className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Delta Degisiklikleri</h1>
            </div>
            <p className="text-gray-600">
              Summary verilerindeki degisiklik kayitlari
            </p>
          </div>
          {changes.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              <span>CSV Indir</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Baslangic Tarihi
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitis Tarihi
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delta Tipi
            </label>
            <select
              value={filters.deltaType}
              onChange={(e) => setFilters({ ...filters, deltaType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tumu</option>
              <option value="PRE_SNAPSHOT">PRE_SNAPSHOT</option>
              <option value="POST_SNAPSHOT">POST_SNAPSHOT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durum
            </label>
            <select
              value={filters.processed}
              onChange={(e) => setFilters({ ...filters, processed: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tumu</option>
              <option value="true">Islendi</option>
              <option value="false">Beklemede</option>
            </select>
          </div>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Toplam Delta</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalDeltas}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Islenen</div>
            <div className="text-2xl font-bold text-green-600">{stats.processedDeltas}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Bekleyen</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingDeltas}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Muhasebe Kodu</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Miktar Δ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar Δ</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Olusturulma</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Yukleniyor...
                  </td>
                </tr>
              ) : changes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Delta kaydi bulunamadi
                  </td>
                </tr>
              ) : (
                changes.map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {change.sheetDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {change.branchCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {change.accountingCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        change.deltaType === 'PRE_SNAPSHOT'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {change.deltaType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {change.quantityDelta > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : change.quantityDelta < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className={change.quantityDelta > 0 ? 'text-green-600' : change.quantityDelta < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {change.quantityDelta != null ? change.quantityDelta.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {change.totalDelta > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : change.totalDelta < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className={change.totalDelta > 0 ? 'text-green-600' : change.totalDelta < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {change.totalDelta != null ? change.totalDelta.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        change.processed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {change.processed ? 'Islendi' : 'Beklemede'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {change.changedAt ? formatDateUTC(change.changedAt) : '-'}
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
  );
}
