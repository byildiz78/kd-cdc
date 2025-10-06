'use client';

import { useState } from 'react';
import { Code2, Save, X } from 'lucide-react';

interface QueryFormProps {
  initialData?: {
    name: string;
    code: string;
    sqlContent: string;
    description: string;
    category: string;
    isActive: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export default function QueryForm({ initialData, onSubmit, onCancel, isEdit = false }: QueryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    sqlContent: initialData?.sqlContent || '',
    description: initialData?.description || '',
    category: initialData?.category || 'CUSTOM',
    isActive: initialData?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sorgu Adı *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Örn: Invoice Headers"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sorgu Kodu * {isEdit && <span className="text-gray-500">(değiştirilemez)</span>}
          </label>
          <input
            type="text"
            required
            disabled={isEdit}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Örn: invoice-headers"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="INVOICE">Fatura</option>
            <option value="SALES">Satış</option>
            <option value="CUSTOM">Özel</option>
          </select>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Açıklama
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Sorgu hakkında açıklama..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SQL Sorgusu *
        </label>
        <textarea
          required
          value={formData.sqlContent}
          onChange={(e) => setFormData({ ...formData, sqlContent: e.target.value })}
          rows={15}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="SELECT ..."
        />
        <p className="mt-2 text-sm text-gray-500">
          Parametreler: @StartDate, @EndDate, @OrderKey vb. kullanabilirsiniz
        </p>
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
