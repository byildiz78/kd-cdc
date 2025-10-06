import { NextRequest, NextResponse } from 'next/server';
import { runDailySyncForAllCompanies } from '@/lib/services/scheduler.service';

/**
 * GET /api/cron/daily-sync
 * Günlük otomatik sync (her dakika çal1_1r, zaman1 gelen firmalar1 sync eder)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Daily sync cron triggered');

    const results = await runDailySyncForAllCompanies();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        companiesProcessed: results.length,
        successCount,
        failCount,
        results,
      },
    });
  } catch (error) {
    console.error('[CRON] Daily sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
