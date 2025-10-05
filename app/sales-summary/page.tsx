'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, ChartBar as BarChart3, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function SalesSummaryPage() {
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

  const uniqueBranches = useMemo(() => {
    const branchMap = new Map<string, { code: string }>();
    summaryData.forEach(item => {
      if (!branchMap.has(item.BranchCode)) {
        branchMap.set(item.BranchCode, { code: item.BranchCode });
      }
    });
    return Array.from(branchMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [summaryData]);

  const filteredData = useMemo(() => {
    return summaryData.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.AccountingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.MainAccountingCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = branchFilter === '' || item.BranchCode === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [summaryData, searchTerm, branchFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar username={user?.username} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Satış Verileri Özet</h1>
                  <p className="text-sm text-gray-500">Satış verilerinin özet görünümü</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-full mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Başlangıç:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Bitiş:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Şube:</label>
                  <div className="w-[250px]">
                    <select
                      value={branchFilter}
                      onChange={(e) => {
                        setBranchFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent truncate"
                    >
                      <option value="">Tüm Şubeler</option>
                      {uniqueBranches.map((branch) => (
                        <option key={branch.code} value={branch.code}>
                          {branch.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                  <button
                    onClick={handleApplyFilter}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Filtrele</span>
                  </button>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Muhasebe kodu ara..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                  </div>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={20}>20 kayıt</option>
                    <option value={50}>50 kayıt</option>
                    <option value={100}>100 kayıt</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
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
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                              Veri bulunamadı
                            </td>
                          </tr>
                        ) : (
                          paginatedData.map((item, index) => {
                            const accountingCode = item.MainAccountingCode || item.AccountingCode;
                            return (
                              <tr key={index} className="hover:bg-gray-50">
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

                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{filteredData.length}</span> kayıttan {' '}
                        <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>-
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> arası gösteriliyor
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>

                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`px-3 py-1 rounded-lg ${
                                  currentPage === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
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
