import { db, type BudgetDB } from "../../models/db";

export const LEGACY_EXPORT_FORMAT = "vite-budget-legacy-export" as const;
export const LEGACY_EXPORT_VERSION = 1 as const;

type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface LegacyExportData {
  collections: JsonObject[];
  sections: JsonObject[];
  items: JsonObject[];
}

export interface LegacyExportEnvelope {
  format: typeof LEGACY_EXPORT_FORMAT;
  formatVersion: typeof LEGACY_EXPORT_VERSION;
  exportedAt: string;
  source: {
    databaseName: "BudgetDB4";
    schemaVersion: 4;
  };
  counts: {
    collections: number;
    sections: number;
    items: number;
  };
  checksum: {
    algorithm: "SHA-256";
    value: string;
  };
  data: LegacyExportData;
}

type ChecksumPayload = Pick<LegacyExportEnvelope, "format" | "formatVersion" | "source" | "counts" | "data">;

function normalizeJson(value: unknown): JsonValue | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value as JsonPrimitive;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry) ?? null);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .flatMap(([key, entry]) => {
          const normalizedEntry = normalizeJson(entry);
          return normalizedEntry === undefined ? [] : [[key, normalizedEntry]];
        }),
    );
  }

  throw new TypeError(`Unsupported legacy export value: ${typeof value}`);
}

function normalizeRecord(record: object): JsonObject {
  const normalizedRecord = normalizeJson(record);

  if (!normalizedRecord || Array.isArray(normalizedRecord) || typeof normalizedRecord !== "object") {
    throw new TypeError("Legacy table records must serialize to JSON objects");
  }

  return normalizedRecord;
}

function createChecksumPayload(envelope: Omit<LegacyExportEnvelope, "checksum" | "exportedAt">): ChecksumPayload {
  return {
    format: envelope.format,
    formatVersion: envelope.formatVersion,
    source: envelope.source,
    counts: envelope.counts,
    data: envelope.data,
  };
}

async function sha256(value: unknown): Promise<string> {
  const normalizedValue = normalizeJson(value);

  if (normalizedValue === undefined) {
    throw new TypeError("Cannot checksum an unsupported legacy export value");
  }

  const bytes = new TextEncoder().encode(JSON.stringify(normalizedValue));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function exportLegacyData(
  database: BudgetDB = db,
  exportedAt: Date = new Date(),
): Promise<LegacyExportEnvelope> {
  const snapshot = await database.transaction(
    "r",
    database.collections,
    database.sections,
    database.items,
    async () => ({
      collections: await database.collections.orderBy("id").toArray(),
      sections: await database.sections.orderBy("id").toArray(),
      items: await database.items.orderBy("id").toArray(),
    }),
  );

  const data: LegacyExportData = {
    collections: snapshot.collections.map(normalizeRecord),
    sections: snapshot.sections.map(normalizeRecord),
    items: snapshot.items.map(normalizeRecord),
  };
  const envelopeWithoutChecksum = {
    format: LEGACY_EXPORT_FORMAT,
    formatVersion: LEGACY_EXPORT_VERSION,
    source: {
      databaseName: "BudgetDB4" as const,
      schemaVersion: 4 as const,
    },
    counts: {
      collections: data.collections.length,
      sections: data.sections.length,
      items: data.items.length,
    },
    data,
  };
  const checksum = await sha256(createChecksumPayload(envelopeWithoutChecksum));

  return {
    ...envelopeWithoutChecksum,
    exportedAt: exportedAt.toISOString(),
    checksum: {
      algorithm: "SHA-256",
      value: checksum,
    },
  };
}

export async function verifyLegacyExportChecksum(envelope: LegacyExportEnvelope): Promise<boolean> {
  if (envelope.checksum.algorithm !== "SHA-256") {
    return false;
  }

  const expectedChecksum = await sha256(createChecksumPayload(envelope));
  return expectedChecksum === envelope.checksum.value;
}
