'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">E Invoice API Documentation</h1>
          <p className="text-gray-600 mt-2">E-Invoice management system API documentation</p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SwaggerUI
          url={`${process.env.NEXT_PUBLIC_BASEPATH || ''}/api/docs/swagger.json`}
          docExpansion="list"
          defaultModelsExpandDepth={2}
          defaultModelExpandDepth={2}
          tryItOutEnabled={true}
          requestInterceptor={(request) => {
            // Add the API token from localStorage if available
            const token = localStorage.getItem('robotpos_api_token');
            if (token) {
              request.headers.Authorization = `Bearer ${token}`;
            }
            return request;
          }}
          onComplete={(swaggerApi) => {
            // Auto-populate the API token if available
            const token = localStorage.getItem('robotpos_api_token');
            if (token && swaggerApi) {
              swaggerApi.preauthorizeApiKey('bearerAuth', token);
            }
          }}
        />
      </div>
    </div>
  );
}