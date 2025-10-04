'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, FileText, CreditCard, Calendar, Eye, CheckCircle2, XCircle } from 'lucide-react';

interface BranchGroupedTableProps {
  documents: any[];
  onDocumentClick: (document: any) => void;
}

interface BranchGroup {
  branchName: string;
  documents: any[];
  totalAmount: number;
  documentCount: number;
  eFaturaCount: number;
  eArsivCount: number;
  lastDocumentDate: string;
  transferredCount: number;
}

export default function BranchGroupedTable({ documents, onDocumentClick }: BranchGroupedTableProps) {
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTimeOnly = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', {
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

  // Group documents by branch
  const groupedData: BranchGroup[] = documents.reduce((acc: BranchGroup[], doc: any) => {
    const branchName = doc.BranchName || 'Bilinmeyen Şube';
    let existingGroup = acc.find(group => group.branchName === branchName);
    
    if (!existingGroup) {
      existingGroup = {
        branchName,
        documents: [],
        totalAmount: 0,
        documentCount: 0,
        eFaturaCount: 0,
        eArsivCount: 0,
        lastDocumentDate: doc.InvoiceDate,
        transferredCount: 0
      };
      acc.push(existingGroup);
    }
    
    existingGroup.documents.push(doc);
    existingGroup.totalAmount += doc.InvoiceTotal || 0;
    existingGroup.documentCount += 1;
    
    // En yeni belge tarihini güncelle
    if (new Date(doc.InvoiceDate) > new Date(existingGroup.lastDocumentDate)) {
      existingGroup.lastDocumentDate = doc.InvoiceDate;
    }
    
    if (doc.Type?.includes('FATURA')) {
      existingGroup.eFaturaCount += 1;
    } else if (doc.Type?.includes('ARSIV') || doc.Type?.includes('ARŞİV')) {
      existingGroup.eArsivCount += 1;
    }
    
    // Aktarılan belge sayısını güncelle
    if (doc.IsTransferred === 1) {
      existingGroup.transferredCount += 1;
    }
    
    return acc;
  }, []);

  // Sort branches by total amount (descending)
  groupedData.sort((a, b) => b.totalAmount - a.totalAmount);

  const toggleBranch = (branchName: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchName)) {
      newExpanded.delete(branchName);
    } else {
      newExpanded.add(branchName);
    }
    setExpandedBranches(newExpanded);
  };

  const expandAll = () => {
    setExpandedBranches(new Set(groupedData.map(group => group.branchName)));
  };

  const collapseAll = () => {
    setExpandedBranches(new Set());
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Şube Bazlı Görünüm</h3>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {groupedData.length} Şube
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={expandAll}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
            >
              Tümünü Aç
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              Tümünü Kapat
            </button>
          </div>
        </div>
      </div>

      {/* Branch Groups */}
      <div className="divide-y-4 divide-gray-300">
        {groupedData.map((group, groupIndex) => {
          const isExpanded = expandedBranches.has(group.branchName);
          
          return (
            <div key={group.branchName} className="transition-all duration-200">
              {/* Branch Header */}
              <div
                className={`px-6 py-5 cursor-pointer hover:bg-blue-50 transition-all duration-200 ${
                  isExpanded ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:border-l-4 hover:border-blue-300'
                }`}
                onClick={() => toggleBranch(group.branchName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-blue-600 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400 transition-transform duration-200" />
                      )}
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{group.branchName}</h4>
                      <p className="text-sm text-gray-600">
                        {group.documentCount} belge • {group.eFaturaCount} E-Fatura • {group.eArsivCount} E-Arşiv
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs font-medium text-gray-500">Son belge:</span>
                        <div className="flex items-center space-x-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                            {formatDateOnly(group.lastDocumentDate)}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {formatTimeOnly(group.lastDocumentDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {/* Stats Cards */}
                    <div className="flex items-center space-x-4">
                      <div className="text-center bg-white rounded-xl px-6 py-4 shadow-md border border-gray-200 min-w-[120px]">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Belge Sayısı</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{group.documentCount}</p>
                        <p className="text-xs text-gray-500 mt-1">Toplam Belge</p>
                      </div>
                      
                      <div className="text-center bg-white rounded-xl px-6 py-4 shadow-md border border-gray-200 min-w-[140px]">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CreditCard className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Toplam Tutar</span>
                        </div>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(group.totalAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">Belge Toplamı</p>
                      </div>
                      
                      <div className="text-center bg-white rounded-xl px-6 py-4 shadow-md border border-gray-200 min-w-[140px]">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Aktarılan</span>
                        </div>
                        <div className="flex items-center justify-center space-x-1">
                          <p className="text-xl font-bold text-purple-600">{group.transferredCount}</p>
                          <p className="text-sm text-gray-500">/ {group.documentCount}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          %{Math.round((group.transferredCount / group.documentCount) * 100)} Tamamlandı
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch Documents */}
              {isExpanded && (
                <div className="bg-gray-50">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Belge Tarihi
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Müşteri Adı
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Vergi No
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Tür
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Tutar
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Aktarıldı
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {group.documents
                          .sort((a, b) => new Date(b.InvoiceDate).getTime() - new Date(a.InvoiceDate).getTime())
                          .map((document, docIndex) => (
                          <tr 
                            key={document.OrderKey} 
                            className={`hover:bg-blue-50 transition-all duration-200 ${
                              docIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div className="text-sm font-medium text-gray-900">
                                  {formatDate(document.InvoiceDate)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="max-w-xs">
                                <div className="text-sm font-medium text-gray-900 truncate" title={document.CustomerName}>
                                  {document.CustomerName && document.CustomerName.length > 20 
                                    ? document.CustomerName.substring(0, 20) + '...' 
                                    : document.CustomerName}
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
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                document.Type?.includes('FATURA') 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {document.Type}
                              </span>
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
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      <span className="text-xs font-medium text-green-700">Evet</span>
                                    </div>
                                    {document.REF_NO && (
                                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                        {document.REF_NO}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-medium text-red-600">Hayır</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => onDocumentClick(document)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Detay
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}