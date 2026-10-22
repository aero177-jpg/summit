import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabase } from "../models/db";
import {
  createLegacyTables,
  createLegacyUploadDocuments,
  type LegacyCollectionDocument,
  type LegacyItem,
} from "./fixtures/legacyData";

async function loadLegacyTables() {
  const fixture = createLegacyTables();

  await db.transaction("rw", db.collections, db.sections, db.items, async () => {
    await db.collections.bulkAdd(fixture.collections);
    await db.sections.bulkAdd(fixture.sections);
    await db.items.bulkAdd(fixture.items);
  });
}

function flattenLegacyDownload(documents: LegacyCollectionDocument[]) {
  const collections = [];
  const sections = [];
  const items: LegacyItem[] = [];

  for (const { sections: nestedSections, ...collection } of documents) {
    collections.push(collection);

    for (const { items: nestedItems, ...section } of nestedSections) {
      sections.push(section);
      items.push(
        ...nestedItems.map((item) => {
          const downloadedItem = { ...item };
          delete downloadedItem.id;
          return downloadedItem;
        }),
      );
    }
  }

  return { collections, sections, items };
}

describe("legacy BudgetDB4 data", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterAll(async () => {
    await db.delete();
  });

  it("stores all collection modes with string parent references and native dates", async () => {
    await loadLegacyTables();

    const collectionTypes = (await db.collections.orderBy("id").toArray()).map(({ collectionType }) => collectionType);
    const generalItems = await db.items.where("sectionId").equals("legacy-section-general").toArray();
    const quickSection = await db.sections.where("_id").equals("legacy-section-quick").first();
    const completedItem = (await db.items.toArray()).find(({ _id }) => _id === "legacy-item-done");

    expect(collectionTypes).toEqual(["budget", "general", "quick"]);
    expect(new Set(generalItems.map(({ status }) => status))).toEqual(
      new Set(["done", "active", "started", "paused", "nah", "do now!"]),
    );
    expect(quickSection?.collectionId).toBe("legacy-collection-quick");
    expect(quickSection?.createdAt).toBeInstanceOf(Date);
    expect(completedItem?.timerSettings?.date).toBeInstanceOf(Date);
  });

  it("captures the nested upload shape and its asymmetric local IDs", () => {
    const documents = createLegacyUploadDocuments();
    const budgetDocument = documents.find(({ _id }) => _id === "legacy-collection-budget");
    const budgetSection = budgetDocument?.sections[0];

    expect(budgetDocument).not.toHaveProperty("id");
    expect(budgetSection).not.toHaveProperty("id");
    expect(budgetSection?.items.map(({ id }) => id)).toEqual([301, 302]);
    expect(budgetSection?.customOrder).toEqual([301, 302]);
  });

  it("documents that download regenerates item IDs but leaves customOrder stale", async () => {
    const flattened = flattenLegacyDownload(createLegacyUploadDocuments());

    await resetDatabase(flattened.collections, flattened.sections, flattened.items);

    const budgetSection = await db.sections.where("_id").equals("legacy-section-budget").first();
    const budgetItems = await db.items.where("sectionId").equals("legacy-section-budget").toArray();
    const regeneratedItemIds = budgetItems.map(({ id }) => id);

    expect(budgetSection?.customOrder).toEqual([301, 302]);
    expect(regeneratedItemIds).not.toContain(301);
    expect(regeneratedItemIds).not.toContain(302);
  });

  it("removes child records when sections and collections are permanently deleted", async () => {
    await loadLegacyTables();

    const budgetSection = await db.sections.where("_id").equals("legacy-section-budget").first();
    const generalCollection = await db.collections.where("_id").equals("legacy-collection-general").first();

    await db.deleteSection(budgetSection);
    await db.deleteCollection(generalCollection);

    expect(await db.items.where("sectionId").equals("legacy-section-budget").count()).toBe(0);
    expect(await db.sections.where("collectionId").equals("legacy-collection-general").count()).toBe(0);
    expect(await db.items.where("collectionId").equals("legacy-collection-general").count()).toBe(0);
  });

  it("creates only one quick collection for concurrent requests", async () => {
    const [firstCollection, secondCollection] = await Promise.all([db.getOrCreateQuickCollection(), db.getOrCreateQuickCollection()]);

    expect(firstCollection.id).toBe(secondCollection.id);
    expect(await db.collections.where("collectionType").equals("quick").count()).toBe(1);
  });
});
