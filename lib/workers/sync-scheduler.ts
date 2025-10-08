import { prisma } from '@/lib/prisma';
import { syncSalesData } from '@/lib/services/sync.service';

/**
 * Database-driven scheduler
 * Runs every minute to check if any company needs sync
 */
export class SyncScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.timer) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting database-driven sync scheduler');

    // Run immediately
    this.checkAndSync();

    // Then run every minute
    this.timer = setInterval(() => {
      this.checkAndSync();
    }, 60000); // 60 seconds

    this.isRunning = true;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isRunning = false;
      console.log('[Scheduler] Stopped');
    }
  }

  private async checkAndSync() {
    if (this.isRunning && this.timer) {
      console.log('[Scheduler] Check skipped - previous check still running');
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0=Sunday, 6=Saturday

      console.log(`[Scheduler] Checking at ${now.toISOString()}`);

      // Get all active companies with sync enabled
      const companies = await prisma.company.findMany({
        where: {
          isActive: true,
          syncEnabled: true,
        },
      });

      console.log(`[Scheduler] Found ${companies.length} active companies`);

      for (const company of companies) {
        let shouldSync = false;
        let syncReason = '';

        switch (company.syncType) {
          case 'INTERVAL':
            // Check interval-based sync
            if (company.lastSyncAt && company.syncIntervalMinutes) {
              const minutesSinceLastSync = Math.floor(
                (now.getTime() - company.lastSyncAt.getTime()) / 60000
              );

              if (minutesSinceLastSync >= company.syncIntervalMinutes) {
                shouldSync = true;
                syncReason = `Interval: ${minutesSinceLastSync}min >= ${company.syncIntervalMinutes}min`;
              }
            } else if (!company.lastSyncAt) {
              // First sync
              shouldSync = true;
              syncReason = 'First sync (no lastSyncAt)';
            }
            break;

          case 'DAILY':
            // Check daily sync
            if (
              currentHour === company.dailySyncHour &&
              currentMinute === company.dailySyncMinute
            ) {
              // Check if already synced today
              if (company.lastSyncAt) {
                const lastSyncDate = new Date(company.lastSyncAt);
                const isSameDay =
                  lastSyncDate.getDate() === now.getDate() &&
                  lastSyncDate.getMonth() === now.getMonth() &&
                  lastSyncDate.getFullYear() === now.getFullYear();

                if (!isSameDay) {
                  shouldSync = true;
                  syncReason = `Daily: ${currentHour}:${currentMinute}`;
                }
              } else {
                shouldSync = true;
                syncReason = `Daily: First sync at ${currentHour}:${currentMinute}`;
              }
            }
            break;

          case 'WEEKLY':
            // Check weekly sync
            if (
              currentDay === company.weeklySyncDay &&
              currentHour === company.weeklySyncHour &&
              currentMinute === company.weeklySyncMinute
            ) {
              // Check if already synced this week
              if (company.lastSyncAt) {
                const daysSinceLastSync = Math.floor(
                  (now.getTime() - company.lastSyncAt.getTime()) / (24 * 60 * 60 * 1000)
                );

                if (daysSinceLastSync >= 7) {
                  shouldSync = true;
                  syncReason = `Weekly: Day ${currentDay} at ${currentHour}:${currentMinute}`;
                }
              } else {
                shouldSync = true;
                syncReason = `Weekly: First sync on day ${currentDay} at ${currentHour}:${currentMinute}`;
              }
            }
            break;
        }

        if (shouldSync) {
          console.log(`[Scheduler] ✅ Triggering sync for ${company.name} (${company.code}) - Reason: ${syncReason}`);
          await this.triggerSync(company);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error during check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async triggerSync(company: any) {
    try {
      // Calculate date range (yesterday to yesterday for daily historical sync)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startDate = `${yesterday.toISOString().split('T')[0]} 00:00:00`;
      const endDate = `${yesterday.toISOString().split('T')[0]} 23:59:59`;

      console.log(`[Scheduler] Syncing ${company.name}: ${startDate} to ${endDate}`);

      await syncSalesData({
        companyId: company.id,
        startDate,
        endDate,
      });

      // Update lastSyncAt
      await prisma.company.update({
        where: { id: company.id },
        data: { lastSyncAt: new Date() },
      });

      console.log(`[Scheduler] ✅ Sync completed for ${company.name}`);
    } catch (error) {
      console.error(`[Scheduler] ❌ Sync failed for ${company.name}:`, error);
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      hasTimer: this.timer !== null,
    };
  }
}

// Singleton instance
export const syncScheduler = new SyncScheduler();
