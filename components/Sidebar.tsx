'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard, Database, ChevronLeft, ChevronRight, User, LogOut, BookOpen, Settings, Code2, Building2, Table, BarChart3, AlertCircle, RefreshCw, TrendingUp, FileLineChart, Trash2, Activity } from 'lucide-react';

interface SidebarProps {
  username?: string;
  onLogout?: () => void;
}

export default function Sidebar({ username, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: pathname === '/dashboard'
    },
    {
      name: 'E-Belge Yönetimi',
      icon: FileText,
      href: '/invoices',
      active: pathname === '/invoices'
    },
    {
      name: 'Satış Verileri',
      icon: Database,
      href: '/sales',
      active: pathname.startsWith('/sales'),
      subItems: [
        {
          name: 'Ham Veri',
          icon: Table,
          href: '/sales/raw',
          active: pathname === '/sales/raw'
        },
        {
          name: 'Özet Veri',
          icon: BarChart3,
          href: '/sales/summary',
          active: pathname === '/sales/summary'
        },
        {
          name: 'Delta Kayıtları',
          icon: AlertCircle,
          href: '/sales/delta',
          active: pathname === '/sales/delta'
        },
        {
          name: 'Senkronizasyon',
          icon: RefreshCw,
          href: '/sales/sync',
          active: pathname === '/sales/sync'
        }
      ]
    },
    {
      name: 'Raporlar',
      icon: FileLineChart,
      href: '/reports',
      active: pathname.startsWith('/reports'),
      subItems: [
        {
          name: 'Senkronizasyon Loglari',
          icon: RefreshCw,
          href: '/reports/sync-logs',
          active: pathname === '/reports/sync-logs'
        },
        {
          name: 'Guncellenen Kayitlar',
          icon: TrendingUp,
          href: '/reports/updated-records',
          active: pathname === '/reports/updated-records'
        },
        {
          name: 'Delta Degisiklikleri',
          icon: AlertCircle,
          href: '/reports/delta-changes',
          active: pathname === '/reports/delta-changes'
        },
        {
          name: 'ERP API Loglari',
          icon: Activity,
          href: '/reports/erp-api-logs',
          active: pathname === '/reports/erp-api-logs'
        }
      ]
    }
  ];

  return (
    <div
      className={`bg-white border-r border-gray-200 shadow-lg transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">robotPOS</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  item.active
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={collapsed ? item.name : ''}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
              {!collapsed && item.subItems && (
                <div className="ml-4 mt-2 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                          subItem.active
                            ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <SubIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{subItem.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/settings"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              pathname.startsWith('/settings')
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={collapsed ? 'Ayarlar' : ''}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">Ayarlar</span>
            )}
          </Link>
          {!collapsed && pathname.startsWith('/settings') && (
            <div className="ml-4 mt-2 space-y-1">
              <Link
                href="/settings/companies"
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                  pathname.startsWith('/settings/companies')
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Firma Tanımları</span>
              </Link>
              <Link
                href="/settings/queries"
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                  pathname.startsWith('/settings/queries')
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Code2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Sorgular</span>
              </Link>
              <Link
                href="/settings/db-operations"
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                  pathname.startsWith('/settings/db-operations')
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Trash2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">DB İşlemleri</span>
              </Link>
              <Link
                href="/settings/developer-notes"
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                  pathname.startsWith('/settings/developer-notes')
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">Developer Notes</span>
              </Link>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <Link
            href="/api/docs"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              pathname === '/api/docs'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title={collapsed ? 'API Dokümantasyon' : ''}
          >
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">API Dokümantasyon</span>
            )}
          </Link>
        </div>

        {username && (
          <div className="p-4 border-t border-gray-200">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
              {!collapsed && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{username}</span>
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100"
                title="Çıkış Yap"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
