import "dotenv/config";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const statements = [
  `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_User_email_not_null'
    AND object_id = OBJECT_ID('dbo.[User]')
)
BEGIN
  CREATE UNIQUE INDEX UX_User_email_not_null
  ON dbo.[User] ([email])
  WHERE [email] IS NOT NULL
END
`,
  `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_User_dui_not_null'
    AND object_id = OBJECT_ID('dbo.[User]')
)
BEGIN
  CREATE UNIQUE INDEX UX_User_dui_not_null
  ON dbo.[User] ([dui])
  WHERE [dui] IS NOT NULL
END
`,
  `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_Document_identityCode_not_null'
    AND object_id = OBJECT_ID('dbo.[Document]')
)
BEGIN
  CREATE UNIQUE INDEX UX_Document_identityCode_not_null
  ON dbo.[Document] ([identityCode])
  WHERE [identityCode] IS NOT NULL
END
`,
  `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_Document_temporaryCode_not_null'
    AND object_id = OBJECT_ID('dbo.[Document]')
)
BEGIN
  CREATE UNIQUE INDEX UX_Document_temporaryCode_not_null
  ON dbo.[Document] ([temporaryCode])
  WHERE [temporaryCode] IS NOT NULL
END
`,
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("SQL Server filtered indexes applied.");
} finally {
  await prisma.$disconnect();
}
