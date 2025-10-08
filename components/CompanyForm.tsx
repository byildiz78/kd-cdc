'use client';

import { useState } from 'react';
import { Building2, Save, X } from 'lucide-react';

interface CompanyFormProps {
  initialData?: {
    name: string;
    code: string;
    apiUrl: string;
    apiToken: string;
    erpApiToken?: string;
    isActive: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function CompanyForm({ initialData, onSubmit, onCancel, isEdit = false }: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    apiUrl: initialData?.apiUrl || '',
    apiToken: initialData?.apiToken === '***' ? '' : (initialData?.apiToken || ''),
    erpApiToken: initialData?.erpApiToken || '',
    isActive: initialData?.isActive ?? true,
    syncType: initialData?.syncType || 'DAILY',
    syncEnabled: initialData?.syncEnabled ?? true,
    syncIntervalMinutes: initialData?.syncIntervalMinutes ?? 30,
    dailySyncHour: initialData?.dailySyncHour ?? 2,
    dailySyncMinute: initialData?.dailySyncMinute ?? 0,
    weeklySyncDay: initialData?.weeklySyncDay ?? 0,
    weeklySyncHour: initialData?.weeklySyncHour ?? 3,
    weeklySyncMinute: initialData?.weeklySyncMinute ?? 0,
  });
  const [showGenerateToken, setShowGenerateToken] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // If apiToken is empty in edit mode, don't send it (keep existing)
      const submitData = { ...formData };
      if (isEdit && !submitData.apiToken) {
        submitData.apiToken = '***'; // Signal to keep existing
      }
      await onSubmit(submitData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Firma Adı *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Örn: Kahve Dünyası"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Firma Kodu * {isEdit && <span className="text-gray-500">(değiştirilemez)</span>}
          </label>
          <input
            type="text"
            required
            disabled={isEdit}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed uppercase"
            placeholder="Örn: KD"
            maxLength={10}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          API URL *
        </label>
        <input
          type="url"
          required
          value={formData.apiUrl}
          onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.robotpos.com/realtimeapi/api/1/query"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          RobotPOS API Token * {isEdit && <span className="text-gray-500">(boş bırakın değişmemesi için)</span>}
        </label>
        <input
          type="text"
          required={!isEdit}
          value={formData.apiToken}
          onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          placeholder={isEdit ? '••••••••••••' : 'API Token'}
        />
        <p className="mt-2 text-sm text-gray-500">
          {isEdit
            ? 'Mevcut token\'ı korumak için bu alanı boş bırakın'
            : 'RobotPos API erişim token\'ı (veri çekmek için)'
          }
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ERP API Token
          <span className="ml-2 text-gray-500 font-normal">(ERP sisteminin veri çekmesi için)</span>
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={formData.erpApiToken}
            onChange={(e) => setFormData({ ...formData, erpApiToken: e.target.value })}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Token oluşturmak için Oluştur butonuna tıklayın"
            readOnly
          />
          <button
            type="button"
            onClick={() => {
              const newToken = crypto.randomUUID();
              setFormData({ ...formData, erpApiToken: newToken });
              setShowGenerateToken(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            {formData.erpApiToken ? 'Yenile' : 'Oluştur'}
          </button>
          {formData.erpApiToken && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(formData.erpApiToken);
                alert('Token kopyalandı!');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Kopyala
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          ERP sistemi bu token ile /api/erp/* endpoint'lerine erişebilir
        </p>
        {formData.erpApiToken && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Önemli:</strong> Bu token'ı güvenli bir yerde saklayın. Kaybederseniz yeni bir token oluşturmanız gerekecektir.
            </p>
          </div>
        )}
      </div>

      {/* Sync Schedule Settings */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Senkronizasyon Ayarları</h3>

        {/* Sync Enabled */}
        <div className="mb-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.syncEnabled}
              onChange={(e) => setFormData({ ...formData, syncEnabled: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Otomatik Senkronizasyon Aktif</span>
          </label>
        </div>

        {formData.syncEnabled && (
          <>
            {/* Sync Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Senkronizasyon Tipi</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="syncType"
                    value="INTERVAL"
                    checked={formData.syncType === 'INTERVAL'}
                    onChange={(e) => setFormData({ ...formData, syncType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Belirli Dakika Aralığında</span>
                    <p className="text-sm text-gray-500">Her X dakikada bir otomatik senkronizasyon</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="syncType"
                    value="DAILY"
                    checked={formData.syncType === 'DAILY'}
                    onChange={(e) => setFormData({ ...formData, syncType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Günlük</span>
                    <p className="text-sm text-gray-500">Her gün belirli bir saatte</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="syncType"
                    value="WEEKLY"
                    checked={formData.syncType === 'WEEKLY'}
                    onChange={(e) => setFormData({ ...formData, syncType: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Haftalık</span>
                    <p className="text-sm text-gray-500">Haftanın belirli bir günü ve saatinde</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Interval Sync Settings */}
            {formData.syncType === 'INTERVAL' && (
              <div className="ml-7 mb-6">
                <label className="block text-sm text-gray-600 mb-2">Dakika Aralığı</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.syncIntervalMinutes}
                  onChange={(e) => setFormData({ ...formData, syncIntervalMinutes: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">1-1440 dakika arası (max 24 saat)</p>
              </div>
            )}

            {/* Daily Sync Settings */}
            {formData.syncType === 'DAILY' && (
              <div className="ml-7 mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Saat</label>
                  <select
                    value={formData.dailySyncHour}
                    onChange={(e) => setFormData({ ...formData, dailySyncHour: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Dakika</label>
                  <select
                    value={formData.dailySyncMinute}
                    onChange={(e) => setFormData({ ...formData, dailySyncMinute: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[0, 15, 30, 45].map(m => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Weekly Sync Settings */}
            {formData.syncType === 'WEEKLY' && (
              <div className="ml-7 mb-6 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Gün</label>
                  <select
                    value={formData.weeklySyncDay}
                    onChange={(e) => setFormData({ ...formData, weeklySyncDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                  <option value={0}>Pazar</option>
                  <option value={1}>Pazartesi</option>
                  <option value={2}>Salı</option>
                  <option value={3}>Çarşamba</option>
                  <option value={4}>Perşembe</option>
                  <option value={5}>Cuma</option>
                  <option value={6}>Cumartesi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Saat</label>
                <select
                  value={formData.weeklySyncHour}
                  onChange={(e) => setFormData({ ...formData, weeklySyncHour: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dakika</label>
                <select
                  value={formData.weeklySyncMinute}
                  onChange={(e) => setFormData({ ...formData, weeklySyncMinute: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Aktif</span>
        </label>
      </div>

      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X className="h-4 w-4" />
          <span>İptal</span>
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
        </button>
      </div>
    </form>
  );
}
