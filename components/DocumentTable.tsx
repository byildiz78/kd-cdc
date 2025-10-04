'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle } from 'lucide-react';

interface DocumentTableProps {
  documents: any[];
  onDocumentClick: (document: any) => void;
}

type SortField = 'InvoiceDate' | 'BranchName' | 'CustomerName' | 'CustomerTaxNo' | 'InvoiceTotal';
type SortDirection = 'asc' | 'desc';

export default function DocumentTable({ documents, onDocumentClick }: DocumentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<SortField>('InvoiceDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'InvoiceDate') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = sortedDocuments.slice(startIndex, endIndex);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th 
                className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                onClick={() => handleSort('InvoiceDate')}
              >
                <div className="flex items-center space-x-2 group-hover:text-blue-600">
                  <span>Belge Tarihi</span>
                  <SortIcon field="InvoiceDate" />
                </div>
              </th>
              <th 
                className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                onClick={() => handleSort('BranchName')}
              >
                <div className="flex items-center space-x-2 group-hover:text-blue-600">
                  <span>Şube Adı</span>
                  <SortIcon field="BranchName" />
                </div>
              </th>
              <th 
                className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                onClick={() => handleSort('CustomerName')}
              >
                <div className="flex items-center space-x-2 group-hover:text-blue-600">
                  <span>Müşteri Adı</span>
                  <SortIcon field="CustomerName" />
                </div>
              </th>
              <th 
                className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                onClick={() => handleSort('CustomerTaxNo')}
              >
                <div className="flex items-center space-x-2 group-hover:text-blue-600">
                  <span>Vergi No</span>
                  <SortIcon field="CustomerTaxNo" />
                </div>
              </th>
              <th 
                className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                onClick={() => handleSort('InvoiceTotal')}
              >
                <div className="flex items-center space-x-2 group-hover:text-blue-600">
                  <span>Tutar</span>
                  <SortIcon field="InvoiceTotal" />
                </div>
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Aktarıldı
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentDocuments.map((document, index) => (
              <tr 
                key={document.OrderKey} 
                className={`hover:bg-blue-50 transition-all duration-200 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(document.InvoiceDate)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate" title={document.BranchName}>
                      {document.BranchName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {document.Type}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 truncate" title={document.CustomerName}>
                      {document.CustomerName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {document.CustomerEMail}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {document.CustomerTaxNo}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    {formatCurrency(document.InvoiceTotal)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    {document.IsTransferred === 1 ? (
                      <div className="flex flex-col items-center space-y-1">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Evet</span>
                        </div>
                        {document.REF_NO && (
                          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            {document.REF_NO}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-red-600">Hayır</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {/* Item ve Payment count badges */}
                    <div className="flex items-center space-x-1 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                        {document.ItemCount || 0} kalem
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">
                        {document.PaymentCount || 0} \u00f6deme
                      </span>
                    </div>
                    <button
                      onClick={() => onDocumentClick(document)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detay
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg shadow-sm">
                  <span className="font-medium">{startIndex + 1}</span>
                  {' - '}
                  <span className="font-medium">{Math.min(endIndex, sortedDocuments.length)}</span>
                  {' / '}
                  <span className="font-medium">{sortedDocuments.length}</span>
                  {' sonuç gösteriliyor'}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-lg -space-x-px bg-white" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {generatePageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                      disabled={typeof page !== 'number'}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-md'
                          : typeof page === 'number'
                          ? 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200'
                          : 'bg-white border-gray-300 text-gray-300 cursor-default'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}