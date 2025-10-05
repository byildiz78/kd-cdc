'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, TrendingUp, CircleCheck as CheckCircle, Circle as XCircle, Clock, ArrowUpRight, ArrowDownRight, Database, Activity } from 'lucide-react';
import { getApiEndpoint } from '@/lib/utils/api';

interface DashboardStats {
  totalRecords: number;
  transferredRecords: number;
  failedRecords: number;
  pendingRecords: number;
  todayTransfers: number;
  weekTransfers: number;
  monthTransfers: number;
  successRate: number;
  avgTransferTime: number;
  lastTransferDate: string;
}

const mockStats: DashboardStats = {
  totalRecords: 45230,
  transferredRecords: 42150,
  failedRecords: 1580,
  pendingRecords: 1500,
  todayTransfers: 326,
  weekTransfers: 2140,
  monthTransfers: 8950,
  successRate: 96.4,
  avgTransferTime: 2.3,
  lastTransferDate: new Date().toISOString(),
};

const recentActivity = [
  { date: '2025-10-05 14:30', action: 'Satış verileri aktarıldı', count: 125, status: 'success' },
  { date: '2025-10-05 12:15', action: 'Satış verileri aktarıldı', count: 89, status: 'success' },
  { date: '2025-10-05 10:45', action: 'Aktarım başarısız', count: 15, status: 'failed' },
  { date: '2025-10-05 09:20', action: 'Satış verileri aktarıldı', count: 97, status: 'success' },
  { date: '2025-10-04 16:50', action: 'Satış verileri aktarıldı', count: 203, status: 'success' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(mockStats);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar username={user?.username} onLogout={handleLogout} />

      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Hoş geldiniz, {user?.username}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Son güncelleme</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Kayıt</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.totalRecords.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 flex items-center">
                    <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+12.5%</span>
                    <span className="ml-1">bu ay</span>
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktarılan Kayıt</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.transferredRecords.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">{stats.successRate}%</span> başarı oranı
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Başarısız Kayıt</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {stats.failedRecords.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 flex items-center">
                    <ArrowDownRight className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">-3.2%</span>
                    <span className="ml-1">bu hafta</span>
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bekleyen Kayıt</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {stats.pendingRecords.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Aktarım bekliyor
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bugün</h3>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-4xl font-bold text-blue-600">{stats.todayTransfers}</p>
              <p className="text-sm text-gray-500 mt-2">Aktarım yapıldı</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ort. süre</span>
                  <span className="font-medium text-gray-900">{stats.avgTransferTime}s</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bu Hafta</h3>
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-4xl font-bold text-green-600">{stats.weekTransfers}</p>
              <p className="text-sm text-gray-500 mt-2">Aktarım yapıldı</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Günlük ortalama</span>
                  <span className="font-medium text-gray-900">{Math.round(stats.weekTransfers / 7)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Bu Ay</h3>
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-4xl font-bold text-orange-600">{stats.monthTransfers}</p>
              <p className="text-sm text-gray-500 mt-2">Aktarım yapıldı</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Günlük ortalama</span>
                  <span className="font-medium text-gray-900">{Math.round(stats.monthTransfers / 30)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        activity.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {activity.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{activity.count} kayıt</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistem Durumu</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Başarı Oranı</span>
                    <span className="font-medium text-gray-900">{stats.successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.successRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Aktarılan / Toplam</span>
                    <span className="font-medium text-gray-900">
                      {((stats.transferredRecords / stats.totalRecords) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(stats.transferredRecords / stats.totalRecords) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Başarısız Kayıt Oranı</span>
                    <span className="font-medium text-gray-900">
                      {((stats.failedRecords / stats.totalRecords) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(stats.failedRecords / stats.totalRecords) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Son Aktarım</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(stats.lastTransferDate).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Ort. İşlem Süresi</p>
                      <p className="text-sm font-medium text-gray-900">{stats.avgTransferTime} saniye</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
