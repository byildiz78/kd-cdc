'use client';

import { useState, useEffect } from 'react';
import { Calendar, X, ChevronDown, CheckCircle2, XCircle, Filter } from 'lucide-react';

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onTransferStatusChange?: (status: 'all' | 'transferred' | 'not-transferred') => void;
}

export default function DateRangeFilter({ onDateRangeChange, onTransferStatusChange }: DateRangeFilterProps) {
  // Bugünün tarihini al
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTransferDropdownOpen, setIsTransferDropdownOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Bugün');
  const [transferStatus, setTransferStatus] = useState<'all' | 'transferred' | 'not-transferred'>('all');

  // Otomatik yükleme devre dışı - kullanıcı manuel olarak tetikleyecek

  const getDateRange = (preset: string) => {
    const today = new Date().toISOString().split('T')[0]; // Bugün string olarak
    
    switch (preset) {
      case 'Dün': {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return {
          start: yesterdayStr,
          end: yesterdayStr
        };
      }
      case 'Bu Hafta': {
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Pazartesi başlangıç
        startOfWeek.setDate(diff);
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: today
        };
      }
      case 'Geçen Hafta': {
        const now = new Date();
        const startOfLastWeek = new Date(now);
        const day = startOfLastWeek.getDay();
        const diff = startOfLastWeek.getDate() - day + (day === 0 ? -6 : 1) - 7;
        startOfLastWeek.setDate(diff);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
        return {
          start: startOfLastWeek.toISOString().split('T')[0],
          end: endOfLastWeek.toISOString().split('T')[0]
        };
      }
      case 'Bu Ay': {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: today
        };
      }
      case 'Geçen Ay': {
        const now = new Date();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: startOfLastMonth.toISOString().split('T')[0],
          end: endOfLastMonth.toISOString().split('T')[0]
        };
      }
      default: // Bugün
        return {
          start: today,
          end: today
        };
    }
  };

  const handlePresetSelect = (preset: string) => {
    const { start, end } = getDateRange(preset);
    setStartDate(start);
    setEndDate(end);
    setSelectedPreset(preset);
    setIsDropdownOpen(false);
    // Preset seçimi sadece tarihleri set eder, veri yükleme yapmaz
  };
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setSelectedPreset('Özel');
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setSelectedPreset('Özel');
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onDateRangeChange(startDate, endDate);
    }
  };


  const handleTransferStatusChange = (status: 'all' | 'transferred' | 'not-transferred') => {
    setTransferStatus(status);
    setIsTransferDropdownOpen(false);
    onTransferStatusChange?.(status);
  };

  const getTransferStatusLabel = (status: 'all' | 'transferred' | 'not-transferred') => {
    switch (status) {
      case 'all': return 'Tümü';
      case 'transferred': return 'Aktarılan';
      case 'not-transferred': return 'Aktarılmayan';
    }
  };

  const getTransferStatusIcon = (status: 'all' | 'transferred' | 'not-transferred') => {
    switch (status) {
      case 'all': return Filter;
      case 'transferred': return CheckCircle2;
      case 'not-transferred': return XCircle;
    }
  };

  const presets = ['Bugün', 'Dün', 'Bu Hafta', 'Geçen Hafta', 'Bu Ay', 'Geçen Ay'];
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Tarih Aralığı</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        {/* Hızlı Seçim Dropdown */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hızlı Seçim
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-blue-300 flex items-center justify-between"
            >
              <span className="text-gray-900">{selectedPreset}</span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                      selectedPreset === preset ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Başlangıç Tarihi
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-blue-300"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bitiş Tarihi
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            min={startDate}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-blue-300"
          />
        </div>
        
        {/* Aktarım Durumu Filtresi */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aktarım Durumu
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTransferDropdownOpen(!isTransferDropdownOpen)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200 hover:border-blue-300 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                {(() => {
                  const IconComponent = getTransferStatusIcon(transferStatus);
                  return <IconComponent className="h-4 w-4 text-gray-500" />;
                })()}
                <span className="text-gray-900">{getTransferStatusLabel(transferStatus)}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isTransferDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isTransferDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                <button
                  onClick={() => handleTransferStatusChange('all')}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors duration-200 first:rounded-t-lg flex items-center space-x-2 ${
                    transferStatus === 'all' ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-900'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Tümü</span>
                </button>
                <button
                  onClick={() => handleTransferStatusChange('transferred')}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-green-50 transition-colors duration-200 flex items-center space-x-2 ${
                    transferStatus === 'transferred' ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-900'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Aktarılan</span>
                </button>
                <button
                  onClick={() => handleTransferStatusChange('not-transferred')}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-red-50 transition-colors duration-200 last:rounded-b-lg flex items-center space-x-2 ${
                    transferStatus === 'not-transferred' ? 'bg-red-100 text-red-800 font-medium' : 'text-gray-900'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  <span>Aktarılmayan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {startDate === endDate ? (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {new Date(startDate).toLocaleDateString('tr-TR')}
            </span>
          ) : (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleApply}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}