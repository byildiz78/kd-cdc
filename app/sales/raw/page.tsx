'use client';

import { useState, useEffect } from 'react';
import { Table, Search, Calendar, Filter, Copy, Check } from 'lucide-react';

export default function SalesRawPage() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    branchCode: '',
    orderKey: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRawData();
  }, [page, filters]);

  const fetchRawData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.branchCode && { branchCode: filters.branchCode }),
        ...(filters.orderKey && { orderKey: filters.orderKey }),
      });

      console.log('Fetching raw data with params:', params.toString());
      const response = await fetch(`/api/sales/raw?${params}`);
      const data = await response.json();
      console.log('Raw data response:', data);

      if (data.success) {
        setRawData(data.data.records);
        setTotalPages(data.data.pagination.totalPages);
        console.log('Records loaded:', data.data.records.length);
      } else {
        console.error('API returned error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch raw data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const handleCopyOrderKey = (orderKey: string) => {
    navigator.clipboard.writeText(orderKey);
    setCopiedKey(orderKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Table className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Ham Satis Verileri</h1>
        </div>
        <p className="text-gray-600">
          SQL Server dan cekilen islenmemis satis transaction kayitlari
        </p>
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
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
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
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sube Kodu
            </label>
            <input
              type="text"
              value={filters.branchCode}
              onChange={(e) => handleFilterChange('branchCode', e.target.value)}
              placeholder="Orn: 001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Key
            </label>
            <input
              type="text"
              value={filters.orderKey}
              onChange={(e) => handleFilterChange('orderKey', e.target.value)}
              placeholder="Siparis anahtari"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urun</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Muhasebe Kodu</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Miktar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Versiyon</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Yukleniyor...
                  </td>
                </tr>
              ) : rawData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Kayit bulunamadi
                  </td>
                </tr>
              ) : (
                rawData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[150px]" title={row.orderKey}>
                          {row.orderKey.substring(0, 8)}...
                        </span>
                        <button
                          onClick={() => handleCopyOrderKey(row.orderKey)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Kopyala"
                        >
                          {copiedKey === row.orderKey ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(row.orderDateTime).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.branchCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.menuItemText}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {row.accountingCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {row.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {row.lineTotal ? row.lineTotal.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        v{row.version}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Sayfa {page} / {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Onceki
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
