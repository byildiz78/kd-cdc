'use client';

import { X, FileText, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect } from 'react';

interface DocumentModalProps {
  documentData: any;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
}

export default function DocumentModal({ documentData, isOpen, onClose, loading = false }: DocumentModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !documentData) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
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
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateSubtotal = () => {
    return documentData.Items?.reduce((sum: number, item: any) => sum + (item.Amount || 0), 0) || 0;
  };

  const calculateTotalTax = () => {
    return documentData.Items?.reduce((sum: number, item: any) => {
      const taxAmount = (item.Amount || 0) * (item.TaxPercent || 0) / 100;
      return sum + taxAmount;
    }, 0) || 0;
  };

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const grandTotal = subtotal + totalTax;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-4xl max-h-[95vh] w-full overflow-hidden">
        {/* Header with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors bg-white shadow-md"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>


        {/* Document Content */}
        <div className="overflow-y-auto max-h-[95vh] bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Fatura detayı yükleniyor...</p>
              </div>
            </div>
          ) : !documentData ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-gray-600 text-lg">Fatura detayı bulunamadı</p>
              </div>
            </div>
          ) : (
          <div className="p-8 max-w-none">
            {/* Document Header */}
            <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
              <div className="flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {documentData.Type?.includes('FATURA') ? 'Taslak E-FATURA' : 'Taslak E-Belge'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {documentData.Type?.includes('FATURA') ? 'Taslak Elektronik Fatura' : 'Taslak Elektronik Arşiv Belgesi'}
                  </p>
                  <div className="mt-2 flex items-center justify-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      documentData.Type?.includes('FATURA') 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {documentData.Type}
                    </span>
                    
                    {/* Transfer Status Badge */}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      documentData.IsTransferred === 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {documentData.IsTransferred === 1 ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          ERP'ye Aktarıldı
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          ERP'ye Aktarılmadı
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg inline-block">
                <p className="text-sm">Belge Tarihi: <span className="font-semibold">{formatDateTime(documentData.InvoiceDate)}</span></p>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Seller Info */}
              <div className="border border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3 bg-gray-100 p-2 rounded">SATICI BİLGİLERİ</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Şube Adı:</strong> {documentData.BranchName}</p>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="border border-gray-300 p-4 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3 bg-gray-100 p-2 rounded">ALICI BİLGİLERİ</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Ünvan:</strong> {documentData.CustomerName}</p>
                  <p><strong>Vergi Dairesi:</strong> {documentData.CustomerTaxOffice}</p>
                  <p><strong>Vergi/TC No:</strong> {documentData.CustomerTaxNo}</p>
                  <p><strong>Adres:</strong> {documentData.CustomerAddress}</p>
                  <p><strong>E-posta:</strong> {documentData.CustomerEMail}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 bg-gray-100 p-3 rounded-lg">FATURA KALEMLERİ</h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-300">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">S.No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Mal/Hizmet</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Miktar</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Birim Fiyat</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-300">KDV %</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentData.Items?.filter((item: any) => item.IsMainCombo).map((item: any, index: number) => {
                      // Bu combo'ya ait alt ürünleri bul
                      const subItems = documentData.Items?.filter((subItem: any) => 
                        subItem.MainTransactionKey === item.TransactionKey
                      ) || [];
                      
                      return (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm border-r border-gray-200 font-semibold">{index + 1}</td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            <div>
                              <p className="font-medium">{item.ItemsDefinition}</p>
                              <p className="text-xs text-gray-500">Kod: {item.ItemCode}</p>
                              
                              {/* Bu combo'ya ait alt ürünleri göster */}
                              {subItems.length > 0 && (
                                <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                  <div className="bg-gray-100 text-gray-700 px-3 py-2 border-b border-gray-200">
                                    <p className="text-xs font-medium">🍽️ Combo Menü İçeriği</p>
                                  </div>
                                  <div className="p-3">
                                    <div className="grid gap-2">
                                      {subItems.map((subItem: any, subIndex: number) => (
                                        <div key={subIndex} className="bg-white rounded-md p-2 border border-gray-200">
                                          <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                              <p className="text-xs font-medium text-gray-800">
                                                {subItem.ItemsDefinition}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                Kod: {subItem.ItemCode || 'N/A'}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <span className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                {subItem.Quantity}x
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Item Notes */}
                              {item.ItemNote && (
                                <div className="mt-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 overflow-hidden">
                                  <div className="bg-yellow-500 text-white px-3 py-2">
                                    <p className="text-xs font-bold uppercase tracking-wide">📝 ÖZEL NOT</p>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-xs text-yellow-800 bg-white rounded p-2 border border-yellow-200">
                                      {item.ItemNote}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center border-r border-gray-200 font-mono">{item.Quantity}</td>
                          <td className="px-4 py-3 text-sm text-right border-r border-gray-200 font-mono">{formatCurrency(item.UnitPrice)}</td>
                          <td className="px-4 py-3 text-sm text-center border-r border-gray-200 font-mono">%{item.TaxPercent}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-semibold">{formatCurrency(item.Amount)}</td>
                        </tr>
                      );
                    })}
                    
                    {/* IsMainCombo olmayan ürünleri de göster (eğer MainTransactionKey yoksa) */}
                    {documentData.Items?.filter((item: any) => !item.IsMainCombo && !item.MainTransactionKey).map((item: any, index: number) => {
                      const mainComboCount = documentData.Items?.filter((i: any) => i.IsMainCombo).length || 0;
                      
                      return (
                        <tr key={`standalone-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm border-r border-gray-200 font-semibold">{mainComboCount + index + 1}</td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">
                            <div>
                              <p className="font-medium">{item.ItemsDefinition}</p>
                              <p className="text-xs text-gray-500">Kod: {item.ItemCode}</p>
                              
                              {/* Item Notes */}
                              {item.ItemNote && (
                                <div className="mt-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 overflow-hidden">
                                  <div className="bg-yellow-500 text-white px-3 py-2">
                                    <p className="text-xs font-bold uppercase tracking-wide">📝 ÖZEL NOT</p>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-xs text-yellow-800 bg-white rounded p-2 border border-yellow-200">
                                      {item.ItemNote}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center border-r border-gray-200 font-mono">{item.Quantity}</td>
                          <td className="px-4 py-3 text-sm text-right border-r border-gray-200 font-mono">{formatCurrency(item.UnitPrice)}</td>
                          <td className="px-4 py-3 text-sm text-center border-r border-gray-200 font-mono">%{item.TaxPercent}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-semibold">{formatCurrency(item.Amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-80 border border-gray-300 rounded-lg">
                <div className="bg-gray-50 p-3 border-b border-gray-300">
                  <h4 className="font-bold text-gray-900">FATURA TOPLAMI</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Mal/Hizmet Toplamı:</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Toplam İndirim:</span>
                    <span className="font-mono text-red-600">-{formatCurrency(documentData.OrderDiscount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Hesaplanan KDV:</span>
                    <span className="font-mono">{formatCurrency(totalTax)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>GENEL TOPLAM:</span>
                      <span className="font-mono">{formatCurrency(documentData.InvoiceTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {documentData.Payments && documentData.Payments.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4 bg-gray-100 p-3 rounded-lg">ÖDEME BİLGİLERİ</h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-300">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Ödeme Türü</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase border-r border-gray-300">Alt Tür</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentData.Payments.map((payment: any, index: number) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-sm border-r border-gray-200">{payment.PaymentName}</td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200">{payment.SubPaymentName}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-semibold">{formatCurrency(payment.Amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transfer Status Section */}
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 bg-gray-100 p-3 rounded-lg">AKTARIM DURUMU</h3>
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {documentData.IsTransferred === 1 ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-700">Aktarıldı</p>
                          <p className="text-xs text-gray-500">Bu belge ERP sistemine aktarılmıştır</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-6 w-6 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-red-600">Aktarılmadı</p>
                          <p className="text-xs text-gray-500">Bu belge henüz ERP sistemine aktarılmamıştır</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {documentData.IsTransferred === 1 && documentData.REF_NO && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Referans No:</p>
                      <span className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded border">
                        {documentData.REF_NO}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-6 mt-8">
              <div className="grid grid-cols-2 gap-8 text-xs text-gray-600">
                <div>
                  <p><strong>Düzenleme Tarihi:</strong> {formatDateTime(documentData.InvoiceDate)}</p>
                  <p><strong>Taslak Belge Türü:</strong> {documentData.Type}</p>
                  <p><strong></strong> {documentData.UserCode}</p>
                </div>
                <div className="text-right">
                  <p><strong>robotPOS OrderKey:</strong> {documentData.OrderKey?.substring(0, 36) || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}