'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Database, CheckCircle } from 'lucide-react';

export default function DBOperationsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleDelete = async (operation: string) => {
    const confirmations: Record<string, string> = {
      'all': 'TUM senkronizasyon verilerini (ham veri, ozet veri, delta, log) silmek istediginizden emin misiniz? BU ISLEM GERI ALINAMAZ!',
      'raw': 'Tum HAM satis verilerini silmek istediginizden emin misiniz?',
      'summary': 'Tum OZET satis verilerini silmek istediginizden emin misiniz?',
      'delta': 'Tum DELTA kayitlarini silmek istediginizden emin misiniz?',
      'logs': 'Tum senkronizasyon LOGLARINI silmek istediginizden emin misiniz?',
    };

    if (!confirm(confirmations[operation])) {
      return;
    }

    // Double confirmation for 'all'
    if (operation === 'all' && !confirm('SON UYARI: Tum veriler silinecek. Devam etmek istediginizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/settings/db-operations/${operation}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Islem sirasinda hata olustu',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Database className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">Veritabani Islemleri</h1>
        </div>
        <p className="text-gray-600">
          Senkronizasyon verilerini temizleme ve bakım islemleri
        </p>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-lg border ${
          result.success
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="font-semibold">{result.message}</span>
          </div>
          {result.details && (
            <div className="mt-2 text-sm">
              <pre className="bg-white p-2 rounded">{JSON.stringify(result.details, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delete All */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
          <div className="flex items-center space-x-3 mb-4">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Tum Verileri Sil</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Ham veri, ozet veri, delta kayitlari, change log ve sync batch kayitlarini siler.
            <span className="block mt-2 font-semibold text-red-600">UYARI: Bu islem geri alinamaz!</span>
          </p>
          <button
            onClick={() => handleDelete('all')}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Siliniyor...' : 'Tum Verileri Sil'}
          </button>
        </div>

        {/* Delete Raw Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Trash2 className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Ham Verileri Sil</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Sadece SalesRaw tablosundaki ham satis verilerini siler. Change log ve sync batch kayitlari korunur.
          </p>
          <button
            onClick={() => handleDelete('raw')}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Siliniyor...' : 'Ham Verileri Sil'}
          </button>
        </div>

        {/* Delete Summary Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Trash2 className="h-6 w-6 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">Ozet Verileri Sil</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Sadece SalesSummary tablosundaki ozet satis verilerini siler.
          </p>
          <button
            onClick={() => handleDelete('summary')}
            disabled={loading}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Siliniyor...' : 'Ozet Verileri Sil'}
          </button>
        </div>

        {/* Delete Delta Data */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Trash2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Delta Kayitlarini Sil</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            SalesSummaryDelta ve DeltaAffectedOrders tablolarindaki delta kayitlarini siler.
          </p>
          <button
            onClick={() => handleDelete('delta')}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Siliniyor...' : 'Delta Kayitlarini Sil'}
          </button>
        </div>

        {/* Delete Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Trash2 className="h-6 w-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Log Kayitlarini Sil</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            SalesChangeLog ve SyncBatch tablolarindaki log kayitlarini siler. Veri korunur.
          </p>
          <button
            onClick={() => handleDelete('logs')}
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Siliniyor...' : 'Log Kayitlarini Sil'}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Onemli Notlar:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Silme islemleri geri alinamaz</li>
              <li>Veritabani bagimlilik iliskileri otomatik olarak yonetilir</li>
              <li>Buyuk veri setlerinde islem uzun surebilir</li>
              <li>Islem sirasinda sistem yavaslamasinin normal oldugunu unutmayin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
