'use client';

import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DeveloperNotesPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'genel-mimari': true,
  });

  useEffect(() => {
    fetch('/docs/help.md')
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load help documentation:', error);
        setLoading(false);
      });
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Notes</h1>
            <p className="text-gray-600">Sistem mimarisi ve geliştirici dokümantasyonu</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          📚 Bu Dokümantasyon Neler İçeriyor?
        </h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sistem mimarisi ve veri akışı</li>
          <li>• RobotPOS API entegrasyonu detayları</li>
          <li>• Senkronizasyon süreci adım adım</li>
          <li>• Hash-based change detection algoritması</li>
          <li>• Delta (değişiklik) yönetimi</li>
          <li>• ERP API kullanımı ve authentication</li>
          <li>• Veritabanı yapısı ve ilişkiler</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="prose prose-slate max-w-none p-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b-2 border-gray-200" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-semibold text-gray-800 mt-6 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-semibold text-gray-700 mt-4 mb-2" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-lg font-semibold text-gray-700 mt-3 mb-2" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="text-gray-600 leading-relaxed mb-4" {...props} />
              ),
              code: ({ node, inline, ...props }: any) =>
                inline ? (
                  <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                ) : (
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                ),
              pre: ({ node, ...props }) => (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4 ml-4" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4 ml-4" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-gray-600" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4" {...props} />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-gray-50" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="bg-white divide-y divide-gray-200" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr className="hover:bg-gray-50" {...props} />
              ),
              th: ({ node, ...props }) => (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="px-4 py-2 text-sm text-gray-600" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>💡 İpucu:</strong> Bu dokümantasyonu güncel tutmak için{' '}
          <code className="bg-yellow-100 px-1 rounded">/docs/help.md</code> dosyasını düzenleyebilirsiniz.
        </p>
      </div>
    </div>
  );
}
