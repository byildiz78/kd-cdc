'use client';

import { useState, useEffect } from 'react';
import { Calendar, Filter, Activity, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface ERPApiLog {
  id: string;
  company: {
    name: string;
    code: string;
  };
  endpoint: string;
  method: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters: any;
  statusCode: number;
  responseTime: number;
  recordCount: number;
  errorMessage: string | null;
  requestedAt: string;
}

export default function ERPApiLogsPage() {
  const [logs, setLogs] = useState<ERPApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    companyId: '',
    endpoint: '',
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const result = await response.json();
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.endpoint) params.append('endpoint', filters.endpoint);

      const response = await fetch(`/api/reports/erp-api-logs?${params}`);
      if (response.ok) {
        const result = await response.json();
        setLogs(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ERP API Logları</h1>
            <p className="text-gray-600">ERP endpoint kullanım kayıtları</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtreler</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
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
              Bitiş Tarihi
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
              <option value="">Tümü</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endpoint
            </label>
            <select
              value={filters.endpoint}
              onChange={(e) => setFilters({ ...filters, endpoint: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tümü</option>
              <option value="/api/erp/sales-summary">Sales Summary</option>
              <option value="/api/erp/deltas">Deltas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Zaman
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Firma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tarih Aralığı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Filtreler
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Kayıt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Süre
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Log kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.requestedAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.company.name}</div>
                      <div className="text-xs text-gray-500">{log.company.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.endpoint.replace('/api/erp/', '')}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.dateRange.startDate} - {log.dateRange.endDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.filters ? (
                        <div className="max-w-xs truncate" title={JSON.stringify(log.filters)}>
                          {Object.entries(log.filters)
                            .map(([key, val]) => `${key}=${val}`)
                            .join(', ')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getStatusIcon(log.statusCode)}
                        <span className={`text-sm font-medium ${getStatusColor(log.statusCode)}`}>
                          {log.statusCode}
                        </span>
                      </div>
                      {log.errorMessage && (
                        <div className="text-xs text-red-600 mt-1" title={log.errorMessage}>
                          {log.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {log.recordCount.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      <div className="flex items-center justify-end space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatResponseTime(log.responseTime)}</span>
                      </div>
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
