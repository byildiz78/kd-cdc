'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Plus, Edit, Trash2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

interface Query {
  id: string;
  name: string;
  code: string;
  sqlContent: string;
  description: string | null;
  category: 'INVOICE' | 'SALES' | 'CUSTOM';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function QueriesPage() {
  const router = useRouter();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(getApiEndpoint('/api/queries'));

      if (!response.ok) {
        throw new Error('Failed to fetch queries');
      }

      const data = await response.json();
      setQueries(data);
    } catch (err) {
      setError('Sorgular yüklenirken bir hata oluştu');
      console.error('Error loading queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu sorguyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(getApiEndpoint(`/api/queries/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete query');
      }

      await loadQueries();
    } catch (err) {
      console.error('Error deleting query:', err);
      alert('Sorgu silinirken bir hata oluştu');
    }
  };

  const handleToggleActive = async (query: Query) => {
    try {
      const response = await fetch(getApiEndpoint(`/api/queries/${query.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !query.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update query');
      }

      await loadQueries();
    } catch (err) {
      console.error('Error updating query:', err);
      alert('Sorgu güncellenirken bir hata oluştu');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'INVOICE': return 'bg-blue-100 text-blue-800';
      case 'SALES': return 'bg-green-100 text-green-800';
      case 'CUSTOM': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'INVOICE': return 'Fatura';
      case 'SALES': return 'Satış';
      case 'CUSTOM': return 'Özel';
      default: return category;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Code2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sorgu Yönetimi</h1>
              <p className="text-gray-600">SQL sorgularını yönetin</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings/queries/new')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Sorgu</span>
          </button>
        </div>
      </div>

      <div>
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Sorgular yükleniyor...</p>
            </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
            <div className="text-red-500 text-6xl mb-4">⚠</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Hata Oluştu</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Sorgu Adı</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Kod</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Kategori</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Açıklama</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Durum</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queries.map((query) => (
                    <tr key={query.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{query.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{query.code}</code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(query.category)}`}>
                          {getCategoryLabel(query.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {query.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(query)}
                          className="inline-flex items-center"
                        >
                          {query.isActive ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => router.push(`/settings/queries/${query.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(query.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            {queries.length === 0 && (
              <div className="text-center py-20">
                <Code2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Henüz sorgu bulunmamaktadır</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
