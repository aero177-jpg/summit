import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  exportLegacyData,
  type LegacyExportEnvelope,
  verifyLegacyExportChecksum,
} from "../data/legacy/exportLegacyData";
import { db } from "../models/db";
import { createLegacyTables } from "./fixtures/legacyData";

async function loadLegacyTables() {
  const fixture = createLegacyTables();

  await db.transaction("rw", db.collections, db.sections, db.items, async () => {
    await db.collections.bulkAdd(fixture.collections);
    await db.sections.bulkAdd(fixture.sections);
    await db.items.bulkAdd(fixture.items);
  });
}

async function readLegacyTables() {
  return db.transaction("r", db.collections, db.sections, db.items, async () => ({
    collections: await db.collections.orderBy("id").toArray(),
    sections: await db.sections.orderBy("id").toArray(),
    items: await db.items.orderBy("id").toArray(),
  }));
}

describe("legacy data export", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await loadLegacyTables();
  });

  afterAll(async () => {
    await db.delete();
  });

  it("creates a versioned JSON-safe envelope without mutating BudgetDB4", async () => {
    const beforeExport = await readLegacyTables();
    const envelope = await exportLegacyData(db, new Date("2026-09-07T12:00:00.000Z"));
    const afterExport = await readLegacyTables();
    const serializedEnvelope = JSON.stringify(envelope);

    expect(envelope).toMatchObject({
      format: "vite-budget-legacy-export",
      formatVersion: 1,
      exportedAt: "2026-09-07T12:00:00.000Z",
      source: { databaseName: "BudgetDB4", schemaVersion: 4 },
      counts: { collections: 3, sections: 3, items: 9 },
      checksum: { algorithm: "SHA-256" },
    });
    expect(envelope.checksum.value).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.data.sections[2].createdAt).toBe("2026-09-07T08:00:00.000Z");
    expect(envelope.data.items[2].timerSettings).toMatchObject({ date: "2024-02-12T09:00:00.000Z" });
    expect(serializedEnvelope).not.toContain("[object Date]");
    expect(afterExport).toEqual(beforeExport);
  });

  it("keeps checksums stable across export times and detects tampering", async () => {
    const firstExport = await exportLegacyData(db, new Date("2026-09-07T12:00:00.000Z"));
    const secondExport = await exportLegacyData(db, new Date("2026-09-08T12:00:00.000Z"));
    const parsedExport = JSON.parse(JSON.stringify(firstExport)) as LegacyExportEnvelope;

    expect(secondExport.exportedAt).not.toBe(firstExport.exportedAt);
    expect(secondExport.checksum.value).toBe(firstExport.checksum.value);
    expect(await verifyLegacyExportChecksum(parsedExport)).toBe(true);

    parsedExport.data.items[0].title = "Tampered title";
    expect(await verifyLegacyExportChecksum(parsedExport)).toBe(false);
  });
});
