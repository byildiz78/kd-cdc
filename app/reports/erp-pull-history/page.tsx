'use client';

import { useState, useEffect } from 'react';
import { History, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ERPSnapshot {
  id: string;
  companyName: string;
  companyCode: string;
  snapshotDate: string;
  dataStartDate: string;
  dataEndDate: string;
  recordCount: number;
  deltaCount: number;
  erpStatus: string;
  erpPulledAt: string | null;
  erpConfirmedAt: string | null;
  erpRecordCount: number | null;
  erpDeltaCount: number | null;
  erpErrorMessage: string | null;
}

export default function ERPPullHistoryPage() {
  const [snapshots, setSnapshots] = useState<ERPSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    companyId: '',
  });

  useEffect(() => {
    fetchSnapshots();
  }, [filters]);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.companyId && { companyId: filters.companyId }),
      });

      const response = await fetch(`/api/reports/erp-snapshots?${params}`);
      const data = await response.json();

      if (data.success) {
        setSnapshots(data.data.records);
      }
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateUTC = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'TIMEOUT':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      TIMEOUT: 'bg-orange-100 text-orange-800',
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <History className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">ERP Çekim Geçmişi</h1>
        </div>
        <p className="text-gray-600">
          ERP sisteminin veri çekme geçmişi ve snapshot durumları
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durum
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tümü</option>
              <option value="PENDING">Beklemede</option>
              <option value="CONFIRMED">Onaylandı</option>
              <option value="FAILED">Başarısız</option>
              <option value="TIMEOUT">Zaman Aşımı</option>
            </select>
          </div>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Snapshot Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veri Aralığı</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kayıt / Delta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ERP Çekme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ERP Onay</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Snapshot kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                snapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{snapshot.companyName}</div>
                        <div className="text-gray-500">{snapshot.companyCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateUTC(snapshot.snapshotDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {snapshot.dataStartDate} - {snapshot.dataEndDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(snapshot.erpStatus)}
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(snapshot.erpStatus)}`}>
                          {snapshot.erpStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="text-gray-900">{snapshot.recordCount} kayıt</div>
                      {snapshot.deltaCount > 0 && (
                        <div className="text-purple-600">{snapshot.deltaCount} delta</div>
                      )}
                      {snapshot.erpRecordCount !== null && (
                        <div className="text-gray-500 text-xs mt-1">
                          ERP: {snapshot.erpRecordCount}/{snapshot.erpDeltaCount || 0}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateUTC(snapshot.erpPulledAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateUTC(snapshot.erpConfirmedAt)}
                      {snapshot.erpErrorMessage && (
                        <div className="text-red-600 text-xs mt-1" title={snapshot.erpErrorMessage}>
                          Hata: {snapshot.erpErrorMessage.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
