/**
 * Execute SQL query on RobotPos API
 */
export async function executeRobotPosQuery(
  apiUrl: string,
  apiToken: string,
  sqlQuery: string
): Promise<any> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sqlQuery }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `RobotPos API request failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const responseText = await response.text();
  return JSON.parse(responseText);
}

/**
 * Parse invoice data from RobotPos response
 */
export function parseInvoiceResponse(data: any): any[] {
  if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
    return [];
  }

  const resultData = data.data[0];

  if (!resultData.Result) {
    return [];
  }

  let invoices = JSON.parse(resultData.Result);

  // Parse nested JSON strings for Items and Payments if they exist
  invoices = invoices.map((invoice: any) => ({
    ...invoice,
    Items:
      typeof invoice.Items === 'string'
        ? JSON.parse(invoice.Items)
        : invoice.Items || [],
    Payments:
      typeof invoice.Payments === 'string'
        ? JSON.parse(invoice.Payments)
        : invoice.Payments || [],
    RefNo: invoice.RefNo || '',
  }));

  return invoices;
}

/**
 * Parse sales data from RobotPos response
 */
export function parseSalesResponse(data: any): any[] {
  return data?.data || [];
}
