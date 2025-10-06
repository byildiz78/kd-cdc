import { prisma } from '@/lib/prisma';
import { executeRobotPosQuery } from './robotpos.service';
import { getQueryByCode, replaceQueryParams } from './query.service';
import { decrypt } from '@/lib/crypto';
import { groupByOrderKey } from './grouping.service';
import { processOrderKey } from './sync-processor.service';
import { updateSummaries, createDeltaRecords } from './sync-delta.service';

export interface SyncOptions {
  companyId: string;
  startDate: string;
  endDate: string;
}

export interface SyncResult {
  batchId: string;
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  duration: number;
}

/**
 * Ana sync fonksiyonu
 * SQL Server'dan veri çeker, hash ile karşılaştırır, değişiklikleri kaydeder
 */
export async function syncSalesData(options: SyncOptions): Promise<SyncResult> {
  const { companyId, startDate, endDate } = options;
  const startTime = Date.now();

  // 1. Sync batch kaydı oluştur
  const batch = await prisma.syncBatch.create({
    data: {
      companyId,
      startDate,
      endDate,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  try {
    // 2. Company bilgilerini al
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // 3. SQL query'yi al ve parametreleri değiştir
    const query = await getQueryByCode('sales-raw');
    const sqlQuery = replaceQueryParams(query.sqlContent, {
      StartDate: startDate,
      EndDate: endDate,
    });

    // Log SQL query to console
    console.log('\n' + '='.repeat(80));
    console.log('🔄 MANUEL SENKRONIZASYON BAŞLATILDI');
    console.log('='.repeat(80));
    console.log(`📅 Tarih Aralığı: ${startDate} - ${endDate}`);
    console.log(`🏢 Firma: ${company.name} (${company.code})`);
    console.log(`🌐 API URL: ${company.apiUrl}`);
    console.log('\n📝 RobotPOS API\'ye Gönderilen SQL Sorgusu:');
    console.log('-'.repeat(80));
    console.log(sqlQuery);
    console.log('-'.repeat(80) + '\n');

    // 4. SQL Server'dan veriyi çek
    console.log('⏳ RobotPOS API çağrısı yapılıyor...');
    const response = await executeRobotPosQuery(
      company.apiUrl,
      decrypt(company.apiToken),
      sqlQuery
    );

    console.log('✅ RobotPOS API yanıtı alındı');

    // RobotPos API { data: [...] } formatında döner
    const rawData = response?.data || [];

    if (!Array.isArray(rawData)) {
      throw new Error('Invalid data format from RobotPos API');
    }

    console.log(`📊 Gelen Veri: ${rawData.length} transaction`);

    // 5. Veriyi OrderKey'e göre grupla
    const groupedData = groupByOrderKey(rawData);
    const totalOrderKeys = Object.keys(groupedData).length;

    console.log(`🔑 Benzersiz OrderKey Sayısı: ${totalOrderKeys}`);
    console.log('\n⚙️  Change Detection İşlemi Başlıyor...\n');

    let newRecords = 0;
    let updatedRecords = 0;
    let unchangedRecords = 0;

    // 6. Her OrderKey için change detection yap
    for (const [orderKey, transactions] of Object.entries(groupedData)) {
      const result = await processOrderKey(orderKey, transactions, batch.id);

      if (result === 'NEW') newRecords++;
      else if (result === 'UPDATED') updatedRecords++;
      else if (result === 'UNCHANGED') unchangedRecords++;
    }

    console.log('\n📈 Change Detection Sonuçları:');
    console.log(`   ✨ Yeni: ${newRecords}`);
    console.log(`   🔄 Güncellenen: ${updatedRecords}`);
    console.log(`   ⏸️  Değişmeyen: ${unchangedRecords}`);

    // 7. Summary tablosunu güncelle
    console.log('\n📊 Summary tablosu güncelleniyor...');
    await updateSummaries(batch.id);
    console.log('✅ Summary güncellendi');

    // 8. İlk snapshot kontrolü ve oluşturma
    const existingSnapshot = await prisma.eRPSnapshot.findFirst({
      where: { companyId },
      orderBy: { snapshotDate: 'desc' },
    });

    if (!existingSnapshot) {
      console.log('📸 İlk snapshot oluşturuluyor (baseline)...');
      const summaryCount = await prisma.salesSummary.count({
        where: {
          sheetDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      await prisma.eRPSnapshot.create({
        data: {
          companyId,
          snapshotDate: new Date(),
          dataStartDate: startDate,
          dataEndDate: endDate,
          recordCount: summaryCount,
          deltaCount: 0,
        },
      });
      console.log('✅ İlk snapshot oluşturuldu (bundan sonraki sync\'lerde deltalar oluşacak)');
    } else {
      // 8b. Delta kayıtları oluştur (snapshot varsa)
      console.log('🔺 Delta kayıtları oluşturuluyor...');
      await createDeltaRecords(batch.id, companyId);
      console.log('✅ Delta kayıtları oluşturuldu');
    }

    // 9. Batch'i tamamla
    const duration = Date.now() - startTime;
    await prisma.syncBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        duration,
        totalRecords: totalOrderKeys,
        newRecords,
        updatedRecords,
        unchangedRecords,
      },
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ SENKRONIZASYON TAMAMLANDI');
    console.log('='.repeat(80));
    console.log(`⏱️  Süre: ${(duration / 1000).toFixed(2)} saniye`);
    console.log(`📦 Batch ID: ${batch.id}`);
    console.log('='.repeat(80) + '\n');

    return {
      batchId: batch.id,
      totalRecords: totalOrderKeys,
      newRecords,
      updatedRecords,
      unchangedRecords,
      duration,
    };
  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ SENKRONIZASYON HATASI');
    console.log('='.repeat(80));
    console.log('Hata:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.log('\nStack Trace:');
      console.log(error.stack);
    }
    console.log('='.repeat(80) + '\n');

    // Hata durumunda batch'i güncelle
    await prisma.syncBatch.update({
      where: { id: batch.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: JSON.stringify(error),
      },
    });

    throw error;
  }
}
