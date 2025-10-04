'use client';

import { Calendar, Building2, Receipt, User, CreditCard } from 'lucide-react';

interface DocumentCardProps {
  document: any;
  onClick: () => void;
}

export default function DocumentCard({ document, onClick }: DocumentCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  return (
    <div 
      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-100"
      onClick={onClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <Receipt className="h-6 w-6 text-blue-600" />
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {document.Type}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Sipariş #</div>
            <div className="font-bold text-gray-900">{document.OrderID}</div>
          </div>
        </div>
        
        {/* Item and Payment Counts */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {document.ItemCount || 0} kalem
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {document.PaymentCount || 0} ödeme
          </span>
        </div>

        {/* Customer Info */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-900 truncate">
              {document.CustomerName}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Vergi No: {document.CustomerTaxNo}
          </div>
        </div>

        {/* Branch and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 truncate">
              {document.BranchName}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {formatDate(document.InvoiceDate)}
            </span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">Toplam Tutar</span>
          </div>
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(document.InvoiceTotal)}
          </div>
        </div>

        {/* Items Count */}
        <div className="mt-2 text-sm text-gray-500">
          {document.Items?.length || 0} ürün
        </div>
      </div>
    </div>
  );
}