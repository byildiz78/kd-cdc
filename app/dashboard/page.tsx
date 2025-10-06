'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RefreshCw, TrendingUp, CircleCheck as CheckCircle, Circle as XCircle, Clock, ArrowUpRight, ArrowDownRight, Database, Activity, Globe, Zap, Server } from 'lucide-react';
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
  erpApi: {
    totalCalls: number;
    todayCalls: number;
    weekCalls: number;
    monthCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    avgResponseTime: number;
    totalRecordsServed: number;
  };
}

interface RecentActivity {
  date: string;
  action: string;
  count: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiEndpoint('/api/dashboard/stats'));
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats(result.data);
            setRecentActivity(result.data.recentActivity || []);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      loadDashboardStats();
    }
  }, [authLoading, user]);

  const handleLogout = async () => {
    try {
      await fetch(getApiEndpoint('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  if (authLoading || loading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Yükleniyor...</p>
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
                  <p className="text-sm text-gray-500 mt-2">
                    Benzersiz OrderKey sayısı
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
                  <p className="text-sm font-medium text-gray-600">Başarılı Sync</p>
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
                  <p className="text-sm font-medium text-gray-600">Başarısız Sync</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {stats.failedRecords.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Toplam başarısız sync
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
                  <p className="text-sm font-medium text-gray-600">Devam Eden</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {stats.pendingRecords.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Şu anda çalışan sync
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
              <p className="text-sm text-gray-500 mt-2">Değişiklik kaydı</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ort. sync süresi</span>
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
              <p className="text-sm text-gray-500 mt-2">Değişiklik kaydı</p>
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
              <p className="text-sm text-gray-500 mt-2">Değişiklik kaydı</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Günlük ortalama</span>
                  <span className="font-medium text-gray-900">{Math.round(stats.monthTransfers / 30)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ERP API Stats Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Globe className="h-6 w-6 mr-2 text-purple-600" />
              ERP API Kullanım İstatistikleri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Toplam API Çağrısı</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">
                      {stats.erpApi.totalCalls.toLocaleString('tr-TR')}
                    </p>
                    <p className="text-sm text-purple-600 mt-2">
                      Bugün: {stats.erpApi.todayCalls}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-lg">
                    <Globe className="h-8 w-8 text-purple-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Başarılı Çağrılar</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">
                      {stats.erpApi.successfulCalls.toLocaleString('tr-TR')}
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                      {stats.erpApi.successRate}% başarı oranı
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Ort. Yanıt Süresi</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {stats.erpApi.avgResponseTime}
                      <span className="text-lg">ms</span>
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      Ortalama response time
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-lg">
                    <Zap className="h-8 w-8 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Sunulan Kayıt</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">
                      {stats.erpApi.totalRecordsServed.toLocaleString('tr-TR')}
                    </p>
                    <p className="text-sm text-orange-600 mt-2">
                      Toplam data transfer
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-lg">
                    <Server className="h-8 w-8 text-orange-700" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bugün</h3>
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-4xl font-bold text-purple-600">{stats.erpApi.todayCalls}</p>
                <p className="text-sm text-gray-500 mt-2">API çağrısı</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bu Hafta</h3>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-4xl font-bold text-purple-600">{stats.erpApi.weekCalls}</p>
                <p className="text-sm text-gray-500 mt-2">API çağrısı</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Günlük ortalama</span>
                    <span className="font-medium text-gray-900">{Math.round(stats.erpApi.weekCalls / 7)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bu Ay</h3>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-4xl font-bold text-purple-600">{stats.erpApi.monthCalls}</p>
                <p className="text-sm text-gray-500 mt-2">API çağrısı</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Günlük ortalama</span>
                    <span className="font-medium text-gray-900">{Math.round(stats.erpApi.monthCalls / 30)}</span>
                  </div>
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
                    <span className="text-gray-600">Toplam Sync Sayısı</span>
                    <span className="font-medium text-gray-900">
                      {(stats.transferredRecords + stats.failedRecords).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.successRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Başarısız Sync Oranı</span>
                    <span className="font-medium text-gray-900">
                      {(100 - stats.successRate).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${100 - stats.successRate}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Son Sync</p>
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
                      <p className="text-sm text-gray-600 mb-1">Ort. Sync Süresi</p>
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
