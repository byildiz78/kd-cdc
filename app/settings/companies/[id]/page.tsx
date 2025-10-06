'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import CompanyForm from '@/components/CompanyForm';
import { Building2, RefreshCw } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

export default function EditCompanyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, [params.id]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiEndpoint(`/api/companies/${params.id}`));

      if (!response.ok) {
        throw new Error('Failed to fetch company');
      }

      const data = await response.json();
      setCompany(data);
    } catch (err) {
      console.error('Error loading company:', err);
      alert('Firma yüklenirken bir hata oluştu');
      router.push('/settings/companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch(getApiEndpoint(`/api/companies/${params.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update company');
      }

      router.push('/settings/companies');
    } catch (err) {
      console.error('Error updating company:', err);
      alert(err instanceof Error ? err.message : 'Firma güncellenirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Firma Düzenle</h1>
            <p className="text-gray-600">{company.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl bg-white rounded-xl shadow-xl p-8">
        <CompanyForm
          initialData={company}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/settings/companies')}
          isEdit
        />
      </div>
    </div>
  );
}
