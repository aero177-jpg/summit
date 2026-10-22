import Dexie, { Table } from "dexie";
import { populate } from "./populate";
import { IItem } from "./item";
import { ISection } from "./section";
import { ICollection } from "./collection";
import { nanoid } from "nanoid";
export class BudgetDB extends Dexie {
  collections!: Table<ICollection, number>;
  sections!: Table<ISection, number>;
  items!: Table<IItem, number>;
  constructor() {
    super("BudgetDB4");
    this.version(3).stores({
      collections: "++id, collectionType, _id",
      sections: "++id, collectionId, _id",
      items: "++id, sectionId, collectionId, status",
    });
    this.version(4).stores({
      collections: "++id, collectionType, _id",
      sections: "++id, collectionId, _id",
      items: "++id, sectionId, collectionId, status, [collectionId+status]",
    });
  }

  deleteSection(section: ISection) {
    return this.transaction("rw", this.items, this.sections, async () => {
      if (section._id) {
        await this.items.where("sectionId").equals(section._id).delete();
      }
      if (section.id !== undefined) {
        await this.sections.delete(section.id);
      }
    });
  }

  deleteCollection(collection: ICollection) {
    return this.transaction(
      "rw",
      this.items,
      this.sections,
      this.collections,
      async () => {
        if (collection._id) {
          await this.items.where("collectionId").equals(collection._id).delete();
          await this.sections.where("collectionId").equals(collection._id).delete();
        }
        if (collection.id !== undefined) {
          await this.collections.delete(collection.id);
        }
      }
    );
  }

  async getOrCreateQuickCollection(): Promise<ICollection> {
    return this.transaction("rw", this.collections, async () => {
      const existingCollection = await this.collections.where("collectionType").equals("quick").first();
      if (existingCollection) return existingCollection;

      const collectionId = await this.collections.add({
        title: "Quick Collection",
        _id: nanoid(),
        collectionType: "quick",
        sorted: false,
      });
      return this.collections.get(collectionId);
    });
  }
}
export class FirebaseBackup extends Dexie {
  backups: Table<any>;
  constructor() {
    super("firebaseBackup");
    this.version(1).stores({
      backups: "++id",
    });
  }

  deleteBackup(id: number) {
    return this.backups.delete(id);
  }
}
export const firebaseBackup_db = new FirebaseBackup();
export const db = new BudgetDB();

db.on("populate", populate);
export function resetDatabase(collections, sections, items) {
  return db.transaction(
    "rw",
    db.collections,
    db.sections,
    db.items,
    async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
      if (collections) {
        await db.collections.bulkAdd(collections);
      }
      if (sections) {
        await db.sections.bulkAdd(sections);
      }
      if (items) {
        await db.items.bulkAdd(items);
      }
      // await populate();
    }
  );
}
