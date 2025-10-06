'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Package, FileText } from 'lucide-react';

interface DeltaDetail {
  id: string;
  sheetDate: string;
  branch: {
    id: string;
    code: string;
    isExternal: boolean;
  };
  accounting: {
    mainCode: string | null;
    code: string;
    isMainCombo: boolean;
  };
  taxPercent: number;
  changeType: string;
  oldValues: {
    quantity: number;
    subTotal: number;
    taxTotal: number;
    total: number;
  } | null;
  newValues: {
    quantity: number;
    subTotal: number;
    taxTotal: number;
    total: number;
  };
  deltaMagnitude: {
    quantity: number;
    subTotal: number;
    taxTotal: number;
    total: number;
  };
  snapshot: any;
  affectedOrders: AffectedOrder[];
  metadata: {
    deltaType: string;
    changedAt: string;
    syncBatchId: string;
    processed: boolean;
    processedAt: string | null;
  };
}

interface AffectedOrder {
  orderKey: string;
  orderDateTime: string;
  changeType: string;
  contribution: {
    quantity: number;
    subTotal: number;
    taxTotal: number;
    total: number;
  };
  version: {
    old: number | null;
    new: number;
  };
  hash: {
    old: string | null;
    new: string;
  };
}

export default function DeltaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [delta, setDelta] = useState<DeltaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeltaDetail();
  }, [params.id]);

  const fetchDeltaDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sales/delta/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setDelta(data.data);
      } else {
        console.error('Failed to fetch delta:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch delta detail:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  if (!delta) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-600">Delta kaydı bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Geri Dön</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Delta Detayı</h1>
      </div>

      {/* Summary Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Özet Bilgiler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-gray-600">Tarih</label>
            <div className="text-lg font-medium text-gray-900">{delta.sheetDate}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Şube Kodu</label>
            <div className="text-lg font-medium text-gray-900">{delta.branch.code}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Muhasebe Kodu</label>
            <div className="text-lg font-medium text-gray-900">{delta.accounting.code}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Değişiklik Tipi</label>
            <div>
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                delta.changeType === 'INSERT'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {delta.changeType}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Delta Tipi</label>
            <div>
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                delta.metadata.deltaType === 'PRE_SNAPSHOT'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {delta.metadata.deltaType}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Değişiklik Zamanı</label>
            <div className="text-lg font-medium text-gray-900">
              {formatDateUTC(delta.metadata.changedAt)}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">İşlendi mi?</label>
            <div>
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                delta.metadata.processed
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {delta.metadata.processed ? 'Evet' : 'Hayır'}
              </span>
            </div>
          </div>
          {delta.metadata.processedAt && (
            <div>
              <label className="text-sm text-gray-600">İşlenme Zamanı</label>
              <div className="text-lg font-medium text-gray-900">
                {formatDateUTC(delta.metadata.processedAt)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Value Changes */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Değer Değişiklikleri</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Eski Değer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Yeni Değer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fark</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Miktar</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {delta.oldValues ? delta.oldValues.quantity.toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {delta.newValues.quantity.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {delta.deltaMagnitude.quantity > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : delta.deltaMagnitude.quantity < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                    <span className={delta.deltaMagnitude.quantity > 0 ? 'text-green-600 font-semibold' : delta.deltaMagnitude.quantity < 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                      {delta.deltaMagnitude.quantity > 0 ? '+' : ''}{delta.deltaMagnitude.quantity.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Alt Toplam</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {delta.oldValues ? delta.oldValues.subTotal.toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {delta.newValues.subTotal.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {delta.deltaMagnitude.subTotal > 0 ? '+' : ''}{delta.deltaMagnitude.subTotal.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">KDV Toplamı</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {delta.oldValues ? delta.oldValues.taxTotal.toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {delta.newValues.taxTotal.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                  {delta.deltaMagnitude.taxTotal > 0 ? '+' : ''}{delta.deltaMagnitude.taxTotal.toFixed(2)}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Toplam</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  {delta.oldValues ? delta.oldValues.total.toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  {delta.newValues.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {delta.deltaMagnitude.total > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : delta.deltaMagnitude.total < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                    <span className={delta.deltaMagnitude.total > 0 ? 'text-green-600 font-bold' : delta.deltaMagnitude.total < 0 ? 'text-red-600 font-bold' : 'text-gray-600 font-semibold'}>
                      {delta.deltaMagnitude.total > 0 ? '+' : ''}{delta.deltaMagnitude.total.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Affected Orders */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Etkilenen Siparişler ({delta.affectedOrders.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Değişiklik</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Miktar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Versiyon</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {delta.affectedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Etkilenen sipariş bulunamadı
                  </td>
                </tr>
              ) : (
                delta.affectedOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      <span className="truncate max-w-[150px]" title={order.orderKey}>
                        {order.orderKey.substring(0, 24)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateUTC(order.orderDateTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        order.changeType === 'CREATED'
                          ? 'bg-green-100 text-green-800'
                          : order.changeType === 'UPDATED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.changeType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {order.contribution.quantity.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {order.contribution.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {order.version.old ? (
                        <span className="text-gray-600">
                          v{order.version.old} → v{order.version.new}
                        </span>
                      ) : (
                        <span className="text-blue-600">v{order.version.new}</span>
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
