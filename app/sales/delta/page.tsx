'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import Link from 'next/link';

export default function SalesDeltaPage() {
  const [deltaData, setDeltaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSnapshots, setExpandedSnapshots] = useState<Set<string>>(new Set());
  const [loadingSnapshots, setLoadingSnapshots] = useState<Set<string>>(new Set());
  const [includeProcessed, setIncludeProcessed] = useState(false);

  useEffect(() => {
    fetchSummaryData();
  }, [includeProcessed]);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        summaryOnly: 'true',
        includeProcessed: includeProcessed.toString(),
      });

      const response = await fetch(`/api/sales/delta?${params}`);
      const data = await response.json();

      if (data.success) {
        setDeltaData(data.data.snapshots);
      }
    } catch (error) {
      console.error('Failed to fetch delta data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshotDetails = async (snapshotId: string) => {
    setLoadingSnapshots(prev => new Set(prev).add(snapshotId));
    try {
      const params = new URLSearchParams({
        snapshotId,
        includeProcessed: includeProcessed.toString(),
      });

      const response = await fetch(`/api/sales/delta?${params}`);
      const data = await response.json();

      if (data.success && data.data.snapshots.length > 0) {
        const snapshotData = data.data.snapshots[0];
        setDeltaData(prev => prev.map(item =>
          item.snapshot.id === snapshotId ? snapshotData : item
        ));
      }
    } catch (error) {
      console.error('Failed to fetch snapshot details:', error);
    } finally {
      setLoadingSnapshots(prev => {
        const next = new Set(prev);
        next.delete(snapshotId);
        return next;
      });
    }
  };

  const toggleSnapshot = (snapshotId: string) => {
    const newExpanded = new Set(expandedSnapshots);
    if (newExpanded.has(snapshotId)) {
      newExpanded.delete(snapshotId);
    } else {
      newExpanded.add(snapshotId);
      // Lazy load details if not already loaded
      const snapshot = deltaData.find(s => s.snapshot.id === snapshotId);
      if (snapshot && snapshot.deltas.length === 0) {
        fetchSnapshotDetails(snapshotId);
      }
    }
    setExpandedSnapshots(newExpanded);
  };

  const getChangeTypeColor = (changeType: string) => {
    return changeType === 'INSERT' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <AlertCircle className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Delta Kayitlari</h1>
        </div>
        <p className="text-gray-600">
          ERP snapshot sonrasi olusan degisiklikler (POST_SNAPSHOT)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeProcessed}
            onChange={(e) => setIncludeProcessed(e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Islenmis kayitlari da goster</span>
        </label>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            Yukleniyor...
          </div>
        ) : deltaData.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            Delta kaydi bulunamadi
          </div>
        ) : (
          deltaData.map((snapshotGroup) => {
            const snapshot = snapshotGroup.snapshot;
            const deltas = snapshotGroup.deltas;
            const isExpanded = expandedSnapshots.has(snapshot?.id || 'none');

            return (
              <div key={snapshot?.id || 'none'} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div
                  className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSnapshot(snapshot?.id || 'none')}
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {snapshot ? new Date(snapshot.snapshotDate).toLocaleString('tr-TR') : 'Snapshot Yok'}
                      </div>
                      {snapshot && (
                        <div className="text-sm text-gray-600">
                          {snapshot.dataStartDate} - {snapshot.dataEndDate}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{snapshot?.deltaCount || deltas.length}</span> delta kaydi
                    </div>
                  </div>
                </div>

                {isExpanded && loadingSnapshots.has(snapshot?.id || 'none') && (
                  <div className="p-8 text-center text-gray-500">
                    Yükleniyor...
                  </div>
                )}

                {isExpanded && !loadingSnapshots.has(snapshot?.id || 'none') && (
                  <div className="divide-y divide-gray-200">
                    {deltas.map((delta: any) => (
                      <div key={delta.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getChangeTypeColor(delta.changeType)}`}>
                                {delta.changeType}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                Satış Tarihi: {delta.sheetDate}
                              </span>
                              <span className="text-sm text-gray-600">
                                Şube: {delta.branch.code}
                              </span>
                              {delta.metadata.processed && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  İşlendi
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-700">
                                Ürün: {delta.productName}
                              </span>
                              <span className="text-sm font-mono text-gray-500">
                                ({delta.accounting.code})
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-500">Miktar</div>
                                <div className="font-medium text-gray-900">
                                  {delta.oldValues && (
                                    <span className="line-through text-gray-400 mr-2">
                                      {delta.oldValues.quantity.toFixed(2)}
                                    </span>
                                  )}
                                  {delta.newValues.quantity.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Ara Toplam</div>
                                <div className="font-medium text-gray-900">
                                  {delta.oldValues && (
                                    <span className="line-through text-gray-400 mr-2">
                                      {delta.oldValues.subTotal.toFixed(2)}
                                    </span>
                                  )}
                                  {delta.newValues.subTotal.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">KDV</div>
                                <div className="font-medium text-gray-900">
                                  {delta.oldValues && (
                                    <span className="line-through text-gray-400 mr-2">
                                      {delta.oldValues.taxTotal.toFixed(2)}
                                    </span>
                                  )}
                                  {delta.newValues.taxTotal.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500">Toplam</div>
                                <div className="font-medium text-blue-600">
                                  {delta.oldValues && (
                                    <span className="line-through text-gray-400 mr-2">
                                      {delta.oldValues.total.toFixed(2)}
                                    </span>
                                  )}
                                  {delta.newValues.total.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div className="text-xs text-gray-500">
                              {delta.affectedOrderCount} siparis etkilendi
                            </div>
                          </div>

                          <Link
                            href={`/sales/delta/${delta.id}`}
                            className="ml-4 flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Detay</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
