import { Prisma } from "@prisma/client";

import { runtimeConfig } from "@/lib/config/runtime";
import { prisma } from "@/lib/server/db";

let hasWarnedMissingAppSettingTable = false;

export async function readAppSettingValue<T>(settingKey: string): Promise<T | null> {
  if (runtimeConfig.authMode !== "database") {
    return null;
  }

  let setting;

  try {
    setting = await prisma.appSetting.findUnique({
      where: {
        settingKey,
      },
      select: {
        valueJson: true,
      },
    });
  } catch (error) {
    if (isMissingAppSettingTableError(error)) {
      warnMissingAppSettingTable();
      return null;
    }

    throw error;
  }

  if (!setting) {
    return null;
  }

  try {
    return JSON.parse(setting.valueJson) as T;
  } catch {
    return null;
  }
}

export async function writeAppSettingValue<T>(input: {
  settingKey: string;
  updatedByUserId: string;
  value: T;
}) {
  if (runtimeConfig.authMode !== "database") {
    throw new Error("La configuracion persistente solo esta disponible en modo database.");
  }

  try {
    await prisma.appSetting.upsert({
      where: {
        settingKey: input.settingKey,
      },
      update: {
        valueJson: JSON.stringify(input.value),
        updatedByUserId: input.updatedByUserId,
      },
      create: {
        settingKey: input.settingKey,
        valueJson: JSON.stringify(input.value),
        updatedByUserId: input.updatedByUserId,
      },
    });
  } catch (error) {
    if (isMissingAppSettingTableError(error)) {
      throw new Error(
        "La tabla AppSetting no existe en la base actual. Ejecuta `npm run db:push` para sincronizar el schema antes de guardar esta configuracion.",
      );
    }

    throw error;
  }
}

function isMissingAppSettingTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021"
  );
}

function warnMissingAppSettingTable() {
  if (hasWarnedMissingAppSettingTable) {
    return;
  }

  hasWarnedMissingAppSettingTable = true;
  console.warn(
    "AppSetting no existe en la base actual. Se usaran politicas por defecto hasta sincronizar el schema con `npm run db:push`.",
  );
}
