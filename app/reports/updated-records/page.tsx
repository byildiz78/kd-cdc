'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Download, Filter, Calendar, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

export default function UpdatedRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    startDate: sevenDaysAgo,
    endDate: today,
    companyId: '',
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUpdated: 0,
    totalOrders: 0,
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.companyId && { companyId: filters.companyId }),
      });

      const response = await fetch(`/api/reports/updated-records?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data.records);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderKey = (orderKey: string) => {
    navigator.clipboard.writeText(orderKey);
    setCopiedKey(orderKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDateUTC = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const handleExport = () => {
    const headers = ['Order Key', 'Siparis Tarihi', 'Guncelleme Tarihi', 'Tip', 'Onceki Versiyon', 'Yeni Versiyon', 'Degisen Alanlar', 'Onceki Hash', 'Yeni Hash'];
    const rows = records.map(r => [
      r.orderKey,
      r.orderDateTime ? formatDateUTC(r.orderDateTime) : '-',
      new Date(r.updatedAt).toLocaleString('tr-TR'),
      r.changeType,
      r.oldVersion,
      r.newVersion,
      r.changedFields || '-',
      r.oldHash.substring(0, 16) + '...',
      r.newHash.substring(0, 16) + '...',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `updated-records-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Guncellenen Kayitlar</h1>
            </div>
            <p className="text-gray-600">
              Hash degisikligi tespit edilen order kayitlari
            </p>
          </div>
          {records.length > 0 && (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Baslangic Tarihi
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
              Bitis Tarihi
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
              Firma
            </label>
            <select
              value={filters.companyId}
              onChange={(e) => setFilters({ ...filters, companyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tumu</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Toplam Guncellenen Order</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.totalUpdated}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Benzersiz Order Sayisi</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalOrders}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guncelleme Tarihi</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Versiyon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Degisen Alanlar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hash Degisimi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Yukleniyor...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Guncellenen kayit bulunamadi
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => (
                  <>
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRow(expandedRow === idx ? null : idx);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {record.orderSnapshot && (
                            expandedRow === idx ?
                              <ChevronDown className="h-4 w-4 text-gray-400" /> :
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <span className="truncate max-w-[200px]" title={record.orderKey}>
                          {record.orderKey.substring(0, 24)}...
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyOrderKey(record.orderKey);
                          }}
                          className="p-1 hover:bg-blue-100 rounded transition-colors"
                          title="Kopyala"
                        >
                          {copiedKey === record.orderKey ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.orderDateTime ? (
                        (() => {
                          const date = new Date(record.orderDateTime);
                          const year = date.getUTCFullYear();
                          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                          const day = String(date.getUTCDate()).padStart(2, '0');
                          const hours = String(date.getUTCHours()).padStart(2, '0');
                          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                          return `${day}.${month}.${year} ${hours}:${minutes}`;
                        })()
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(record.updatedAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        record.changeType === 'UPDATED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : record.changeType === 'REIMPORTED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.changeType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        v{record.oldVersion} → v{record.newVersion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {record.changedFields ? (
                        <div className="flex flex-wrap gap-1">
                          {record.changedFields.split(', ').map((field: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                              {field}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      <div className="flex flex-col space-y-1">
                        <span className="text-xs text-gray-400">Eski: {record.oldHash.substring(0, 12)}...</span>
                        <span className="text-xs text-gray-700">Yeni: {record.newHash.substring(0, 12)}...</span>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === idx && record.orderSnapshot && (
                    <tr key={`${idx}-detail`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">Adisyon Degisim Detayi</h4>
                            {record.changedFields && (
                              <div className="text-xs text-gray-600">
                                Degisen Alanlar: <span className="font-semibold text-orange-600">{record.changedFields}</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Old Version */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                                Eski Versiyon (v{record.orderSnapshot.versions.old.version})
                              </h5>
                              <div className="text-xs text-gray-500 mb-2">
                                Transaction Sayisi: {record.orderSnapshot.versions.old.transactionCount}
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {record.orderSnapshot.versions.old.transactions.map((tx: any, i: number) => (
                                  <div key={i} className="border-l-2 border-red-300 pl-2 text-xs space-y-1">
                                    <div className="font-mono text-gray-700 font-semibold">{tx.menuItemText}</div>
                                    <div className="grid grid-cols-2 gap-x-2 text-gray-600">
                                      <span>Miktar: {tx.quantity}</span>
                                      <span>ExtPrice: {tx.extendedPrice?.toFixed(2)}</span>
                                      <span>AmountDue: {tx.amountDue?.toFixed(2)}</span>
                                      <span>AccCode: {tx.accountingCode}</span>
                                      <span>SubTotal: {tx.lineSubTotal?.toFixed(2)}</span>
                                      <span>Tax: {tx.lineTaxTotal?.toFixed(2)}</span>
                                      <span>Total: {tx.lineTotal?.toFixed(2)}</span>
                                      <span>Deleted: {tx.headerDeleted ? 'Yes' : 'No'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* New Version */}
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                                Yeni Versiyon (v{record.orderSnapshot.versions.new.version})
                              </h5>
                              <div className="text-xs text-gray-500 mb-2">
                                Transaction Sayisi: {record.orderSnapshot.versions.new.transactionCount}
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {record.orderSnapshot.versions.new.transactions.map((tx: any, i: number) => (
                                  <div key={i} className="border-l-2 border-green-300 pl-2 text-xs space-y-1">
                                    <div className="font-mono text-gray-700 font-semibold">{tx.menuItemText}</div>
                                    <div className="grid grid-cols-2 gap-x-2 text-gray-600">
                                      <span>Miktar: {tx.quantity}</span>
                                      <span>ExtPrice: {tx.extendedPrice?.toFixed(2)}</span>
                                      <span>AmountDue: {tx.amountDue?.toFixed(2)}</span>
                                      <span>AccCode: {tx.accountingCode}</span>
                                      <span>SubTotal: {tx.lineSubTotal?.toFixed(2)}</span>
                                      <span>Tax: {tx.lineTaxTotal?.toFixed(2)}</span>
                                      <span>Total: {tx.lineTotal?.toFixed(2)}</span>
                                      <span>Deleted: {tx.headerDeleted ? 'Yes' : 'No'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
