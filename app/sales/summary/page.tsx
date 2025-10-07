'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Download, Filter } from 'lucide-react';

export default function SalesSummaryPage() {
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    branchCode: '',
    accountingCode: '',
  });
  const [totals, setTotals] = useState({
    quantity: 0,
    subTotal: 0,
    taxTotal: 0,
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchSummaryData();
    }
  }, [filters, currentPage]);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(filters.branchCode && { branchCode: filters.branchCode }),
        ...(filters.accountingCode && { accountingCode: filters.accountingCode }),
      });

      const response = await fetch(`/api/sales/summary?${params}`);
      const data = await response.json();

      if (data.success) {
        setSummaryData(data.data.records);
        setTotals(data.data.totals);
        setTotalRecords(data.data.totalRecords || 0);
      }
    } catch (error) {
      console.error('Failed to fetch summary data:', error);
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
    const headers = ['Tarih', 'Sube', 'Muhasebe Kodu', 'Miktar', 'Ara Toplam', 'KDV', 'Toplam'];
    const rows = summaryData.map(s => [
      s.sheetDate,
      s.branch.code,
      s.accounting.code,
      s.values.quantity,
      s.values.subTotal.toFixed(2),
      s.values.taxTotal.toFixed(2),
      s.values.total.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-summary-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Ozet Satis Verileri</h1>
            </div>
            <p className="text-gray-600">
              Muhasebe koduna gore gruplanmis agregasyon verileri
            </p>
          </div>
          {summaryData.length > 0 && (
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
              Baslangic Tarihi *
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
              Bitis Tarihi *
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
              Sube Kodu
            </label>
            <input
              type="text"
              value={filters.branchCode}
              onChange={(e) => setFilters({ ...filters, branchCode: e.target.value })}
              placeholder="Tumu"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Muhasebe Kodu
            </label>
            <input
              type="text"
              value={filters.accountingCode}
              onChange={(e) => setFilters({ ...filters, accountingCode: e.target.value })}
              placeholder="Tumu"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {summaryData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Toplam Miktar</div>
            <div className="text-2xl font-bold text-gray-900">{totals.quantity.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Ara Toplam</div>
            <div className="text-2xl font-bold text-gray-900">{totals.subTotal.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">KDV Toplami</div>
            <div className="text-2xl font-bold text-gray-900">{totals.taxTotal.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Genel Toplam</div>
            <div className="text-2xl font-bold text-blue-600">{totals.total.toFixed(2)}</div>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Combo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">KDV</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Miktar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ara Toplam</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">KDV</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Yukleniyor...
                  </td>
                </tr>
              ) : !filters.startDate || !filters.endDate ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Tarih araligi seciniz
                  </td>
                </tr>
              ) : summaryData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    Kayit bulunamadi
                  </td>
                </tr>
              ) : (
                summaryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.sheetDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.branch.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {row.accounting.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {row.accounting.isMainCombo ? (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">Ana</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                      {row.taxPercent}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {row.values.quantity.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {row.values.subTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {row.values.taxTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {row.values.total.toFixed(2)}
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
