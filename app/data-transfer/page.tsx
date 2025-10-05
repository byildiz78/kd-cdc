'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, Database } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

export default function DataTransferPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(getApiEndpoint('/api/auth/verify'));
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
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

  const handleLogout = async () => {
    try {
      await fetch(getApiEndpoint('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <Sidebar username={user?.username} onLogout={handleLogout} />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Veri Aktarım Yönetimi</h1>
            </div>
            <p className="text-gray-600">Veri aktarım işlemlerinizi buradan yönetebilirsiniz</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-100">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">İçerik Yakında Eklenecek</h3>
              <p className="text-gray-600">
                Veri aktarım yönetimi özellikleri şu anda geliştirme aşamasındadır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
