// Utility function to get the correct API endpoint with basePath
export function getApiEndpoint(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || '';
  return `${basePath}${path}`;
}