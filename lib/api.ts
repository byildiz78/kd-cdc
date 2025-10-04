import { InvoiceHeader, InvoiceDetail } from '@/types/invoice';
import { getApiEndpoint } from '@/lib/utils/api';

export interface FetchInvoicesParams {
  startDate?: string;
  endDate?: string;
  key?: string;
}

// Mevcut fonksiyon backward compatibility için kalacak
export async function fetchInvoices(params: FetchInvoicesParams = {}): Promise<any[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(getApiEndpoint('/api/invoices'), {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // First try to get text (might be HTML error page)
      const text = await response.text();
      try {
        // Try to parse as JSON
        const error = JSON.parse(text);
        throw new Error(error.error || 'Failed to fetch invoices');
      } catch {
        // If not JSON, log the HTML and throw generic error
        console.error('API returned HTML error:', text.substring(0, 500));
        throw new Error('Failed to fetch invoices - API error');
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

// YENİ: Header-only fetch
export async function fetchInvoiceHeaders(params: {
  startDate: string;
  endDate: string;
}): Promise<InvoiceHeader[]> {
  try {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate
    });
    
    const response = await fetch(getApiEndpoint(`/api/invoices/headers?${queryParams}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const error = JSON.parse(text);
        throw new Error(error.error || 'Failed to fetch invoice headers');
      } catch {
        console.error('API returned error:', text.substring(0, 500));
        throw new Error('Failed to fetch invoice headers - API error');
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching invoice headers:', error);
    throw error;
  }
}

// YENİ: Specific invoice detail fetch
export async function fetchInvoiceDetail(orderKey: string): Promise<InvoiceDetail> {
  try {
    const response = await fetch(getApiEndpoint(`/api/invoices/${orderKey}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const error = JSON.parse(text);
        throw new Error(error.error || 'Failed to fetch invoice detail');
      } catch {
        console.error('API returned error:', text.substring(0, 500));
        throw new Error('Failed to fetch invoice detail - API error');
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching invoice detail:', error);
    throw error;
  }
}