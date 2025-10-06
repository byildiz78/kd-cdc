'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Edit, Trash2, RefreshCw, CheckCircle2, XCircle, Users } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

interface Company {
  id: string;
  name: string;
  code: string;
  apiUrl: string;
  apiToken: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
  };
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(getApiEndpoint('/api/companies'));

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const result = await response.json();
      setCompanies(result.data || []);
    } catch (err) {
      setError('Firmalar yüklenirken bir hata oluştu');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" firmasını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(getApiEndpoint(`/api/companies/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company');
      }

      await loadCompanies();
    } catch (err) {
      console.error('Error deleting company:', err);
      alert('Firma silinirken bir hata oluştu');
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      const response = await fetch(getApiEndpoint(`/api/companies/${company.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !company.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update company');
      }

      await loadCompanies();
    } catch (err) {
      console.error('Error updating company:', err);
      alert('Firma güncellenirken bir hata oluştu');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Firma Yönetimi</h1>
              <p className="text-gray-600">Firmaları yönetin</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings/companies/new')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Firma</span>
          </button>
        </div>
      </div>

      <div>
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Firmalar yükleniyor...</p>
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Firma Adı</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Kod</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">API URL</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Kullanıcılar</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Durum</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{company.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{company.code}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={company.apiUrl}>
                          {company.apiUrl}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{company._count.users}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(company)}
                          className="inline-flex items-center"
                        >
                          {company.isActive ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => router.push(`/settings/companies/${company.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(company.id, company.name)}
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

            {companies.length === 0 && (
              <div className="text-center py-20">
                <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Henüz firma bulunmamaktadır</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
