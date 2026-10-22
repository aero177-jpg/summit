import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  applyItemTableValue,
  convertItemsToTable,
  createItemTableColumns,
  getItemTableValue,
} from "../domain/tableConversion";
import { IItem } from "../models/item";
import { ISection } from "../models/section";
import { db, resetDatabase } from "../models/db";
import { convertLegacySection, migrateItemTables } from "../domain/migrateItemTables";
import { saveTableCells } from "../domain/tableItems";
import { liveQuery } from "dexie";
import { getItemChanges } from "../utils/usePersistItem";

const item = (values: Partial<IItem>): IItem => ({ sectionId: "section-1", ...values });

describe("table mode conversion", () => {
  it("writes only edited item fields instead of replacing a stale record", () => {
    const source = item({ title: "Task", amount: 10, customValues: { extra: "Keep" } });
    expect(getItemChanges(source, { ...source, title: "Edited" })).toEqual({ title: "Edited" });
    expect(getItemChanges(source, { ...source, amount: undefined })).toEqual({ amount: undefined });
  });
  it("edits canonical fields without losing hidden or custom data", () => {
    const source = item({ title: "Task", amount: 25, durationSeconds: 90, customValues: { extra: "Keep" } });
    const columns = createItemTableColumns([source]);
    const duration = columns.find((column) => column.field === "durationSeconds")!;
    const edited = applyItemTableValue(source, duration, "120");
    expect(edited).toMatchObject({ amount: 25, durationSeconds: 120, customValues: { extra: "Keep" } });
    expect(getItemTableValue(edited, duration)).toBe("120");
    expect(() => applyItemTableValue(source, duration, "bad")).toThrow();
    expect(source.durationSeconds).toBe(90);
  });

  it("round trips structured fields and retains stable mappings after header renames", () => {
    const source = item({
      checklistItems: [{ text: "Part", checked: true, amount: 3 }],
      tags: [{ title: "Work", value: "red" }],
    });
    for (const field of ["checklistItems", "tags"] as const) {
      const column = { id: `field:${field}`, field, heading: "Renamed" };
      expect(applyItemTableValue(source, column, getItemTableValue(source, column))[field]).toEqual(source[field]);
    }
    expect(applyItemTableValue(source, { id: "extra", heading: "Extra" }, "Value").customValues).toEqual({
      extra: "Value",
    });
  });

  it("converts general items and includes only populated metadata columns", () => {
    const table = convertItemsToTable(
      [
        item({
          title: "Plan release",
          status: "doing",
          tags: [{ title: "Work" }, { title: "Q3" }],
          comment: "Coordinate with support",
          checklistItems: [
            { text: "Draft notes", checked: true },
            { text: "Publish notes", checked: false },
          ],
        }),
        item({ title: "Book tickets" }),
      ],
      "general",
    );

    expect(table[0]).toEqual(["Item", "Status", "Progress", "Checklist", "Tags", "Notes"]);
    expect(table[1]).toEqual([
      "Plan release",
      "doing",
      "1/2",
      "[x] Draft notes\n[ ] Publish notes",
      "Work, Q3",
      "Coordinate with support",
    ]);
    expect(table[2]).toEqual(["Book tickets", "", "", "", "", ""]);
  });

  it("adds budget and time columns without adding empty optional columns", () => {
    const expense = item({ title: "Hosting", amount: 25, isIncome: false });
    const income = item({ title: "Refund", amount: 10, isIncome: true });

    expect(convertItemsToTable([expense, income], "budget")).toEqual([
      ["Item", "Amount", "Type"],
      ["Hosting", "25", "Expense"],
      ["Refund", "10", "Income"],
    ]);
    expect(convertItemsToTable([item({ title: "Deep work", amount: 90 })], "time")).toEqual([
      ["Item", "Duration"],
      ["Deep work", "90"],
    ]);
  });
});

