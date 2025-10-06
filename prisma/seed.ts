import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { encrypt } from '../lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create SuperAdmin user
  const superAdmin = await prisma.user.upsert({
    where: { username: 'robotpos' },
    update: {},
    create: {
      username: 'robotpos',
      password: await bcrypt.hash('123', 10),
      role: 'SUPERADMIN',
      companyId: null,
      isActive: true,
    },
  });
  console.log('✅ SuperAdmin created:', superAdmin.username);

  // 2. Create example company (Kahve Dünyası)
  const kdCompany = await prisma.company.upsert({
    where: { code: 'KD' },
    update: {},
    create: {
      name: 'Kahve Dünyası',
      code: 'KD',
      apiUrl: 'https://kahvedunyasi.robotpos.com/realtimeapi/api/1/query',
      apiToken: encrypt('13df1b79-16ed-4991-87e7-28eadaba0b38'),
      isActive: true,
    },
  });
  console.log('✅ Company created:', kdCompany.name);

  // 3. Create company admin user
  const kdAdmin = await prisma.user.upsert({
    where: { username: 'kd_admin' },
    update: {},
    create: {
      username: 'kd_admin',
      password: await bcrypt.hash('kd123', 10),
      role: 'ADMIN',
      companyId: kdCompany.id,
      isActive: true,
    },
  });
  console.log('✅ Company Admin created:', kdAdmin.username);

  // 4. Seed standard queries from SQL files
  const queries = [
    {
      name: 'Invoice Full Data',
      code: 'invoice-full',
      category: 'INVOICE' as const,
      description: 'Complete invoice data with items and payments',
      file: 'sqlquery.txt',
    },
    {
      name: 'Invoice Headers Only',
      code: 'invoice-headers',
      category: 'INVOICE' as const,
      description: 'Optimized query for invoice headers only',
      file: 'sqlquery-headers.txt',
    },
    {
      name: 'Invoice Detail by OrderKey',
      code: 'invoice-detail',
      category: 'INVOICE' as const,
      description: 'Single invoice detail with items and payments',
      file: 'sqlquery-detail.txt',
    },
    {
      name: 'Sales Transaction Data',
      code: 'sales-data',
      category: 'SALES' as const,
      description: 'Detailed sales transaction data',
      file: 'sqlquery-sales.txt',
    },
    {
      name: 'Sales Raw Data',
      code: 'sales-raw',
      category: 'SALES' as const,
      description: 'Raw sales data for sync system (ImportDate based)',
      sql: `SELECT
    t.OrderKey,
    h.OrderDateTime,
    CONVERT(VARCHAR, h.OrderDateTime, 23) AS [SheetDate],
    h.ImportDate,

    t.TransactionKey AS [TransactionID],
    t.LineKey,
    t.MenuItemKey AS [MenuItemID],
    t.MenuItemText,
    t.MainMenuItemAccountingCode AS [MainAccountingCode],
    t.AccountingCode,
    ISNULL(t.IsMainCombo, 0) AS [IsMainCombo],
    t.Quantity,
    t.ExtendedPrice,
    t.TaxPercent,

    h.AmountDue,
    h.SubTotal AS [OrderSubTotal],
    h.OrderStatus,
    h.IsInvoice,
    h.LineDeleted AS [HeaderDeleted],
    t.LineDeleted AS [TransactionDeleted],

    t.BranchID,
    ISNULL(bre.ExternalCode, br.ExternalCode) AS [BranchCode],
    br.CustomField1 AS [BranchType],
    CAST((CASE WHEN bre.AutoID IS NULL THEN 0 ELSE 1 END) AS BIT) AS [IsExternal],

    t.ExtendedPrice * ISNULL(NULLIF(h.AmountDue,0),1) / ISNULL(NULLIF(h.SubTotal,0),1) AS [AdjustedPrice],

    ROUND(t.ExtendedPrice * ISNULL(NULLIF(h.AmountDue,0),1) / ISNULL(NULLIF(h.SubTotal,0),1), 5) -
    ROUND((t.ExtendedPrice * t.TaxPercent) / (100 + t.TaxPercent) *
          ISNULL(NULLIF(h.AmountDue,0),1) / ISNULL(NULLIF(h.SubTotal,0),1), 5) AS [LineSubTotal],

    ROUND((t.ExtendedPrice * t.TaxPercent) / (100 + t.TaxPercent) *
          ISNULL(NULLIF(h.AmountDue,0),1) / ISNULL(NULLIF(h.SubTotal,0),1), 5) AS [LineTaxTotal],

    ROUND(t.ExtendedPrice * ISNULL(NULLIF(h.AmountDue,0),1) / ISNULL(NULLIF(h.SubTotal,0),1), 5) AS [LineTotal]

FROM OrderTransactions t WITH(NOLOCK)
    INNER JOIN OrderHeaders h WITH(NOLOCK)
        ON h.OrderKey = t.OrderKey
    INNER JOIN efr_Branchs br WITH(NOLOCK)
        ON br.BranchID = t.BranchID
    LEFT JOIN efr_BranchExternals bre WITH(NOLOCK)
        ON bre.BranchID = t.BranchID
        AND bre.[Date] = CONVERT(VARCHAR, h.OrderDateTime, 23)
WHERE 1=1
    AND h.LineDeleted = 0
    AND t.LineDeleted = 0
    AND h.ImportDate BETWEEN @StartDate AND @EndDate
    AND t.BranchID > 0
    AND ISNULL(h.IsInvoice,0) = 0
    AND t.MenuItemText NOT IN (
        'BAR MESAJ', 'CIKOLATA MESAJ', 'MUTFAK MESAJ', '??',
        'BEKLET', 'MADLEN', 'MARS', 'SEKERLI',
        'MUTFAK BAR MESAJ', 'SISE', 'BAYLAN YILBAŞI OZEL KUTU'
    )
    AND h.OrderStatus = 2
    AND br.CustomField1 IN ('KD', 'BY', 'KB')
ORDER BY
    h.OrderDateTime,
    t.OrderKey,
    t.TransactionKey`,
    },
  ];

  for (const query of queries) {
    let sqlContent: string;

    // Check if SQL is inline or from file
    if ('sql' in query) {
      sqlContent = query.sql;
    } else if ('file' in query) {
      const sqlFilePath = path.join(process.cwd(), query.file);
      if (fs.existsSync(sqlFilePath)) {
        sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
      } else {
        console.warn(`⚠️  SQL file not found: ${query.file}`);
        continue;
      }
    } else {
      continue;
    }

    await prisma.query.upsert({
      where: { code: query.code },
      update: { sqlContent },
      create: {
        name: query.name,
        code: query.code,
        category: query.category,
        description: query.description,
        sqlContent,
        isActive: true,
      },
    });
    console.log(`✅ Query created: ${query.name}`);
  }

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📝 Login credentials:');
  console.log('   SuperAdmin: robotpos / 123');
  console.log('   Company Admin: kd_admin / kd123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
