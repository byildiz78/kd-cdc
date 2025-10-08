import { syncScheduler } from './sync-scheduler';

let isInitialized = false;

export function initializeWorkers() {
  if (isInitialized) {
    console.log('[Workers] Already initialized');
    return;
  }

  console.log('[Workers] Initializing background workers...');

  // Start sync scheduler
  syncScheduler.start();

  isInitialized = true;

  console.log('[Workers] All workers initialized successfully');

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Workers] Shutting down workers...');
    syncScheduler.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export function getWorkerStatus() {
  // Auto-initialize on first call if not initialized
  if (!isInitialized && typeof window === 'undefined') {
    initializeWorkers();
  }

  return {
    initialized: isInitialized,
    syncScheduler: syncScheduler.getStatus(),
  };
}