describe("canonical table persistence and migration", () => {
  beforeEach(async () => {
    await resetDatabase([], [], []);
  });
  afterAll(async () => {
    await db.delete();
  });

  const seed = async (fields: Partial<ISection> = {}, values: Partial<IItem> = {}) => {
    const id = await db.sections.add({ _id: "section-1", collectionId: "collection-1", dataVersion: 1, ...fields });
    const itemId = await db.items.add(
      item({ _id: "item-1", title: "Task", amount: 10, durationSeconds: 90, ...values }),
    );
    return { section: (await db.sections.get(id))!, itemId };
  };

  it("notifies live item views after a table update", async () => {
    const { section, itemId } = await seed();
    let resolveInitial: () => void;
    let resolveUpdated: () => void;
    const initial = new Promise<void>((resolve) => {
      resolveInitial = resolve;
    });
    const updated = new Promise<void>((resolve) => {
      resolveUpdated = resolve;
    });
    const subscription = liveQuery(() => db.items.where("sectionId").equals("section-1").toArray()).subscribe(
      (items) => {
        if (items[0]?.title === "Task") resolveInitial();
        if (items[0]?.title === "Edited") resolveUpdated();
      },
    );
    try {
      await initial;
      await saveTableCells(section, [itemId], [{ id: "title", heading: "Item", field: "title" }], 1, 0, [["Edited"]]);
      await updated;
    } finally {
      subscription.unsubscribe();
    }
  });

  it("saves table edits to the same items across mode changes and header renames", async () => {
    const { section, itemId } = await seed();
    const columns = createItemTableColumns(await db.items.toArray());
    const amountIndex = columns.findIndex((column) => column.field === "amount");
    await saveTableCells(section, [itemId], columns, 0, amountIndex, [["Cost"]]);
    const renamed = (await db.sections.get(section.id))!;
    await saveTableCells(renamed, [itemId], renamed.tableColumns!, 1, amountIndex, [["25"]]);
    for (const sectionMode of ["general", "budget", "time", "table"] as const) {
      await db.sections.update(section.id, { sectionMode });
      expect(await db.items.get(itemId)).toMatchObject({ _id: "item-1", amount: 25, durationSeconds: 90 });
    }
    expect((await db.sections.get(section.id))?.tableData).toBeUndefined();
    expect((await db.sections.get(section.id))?.tableColumns?.[amountIndex]).toMatchObject({
      heading: "Cost",
      field: "amount",
    });
  });

  it("pastes new rows and columns atomically without losing custom values", async () => {
    const { section, itemId } = await seed({}, { customValues: { untouched: "Keep" } });
    const columns = [{ id: "field:title", field: "title" as const, heading: "Item" }];
    await saveTableCells(section, [itemId], columns, 1, 0, [
      ["Edited", "A"],
      ["New", "B"],
    ]);
    const records = await db.items.orderBy("id").toArray();
    const savedColumns = (await db.sections.get(section.id))!.tableColumns!;
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      title: "Edited",
      customValues: { untouched: "Keep", [savedColumns[1].id]: "A" },
    });
    expect(records[1]).toMatchObject({ title: "New", sectionId: "section-1", collectionId: "collection-1" });
    expect(getItemTableValue(records[1], savedColumns[1])).toBe("B");
  });

  it("rolls back all rows and schema changes when a pasted cell is invalid", async () => {
    const { section, itemId } = await seed();
    const columns = [{ id: "amount", field: "amount" as const, heading: "Amount" }];
    await expect(saveTableCells(section, [itemId], columns, 1, 0, [["20"], ["invalid"]])).rejects.toThrow();
    expect(await db.items.count()).toBe(1);
    expect((await db.items.get(itemId))?.amount).toBe(10);
    expect((await db.sections.get(section.id))?.tableColumns).toBeUndefined();
  });

  it("retains hidden column definitions when saving a visible cell", async () => {
    const hidden = { id: "extra", heading: "Extra", hidden: true };
    const { section, itemId } = await seed({ tableColumns: [hidden] }, { customValues: { extra: "Keep" } });
    await saveTableCells(section, [itemId], [{ id: "title", field: "title", heading: "Item" }], 1, 0, [["Edited"]]);
    expect((await db.sections.get(section.id))?.tableColumns).toContainEqual(hidden);
    expect((await db.items.get(itemId))?.customValues?.extra).toBe("Keep");
  });

  it("reconciles conflicts, preserves unmatched rows, removes grids and is idempotent", async () => {
    const { section, itemId } = await seed({
      dataVersion: undefined,
      tableData: [
        ["Item", "Amount", "Other"],
        ["Task", "20", "Extra"],
        ["Table only", "invalid", "More"],
      ],
    });
    const result = await migrateItemTables();
    expect(result).toMatchObject({ sections: 1, addedRows: 1, conflicts: 2 });
    const converted = (await db.sections.get(section.id))!;
    const records = await db.items.toArray();
    expect(converted.dataVersion).toBe(1);
    expect(converted).not.toHaveProperty("tableData");
    expect((await db.items.get(itemId))?.amount).toBe(10);
    const conflict = converted.tableColumns!.find((column) => column.heading === "Legacy table: Amount")!;
    expect(getItemTableValue(records[0], conflict)).toBe("20");
    expect(getItemTableValue(records[1], conflict)).toBe("invalid");
    const second = await migrateItemTables();
    expect(second).toEqual({ sections: 0, conflicts: 0, addedRows: 0 });
    expect(await db.items.toArray()).toEqual(records);
  });

  it("moves legacy time amounts to seconds and preserves structured values", () => {
    const checklistItems = [{ text: "Part", checked: true, amount: 5 }];
    const tags = [{ title: "Work", value: "red" }];
    const source = item({ _id: "original", title: "Task", amount: 90, checklistItems, tags });
    const section: ISection = {
      _id: "section-1",
      sectionMode: "time",
      tableData: convertItemsToTable([source], "time"),
    };
    const result = convertLegacySection(section, [source]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ durationSeconds: 90, checklistItems, tags });
    expect(result.items[0]).not.toHaveProperty("amount");
    expect(source.amount).toBe(90);
    expect(result.conflicts).toBe(0);
  });

  it("normalizes downloaded timestamps and carries widths onto stable columns", () => {
    const result = convertLegacySection(
      {
        _id: "section-1",
        tableData: [
          ["Item", "Notes"],
          ["Task", "Text"],
        ],
        tableColumnWidths: [180],
        createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
      },
      [item({ title: "Task", date: { seconds: 1700000000, nanoseconds: 0 } as any })],
    );
    expect(result.items[0].date).toEqual(new Date(1700000000000));
    expect(result.section.createdAt).toEqual(new Date(1700000000000));
    expect(result.section.tableColumns?.find((column) => column.field === "title")?.width).toBe(180);
    expect(result.section).not.toHaveProperty("tableColumnWidths");
  });

  it("rolls back the migration when a section cannot be safely addressed", async () => {
    const { section } = await seed({ dataVersion: undefined });
    await db.sections.add({ title: "Missing stable ID" });
    await expect(migrateItemTables()).rejects.toThrow("stable ID");
    expect((await db.sections.get(section.id))?.dataVersion).toBeUndefined();
  });
});
