import { syncSalesData } from './sync.service';
import { prisma } from '@/lib/prisma';

/**
 * Şu anki saate göre sync yapılacak firmaları filtrele
 */
function shouldRunDailySync(company: any, currentHour: number, currentMinute: number): boolean {
  if (!company.dailySyncEnabled) return false;

  // Tam saat eşleşmesi kontrolü
  return company.dailySyncHour === currentHour && company.dailySyncMinute === currentMinute;
}

function shouldRunWeeklySync(company: any, currentDay: number, currentHour: number, currentMinute: number): boolean {
  if (!company.weeklySyncEnabled) return false;

  return (
    company.weeklySyncDay === currentDay &&
    company.weeklySyncHour === currentHour &&
    company.weeklySyncMinute === currentMinute
  );
}

/**
 * Tüm aktif firmalar için dünkü veriyi senkronize et
 * Her firma kendi belirlediği saatte çalışır
 */
export async function runDailySyncForAllCompanies() {
  console.log('[Scheduler] Starting daily sync check...');

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      dailySyncEnabled: true
    },
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateString = yesterday.toISOString().split('T')[0];

  const results = [];

  for (const company of companies) {
    // Bu saatte bu firma sync yapacak mı kontrol et
    if (!shouldRunDailySync(company, currentHour, currentMinute)) {
      console.log(`[Scheduler] Skipping ${company.code} - scheduled for ${company.dailySyncHour}:${String(company.dailySyncMinute).padStart(2, '0')}`);
      continue;
    }

    try {
      console.log(`[Scheduler] Syncing ${company.code} for ${dateString}...`);

      const result = await syncSalesData({
        companyId: company.id,
        startDate: dateString,
        endDate: dateString,
      });

      results.push({
        company: company.code,
        success: true,
        ...result,
      });

      console.log(
        `[Scheduler] ${company.code} sync completed: ${result.newRecords} new, ${result.updatedRecords} updated`
      );
    } catch (error) {
      console.error(`[Scheduler] ${company.code} sync failed:`, error);

      results.push({
        company: company.code,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log('[Scheduler] Daily sync completed for all companies');
  return results;
}

/**
 * Son 7 günü senkronize et (re-import detection için)
 * Her firma kendi belirlediği gün ve saatte çalışır
 */
export async function runWeeklySyncForAllCompanies() {
  console.log('[Scheduler] Starting weekly sync check...');

  const now = new Date();
  const currentDay = now.getDay(); // 0-6 (0=Sunday)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      weeklySyncEnabled: true
    },
  });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  const results = [];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const company of companies) {
    // Bu gün ve saatte bu firma sync yapacak mı kontrol et
    if (!shouldRunWeeklySync(company, currentDay, currentHour, currentMinute)) {
      console.log(
        `[Scheduler] Skipping ${company.code} - scheduled for ${dayNames[company.weeklySyncDay]} ${company.weeklySyncHour}:${String(company.weeklySyncMinute).padStart(2, '0')}`
      );
      continue;
    }

    try {
      console.log(
        `[Scheduler] Weekly sync for ${company.code} (${startDateString} - ${endDateString})...`
      );

      const result = await syncSalesData({
        companyId: company.id,
        startDate: startDateString,
        endDate: endDateString,
      });

      results.push({
        company: company.code,
        success: true,
        ...result,
      });

      console.log(`[Scheduler] ${company.code} weekly sync completed`);
    } catch (error) {
      console.error(`[Scheduler] ${company.code} weekly sync failed:`, error);

      results.push({
        company: company.code,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log('[Scheduler] Weekly sync completed for all companies');
  return results;
}
