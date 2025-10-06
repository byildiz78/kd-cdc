'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import QueryForm from '@/components/QueryForm';
import { Code2, RefreshCw } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

export default function EditQueryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [query, setQuery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(getApiEndpoint('/api/auth/verify'));
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);

          if (data.user.role !== 'SUPERADMIN') {
            router.push('/dashboard');
            return;
          }
        } else {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authLoading && user?.role === 'SUPERADMIN') {
      loadQuery();
    }
  }, [authLoading, user, params.id]);

  const loadQuery = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiEndpoint(`/api/queries/${params.id}`));

      if (!response.ok) {
        throw new Error('Failed to fetch query');
      }

      const data = await response.json();
      setQuery(data);
    } catch (err) {
      console.error('Error loading query:', err);
      alert('Sorgu yüklenirken bir hata oluştu');
      router.push('/settings/queries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch(getApiEndpoint(`/api/queries/${params.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update query');
      }

      router.push('/settings/queries');
    } catch (err) {
      console.error('Error updating query:', err);
      alert(err instanceof Error ? err.message : 'Sorgu güncellenirken bir hata oluştu');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiEndpoint('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!query) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar username={user?.username} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-lg">
          <div className="px-8 py-6">
            <div className="flex items-center space-x-3">
              <Code2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sorgu Düzenle</h1>
                <p className="text-gray-600">{query.name}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-xl p-8">
            <QueryForm
              initialData={query}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/settings/queries')}
              isEdit
            />
          </div>
        </div>
      </div>
    </div>
  );
}
