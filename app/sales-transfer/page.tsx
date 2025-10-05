'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, Upload, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

interface SalesSummary {
  SheetDate: string;
  MainAccountingCode: string;
  AccountingCode: string;
  IsMainCombo: number;
  Quantity: number;
  SubTotal: number;
  TaxTotal: number;
  Total: number;
  TaxPercent: number;
  BranchID: number;
  BranchCode: string;
  IsExternal: boolean;
}

export default function SalesTransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<SalesSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(getApiEndpoint('/api/auth/verify'));
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      loadSummaryData();
    }
  }, [authLoading, user]);

  const loadSummaryData = async () => {
    setLoading(true);
    setError('');
    setSelectedRows(new Set());
    setSelectAll(false);

    try {
      const response = await fetch(
        getApiEndpoint(`/api/sales/summary?startDate=${startDate}&endDate=${endDate}`)
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch summary data');
      }

      const data = await response.json();
      setSummaryData(data);
    } catch (err) {
      setError('Özet veriler yüklenirken bir hata oluştu: ' + (err instanceof Error ? err.message : String(err)));
      console.error('Error loading summary data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
    loadSummaryData();
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiEndpoint('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const filteredData = useMemo(() => {
    return summaryData.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.AccountingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.MainAccountingCode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBranch = branchFilter === '' || item.BranchCode === branchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [summaryData, searchTerm, branchFilter]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(summaryData.map(item => item.BranchCode))).sort();
  }, [summaryData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      const allIndices = new Set(filteredData.map((_, index) => index));
      setSelectedRows(allIndices);
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === filteredData.length);
  };

  const handleTransfer = () => {
    const selectedData = Array.from(selectedRows).map(index => filteredData[index]);
    console.log('Transferring data:', selectedData);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar username={user.username} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Satış Verileri Aktarım</h1>
                  <p className="text-sm text-gray-500 mt-1">Satış verilerini seçerek aktarın</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="h-4 w-4 inline mr-1" />
                    Muhasebe Kodu
                  </label>
                  <input
                    type="text"
                    placeholder="Kod ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şube</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tümü</option>
                    {uniqueBranches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <button
                  onClick={handleApplyFilter}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Verileri Yükle
                </button>

                <button
                  onClick={handleTransfer}
                  disabled={selectedRows.size === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seçili Kayıtları Aktar ({selectedRows.size})
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                  <p className="font-medium">Hata</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Veriler yükleniyor...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Muhasebe Kodu</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Alt Toplam</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">KDV</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">KDV %</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                              Veri bulunamadı
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((item, pageIndex) => {
                            const globalIndex = (currentPage - 1) * itemsPerPage + pageIndex;
                            const accountingCode = item.MainAccountingCode || item.AccountingCode;
                            return (
                              <tr key={pageIndex} className={`hover:bg-gray-50 ${selectedRows.has(globalIndex) ? 'bg-blue-50' : ''}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.has(globalIndex)}
                                    onChange={() => handleRowSelect(globalIndex)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(item.SheetDate).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{accountingCode}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.BranchCode}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.Quantity.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.SubTotal.toFixed(2)} ₺</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.TaxTotal.toFixed(2)} ₺</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{item.Total.toFixed(2)} ₺</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.TaxPercent}%</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredData.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">{filteredData.length}</span> kayıt bulundu
                            {selectedRows.size > 0 && (
                              <span className="ml-2 text-blue-600 font-medium">
                                ({selectedRows.size} seçili)
                              </span>
                            )}
                          </div>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value={20}>20 / sayfa</option>
                            <option value={50}>50 / sayfa</option>
                            <option value={100}>100 / sayfa</option>
                            <option value={500}>500 / sayfa</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <span className="text-sm text-gray-700">
                            Sayfa {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
