'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, FileText, Download, RefreshCw, List, LayoutGrid, Building, CreditCard, X, LogOut, User } from 'lucide-react';
import DocumentCard from '@/components/DocumentCard';
import DocumentTable from '@/components/DocumentTable';
import BranchGroupedTable from '@/components/BranchGroupedTable';
import DateRangeFilter from '@/components/DateRangeFilter';
import DocumentModal from '@/components/DocumentModal';
import { fetchInvoices, fetchInvoiceHeaders, fetchInvoiceDetail } from '@/lib/api';
import { InvoiceHeader, InvoiceDetail } from '@/types/invoice';
import { getApiEndpoint } from '@/lib/utils/api';

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<InvoiceHeader[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<InvoiceHeader[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<InvoiceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [transferStatusFilter, setTransferStatusFilter] = useState<'all' | 'transferred' | 'not-transferred'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'branch'>('branch');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDateFilterLoading, setIsDateFilterLoading] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check authentication
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

  // İlk yükleme artık DateRangeFilter tarafından tetikleniyor
  // Bu useEffect kaldırıldı

  // Reload documents when date range changes or refresh is triggered
  useEffect(() => {
    if (dateRange && dateRange.start && dateRange.end) {
      const loadFilteredDocuments = async () => {
        try {
          setIsDateFilterLoading(true);
          setError('');
          
          // YENİ: fetchInvoiceHeaders kullan
          const data = await fetchInvoiceHeaders({
            startDate: dateRange.start,
            endDate: dateRange.end
          });
          setDocuments(data);
          setFilteredDocuments(data);
        } catch (err) {
          setError('Belgeler yüklenirken bir hata oluştu');
          console.error('Error loading documents:', err);
        } finally {
          setIsDateFilterLoading(false);
        }
      };

      loadFilteredDocuments();
    }
  }, [dateRange?.start, dateRange?.end, refreshTrigger]);

  // Filter documents based on search term and transfer status (date filtering is done on server)
  useEffect(() => {
    let filtered = documents;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter((doc: InvoiceHeader) =>
        doc.CustomerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.OrderID?.toString().includes(searchTerm) ||
        doc.BranchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.CustomerTaxNo?.includes(searchTerm) ||
        doc.Type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply transfer status filter
    if (transferStatusFilter !== 'all') {
      filtered = filtered.filter((doc: InvoiceHeader) => {
        if (transferStatusFilter === 'transferred') {
          return doc.IsTransferred === 1;
        } else if (transferStatusFilter === 'not-transferred') {
          return doc.IsTransferred === 0;
        }
        return true;
      });
    }

    setFilteredDocuments(filtered);
  }, [searchTerm, documents, transferStatusFilter]);

  const handleDocumentClick = async (document: InvoiceHeader) => {
    setLoadingDetail(true);
    try {
      // YENİ: Detayı ayrı fetch et
      const detail = await fetchInvoiceDetail(document.OrderKey);
      setSelectedDocument(detail);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading invoice detail:', error);
      setError('Fatura detayı yüklenirken hata oluştu');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ start: startDate, end: endDate });
    // Trigger refresh even if dates are the same
    setRefreshTrigger(prev => prev + 1);
  };


  const handleTransferStatusChange = (status: 'all' | 'transferred' | 'not-transferred') => {
    setTransferStatusFilter(status);
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiEndpoint('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout API fails
      router.push('/login');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const totalAmount = isDateFilterLoading ? 0 : filteredDocuments.reduce((sum: number, doc: any) => sum + (doc.InvoiceTotal || 0), 0);
  const documentCount = isDateFilterLoading ? 0 : filteredDocuments.length;
  const branchCount = isDateFilterLoading ? 0 : new Set(filteredDocuments.map((doc: any) => doc.BranchName)).size;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {authLoading ? 'Kimlik doğrulanıyor...' : 'Belgeler yükleniyor...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hata Oluştu</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-3 mb-4 lg:mb-0">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">robotPOS E-Arşiv Belge Yönetimi</h1>
                <p className="text-gray-600">Belge ve fatura yönetim sistemi</p>
              </div>
              <a
                href={getApiEndpoint('/api/docs')}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200"
              >
                API Docs
              </a>
            </div>
            
            {/* User Info & Search */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-1 text-gray-500 hover:text-red-600 transition-colors"
                  title="Çıkış Yap"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-2 space-x-2 shadow-lg border border-gray-300">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    viewMode === 'table' 
                      ? 'bg-white text-blue-600 shadow-xl border-2 border-blue-200' 
                      : 'text-gray-600 hover:text-blue-500 hover:bg-white/50'
                  }`}
                  title="Tablo Görünümü"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-blue-600 shadow-xl border-2 border-blue-200' 
                      : 'text-gray-600 hover:text-blue-500 hover:bg-white/50'
                  }`}
                  title="Kart Görünümü"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('branch')}
                  className={`p-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    viewMode === 'branch' 
                      ? 'bg-white text-blue-600 shadow-xl border-2 border-blue-200' 
                      : 'text-gray-600 hover:text-blue-500 hover:bg-white/50'
                  }`}
                  title="Şube Bazlı Görünüm"
                >
                  <Building className="h-5 w-5" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Belge ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-80 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <DateRangeFilter 
          onDateRangeChange={handleDateRangeChange}
          onTransferStatusChange={handleTransferStatusChange}
        />
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 w-fit mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Toplam Belge</p>
              <p className="text-3xl font-bold text-gray-900">{documentCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 w-fit mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Toplam Tutar</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 w-fit mx-auto mb-4">
                <Building className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Toplam Şube</p>
              <p className="text-3xl font-bold text-orange-600">{branchCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 w-fit mx-auto mb-4">
                <Filter className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Belge Türleri</p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {isDateFilterLoading ? 0 : filteredDocuments.filter((doc: any) => doc.Type?.includes('FATURA')).length}
                  </p>
                  <p className="text-xs text-gray-500">E-Fatura</p>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {isDateFilterLoading ? 0 : filteredDocuments.filter((doc: any) => doc.Type?.includes('ARSIV') || doc.Type?.includes('ARŞİV')).length}
                  </p>
                  <p className="text-xs text-gray-500">E-Arşiv</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        {isDateFilterLoading ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Belgeler yükleniyor...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
            <div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Belge bulunamadı</h3>
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'Arama kriterlerinize uygun belge bulunamadı.' : 
               !dateRange ? 'Belgeleri görüntülemek için tarih aralığı seçip "Uygula" butonuna basın.' : 
               'Seçilen tarih aralığında belge bulunamadı.'}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <DocumentTable
                documents={filteredDocuments}
                onDocumentClick={handleDocumentClick}
              />
            ) : viewMode === 'branch' ? (
              <BranchGroupedTable
                documents={filteredDocuments}
                onDocumentClick={handleDocumentClick}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDocuments.map((document: any) => (
                  <DocumentCard
                    key={document.OrderKey}
                    document={document}
                    onClick={() => handleDocumentClick(document)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <DocumentModal
        documentData={selectedDocument}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        loading={loadingDetail}
      />
    </div>
  );
}