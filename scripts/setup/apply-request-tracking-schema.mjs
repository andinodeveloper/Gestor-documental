import "dotenv/config";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const statements = [
  {
    name: "DocumentRequest.currentTrackingStageCode",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'currentTrackingStageCode') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD currentTrackingStageCode NVARCHAR(1000) NOT NULL
    CONSTRAINT DF_DocumentRequest_currentTrackingStageCode DEFAULT N'0.1';
END
`,
  },
  {
    name: "DocumentRequest.currentResponsibilityRole",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'currentResponsibilityRole') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD currentResponsibilityRole NVARCHAR(1000) NOT NULL
    CONSTRAINT DF_DocumentRequest_currentResponsibilityRole DEFAULT N'ADMINISTRATOR';
END
`,
  },
  {
    name: "DocumentRequest.waitingReason",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'waitingReason') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD waitingReason NVARCHAR(1000) NOT NULL
    CONSTRAINT DF_DocumentRequest_waitingReason DEFAULT N'NONE';
END
`,
  },
  {
    name: "DocumentRequest.waitingSince",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'waitingSince') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD waitingSince DATETIME2 NULL;
END
`,
  },
  {
    name: "DocumentRequest.lastRequesterResponseAt",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'lastRequesterResponseAt') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD lastRequesterResponseAt DATETIME2 NULL;
END
`,
  },
  {
    name: "DocumentRequest.cancellationRequestedAt",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'cancellationRequestedAt') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD cancellationRequestedAt DATETIME2 NULL;
END
`,
  },
  {
    name: "DocumentRequest.cancellationRequestedByUserId",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'cancellationRequestedByUserId') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD cancellationRequestedByUserId NVARCHAR(1000) NULL;
END
`,
  },
  {
    name: "DocumentRequest.cancellationRequestReason",
    sql: `
IF COL_LENGTH('dbo.DocumentRequest', 'cancellationRequestReason') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequest
  ADD cancellationRequestReason NVARCHAR(1000) NULL;
END
`,
  },
  {
    name: "DocumentRequestActivity.trackingStageCode",
    sql: `
IF COL_LENGTH('dbo.DocumentRequestActivity', 'trackingStageCode') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequestActivity
  ADD trackingStageCode NVARCHAR(1000) NULL;
END
`,
  },
  {
    name: "DocumentRequestActivity.responsibilityRole",
    sql: `
IF COL_LENGTH('dbo.DocumentRequestActivity', 'responsibilityRole') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequestActivity
  ADD responsibilityRole NVARCHAR(1000) NULL;
END
`,
  },
  {
    name: "DocumentRequestActivity.waitingReason",
    sql: `
IF COL_LENGTH('dbo.DocumentRequestActivity', 'waitingReason') IS NULL
BEGIN
  ALTER TABLE dbo.DocumentRequestActivity
  ADD waitingReason NVARCHAR(1000) NULL;
END
`,
  },
  {
    name: "DocumentRequestProgressItem table",
    sql: `
IF OBJECT_ID('dbo.DocumentRequestProgressItem', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.DocumentRequestProgressItem (
    id NVARCHAR(1000) NOT NULL,
    documentRequestId NVARCHAR(1000) NOT NULL,
    phaseCode NVARCHAR(1000) NOT NULL,
    phaseName NVARCHAR(1000) NOT NULL,
    activityCode NVARCHAR(1000) NOT NULL,
    activityName NVARCHAR(1000) NOT NULL,
    description NVARCHAR(1000) NULL,
    weight INT NOT NULL,
    sortOrder INT NOT NULL,
    appliesToRequestType NVARCHAR(1000) NOT NULL,
    status NVARCHAR(1000) NOT NULL,
    note NVARCHAR(1000) NULL,
    completedAt DATETIME2 NULL,
    lastChangedAt DATETIME2 NOT NULL CONSTRAINT DF_DocumentRequestProgressItem_lastChangedAt DEFAULT SYSUTCDATETIME(),
    lastChangedByUserId NVARCHAR(1000) NULL,
    CONSTRAINT DocumentRequestProgressItem_pkey PRIMARY KEY (id),
    CONSTRAINT DocumentRequestProgressItem_documentRequestId_fkey
      FOREIGN KEY (documentRequestId) REFERENCES dbo.DocumentRequest(id)
  );
END
`,
  },
  {
    name: "DocumentRequestProgressItem unique index",
    sql: `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'DocumentRequestProgressItem_documentRequestId_activityCode_key'
    AND object_id = OBJECT_ID('dbo.DocumentRequestProgressItem')
)
BEGIN
  CREATE UNIQUE INDEX DocumentRequestProgressItem_documentRequestId_activityCode_key
  ON dbo.DocumentRequestProgressItem (documentRequestId, activityCode);
END
`,
  },
  {
    name: "DocumentRequestProgressItem sort index",
    sql: `
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'DocumentRequestProgressItem_documentRequestId_sortOrder_idx'
    AND object_id = OBJECT_ID('dbo.DocumentRequestProgressItem')
)
BEGIN
  CREATE INDEX DocumentRequestProgressItem_documentRequestId_sortOrder_idx
  ON dbo.DocumentRequestProgressItem (documentRequestId, sortOrder);
END
`,
  },
];

try {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement.sql);
    console.log(`Applied: ${statement.name}`);
  }

  console.log("Request tracking schema is aligned.");
} finally {
  await prisma.$disconnect();
}
