import { prisma } from '@/lib/prisma';

/**
 * Get active query by code
 */
export async function getQueryByCode(code: string) {
  const query = await prisma.query.findUnique({
    where: { code, isActive: true },
  });

  if (!query) {
    throw new Error(`Query not found: ${code}`);
  }

  return query;
}

/**
 * Replace query parameters
 */
export function replaceQueryParams(
  sqlContent: string,
  params: Record<string, string>
): string {
  let sql = sqlContent;

  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`@${key}`, 'g');
    sql = sql.replace(regex, `'${value}'`);
  }

  return sql;
}
