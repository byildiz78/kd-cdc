'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, TrendingUp, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

interface SalesData {
  SheetDate: string;
  MainAccountingCode: string;
  AccountingCode: string;
  MenuItemText: string;
  BranchName: string;
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

export default function SalesDataPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
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
      loadSalesData();
    }
  }, [authLoading, user]);

  const loadSalesData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('Fetching sales data:', { startDate, endDate });

      const response = await fetch(
        getApiEndpoint(`/api/sales?startDate=${startDate}&endDate=${endDate}`)
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || 'Failed to fetch sales data');
      }

      const data = await response.json();
      console.log('Received sales data:', { count: data.length, sample: data[0] });
      setSalesData(data);
    } catch (err) {
      setError('Satış verileri yüklenirken bir hata oluştu: ' + (err instanceof Error ? err.message : String(err)));
      console.error('Error loading sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiEndpoint('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const handleApplyFilter = () => {
    setCurrentPage(1);
    loadSalesData();
  };

  const uniqueBranches = useMemo(() => {
    const branches = salesData.map(item => ({
      code: item.BranchCode,
      name: item.BranchName
    }));
    const unique = Array.from(new Map(branches.map(b => [b.code, b])).values());
    return unique.sort((a, b) => a.code.localeCompare(b.code));
  }, [salesData]);

  const filteredData = useMemo(() => {
    let filtered = salesData;

    if (branchFilter) {
      filtered = filtered.filter(item => item.BranchCode === branchFilter);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.SheetDate?.toLowerCase().includes(lowerSearch) ||
        item.BranchCode?.toLowerCase().includes(lowerSearch) ||
        item.BranchName?.toLowerCase().includes(lowerSearch) ||
        item.MainAccountingCode?.toLowerCase().includes(lowerSearch) ||
        item.AccountingCode?.toLowerCase().includes(lowerSearch) ||
        item.MenuItemText?.toLowerCase().includes(lowerSearch) ||
        item.BranchID?.toString().includes(lowerSearch)
      );
    }

    return filtered;
  }, [salesData, searchTerm, branchFilter]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(num);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar username={user?.username} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-lg">
          <div className="px-8 py-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Satış Verileri</h1>
                <p className="text-gray-600">Satış verilerini görüntüleyin ve analiz edin</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="px-8 py-4">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">Başlangıç Tarihi:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Bitiş Tarihi:</label>
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
                          {branch.code} - {branch.name || 'İsimsiz'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                  <button
                    onClick={handleApplyFilter}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Yükleniyor...' : 'Uygula'}
                  </button>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Ara..."
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
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
                <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Veriler yükleniyor...</p>
              </div>
            ) : salesData.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
                <div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <TrendingUp className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Veri bulunamadı</h3>
                <p className="text-gray-600 text-lg">
                  Seçilen tarih aralığında satış verisi bulunamadı.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Şube
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Ürün
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Miktar
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Ara Toplam
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          KDV
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Toplam
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          KDV %
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Harici
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedData.map((item, index) => (
                        <tr
                          key={index}
                          className={`hover:bg-blue-50 transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                        >
                          <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-900">
                            {item.SheetDate}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-semibold text-gray-900">
                                {item.BranchName || 'İsimsiz Şube'}
                              </span>
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block w-fit">
                                {item.BranchCode}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col space-y-1">
                              <span className="text-sm font-medium text-gray-900">
                                {item.MenuItemText}
                              </span>
                              <span className="text-xs text-gray-500">
                                {item.MainAccountingCode || '-'} - {item.AccountingCode}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatNumber(item.Quantity)}
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.SubTotal)}
                            </span>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-orange-600">
                              {formatCurrency(item.TaxTotal)}
                            </span>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                              {formatCurrency(item.Total)}
                            </span>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-center text-sm text-gray-900">
                            %{item.TaxPercent}
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-center">
                            {item.IsExternal ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Evet
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Hayır
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      Toplam <span className="font-bold">{filteredData.length}</span> kayıt
                      {searchTerm && ` (${salesData.length} kayıttan filtrelendi)`}
                      {' '}- Sayfa <span className="font-bold">{currentPage}</span> / <span className="font-bold">{totalPages || 1}</span>
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
