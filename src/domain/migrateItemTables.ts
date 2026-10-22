import { nanoid } from "nanoid";
import { db, BudgetDB } from "../models/db";
import { IItem } from "../models/item";
import { ISection, ItemTableColumn, TableField } from "../models/section";
import {
  applyItemTableValue,
  convertItemsToTable,
  createItemTableColumns,
  getItemTableValue,
  itemTableFields,
} from "./tableConversion";

export const ITEM_DATA_VERSION = 1;

const normalizeDate = (value: any): Date | undefined => {
  if (value === undefined || value === null) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000 + (value.nanoseconds ?? 0) / 1000000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
};

const normalizeItemDates = (source: IItem): IItem => ({
  ...source,
  ...(source.date !== undefined ? { date: normalizeDate(source.date) } : {}),
  ...(source.timerSettings
    ? { timerSettings: { ...source.timerSettings, date: normalizeDate(source.timerSettings.date) } }
    : {}),
  ...(source.subItems ? { subItems: source.subItems.map(normalizeItemDates) } : {}),
});

const legacyField = (heading: string): TableField | undefined => {
  const normalized = heading.trim().toLowerCase();
  if (normalized === "duration") return "durationSeconds";
  return itemTableFields.find((column) => column.heading.toLowerCase() === normalized)?.field;
};

const legacyText = (item: IItem, field: TableField): string => {
  if (field === "durationSeconds") return item.durationSeconds === undefined ? "" : String(item.durationSeconds);
  const heading = itemTableFields.find((column) => column.field === field)?.heading;
  const exported = convertItemsToTable([item], "budget");
  const index = exported[0].indexOf(heading);
  return index >= 0 ? exported[1][index] : getItemTableValue(item, { id: field, heading, field });
};

const parseLegacyCell = (item: IItem, column: ItemTableColumn, text: string): IItem => {
  if (column.field === "checklistItems") {
    const lines = text.split("\n");
    if (!lines.every((line) => /^\[[ xX]\] /.test(line))) throw new Error("Unrecognized checklist");
    return {
      ...item,
      checklistItems: lines.map((line) => ({ text: line.slice(4), checked: line[1].toLowerCase() === "x" })),
    };
  }
  if (column.field === "tags") return { ...item, tags: text.split(",").map((title) => ({ title: title.trim() })) };
  if (column.field === "progress") {
    const match = text.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?: (.*))?$/);
    if (!match) throw new Error("Unrecognized progress");
    return {
      ...item,
      sublistMode: "slider",
      progress: { current: match[1], max: Number(match[2]), type: match[3] ?? "" },
    };
  }
  return applyItemTableValue(item, column, text);
};

export function convertLegacySection(section: ISection, sourceItems: IItem[], collectionType = "general") {
  if (section.dataVersion === ITEM_DATA_VERSION) return { section, items: sourceItems, conflicts: 0, addedRows: 0 };
  const headers = section.tableData?.[0] ?? [];
  const durationSource =
    section.sectionMode === "time" ||
    (headers.some((heading) => legacyField(heading) === "durationSeconds") &&
      !headers.some((heading) => legacyField(heading) === "amount"));
  const items: IItem[] = sourceItems.map((source) => {
    const item = { ...normalizeItemDates(source), customValues: { ...source.customValues } };
    if (durationSource && item.amount !== undefined) {
      if (item.durationSeconds === undefined) item.durationSeconds = Number(item.amount);
      delete item.amount;
    }
    return item;
  });
  const columns: ItemTableColumn[] = [...(section.tableColumns ?? [])];
  const usedFields = new Set(columns.map((column) => column.field).filter(Boolean));
  const tableColumns = headers.map((heading, index) => {
    const field = legacyField(heading);
    const column: ItemTableColumn =
      field && !usedFields.has(field) ? { id: `field:${field}`, heading, field } : { id: nanoid(), heading };
    if (column.field) usedFields.add(column.field);
    if (section.tableColumnWidths?.[index] !== undefined) column.width = section.tableColumnWidths[index];
    columns.push(column);
    return column;
  });
  let conflicts = 0;
  let addedRows = 0;
  const conflictColumns = new Map<number, ItemTableColumn>();
  const rows = section.tableData?.slice(1) ?? [];
  const titleIndex = tableColumns.findIndex((column) => column.field === "title");
  const originalCount = items.length;
  for (const row of rows) {
    const title = titleIndex >= 0 ? row[titleIndex] : undefined;
    const matches = title
      ? sourceItems.map((item, index) => (item.title === title ? index : -1)).filter((index) => index >= 0)
      : [];
    const uniqueTableTitle = title && rows.filter((candidate) => candidate[titleIndex] === title).length === 1;
    const matchIndex = matches.length === 1 && uniqueTableTitle ? matches[0] : -1;
    let item: IItem =
      matchIndex >= 0
        ? items[matchIndex]
        : {
            _id: nanoid(),
            sectionId: section._id,
            collectionId: section.collectionId,
            title: "",
            customValues: {},
          };
    if (matchIndex < 0) addedRows++;
    const preserve = (index: number, text: string) => {
      let column = conflictColumns.get(index);
      if (!column) {
        column = { id: nanoid(), heading: `Legacy table: ${tableColumns[index]?.heading || `Column ${index + 1}`}` };
        conflictColumns.set(index, column);
        columns.push(column);
      }
      item = applyItemTableValue(item, column, text);
      conflicts++;
    };
    row.forEach((text, index) => {
      let column = tableColumns[index];
      if (!column) {
        column = { id: nanoid(), heading: `Column ${index + 1}` };
        tableColumns[index] = column;
        columns.push(column);
      }
      if (!column.field) {
        item = applyItemTableValue(item, column, text);
        return;
      }
      if (matchIndex >= 0 && text === legacyText(item, column.field)) return;
      const current = item[column.field];
      const populated =
        current !== undefined && current !== null && current !== "" && (!Array.isArray(current) || current.length > 0);
      if (matchIndex >= 0 && populated) {
        preserve(index, text);
        return;
      }
      if (!text) return;
      try {
        item = parseLegacyCell(item, column, text);
      } catch {
        preserve(index, text);
      }
    });
    if (matchIndex >= 0) items[matchIndex] = item;
    else items.push(item);
  }
  const { tableData: ignoredGrid, tableColumnWidths: ignoredWidths, ...fields } = section;
  const nextSection: ISection = {
    ...fields,
    ...(section.createdAt !== undefined ? { createdAt: normalizeDate(section.createdAt) } : {}),
    sectionMode: section.sectionMode ?? (collectionType === "budget" ? "budget" : "general"),
    dataVersion: ITEM_DATA_VERSION,
    tableColumns: createItemTableColumns(items, columns),
  };
  return { section: nextSection, items, conflicts, addedRows: items.length - originalCount };
}

export async function migrateItemTables(database: BudgetDB = db) {
  return database.transaction("rw", database.collections, database.sections, database.items, async () => {
    const pending = await database.sections.filter((section) => section.dataVersion !== ITEM_DATA_VERSION).toArray();
    let conflicts = 0;
    let addedRows = 0;
    for (const collection of await database.collections.toArray()) {
      if (collection.dateCreated !== undefined)
        await database.collections.update(collection.id, { dateCreated: normalizeDate(collection.dateCreated) });
    }
    for (const section of pending) {
      if (!section._id) throw new Error("A legacy section has no stable ID. Conversion was cancelled.");
      const items = await database.items.where("sectionId").equals(section._id).toArray();
      const collection = section.collectionId
        ? await database.collections.where("_id").equals(section.collectionId).first()
        : undefined;
      const result = convertLegacySection(section, items, collection?.collectionType);
      const itemIds: number[] = [];
      for (const item of result.items) {
        if (!item._id) item._id = nanoid();
        itemIds.push(await database.items.put(item));
      }
      const previousOrder = section.customOrder ?? [];
      result.section.customOrder = [
        ...previousOrder.filter((id) => itemIds.includes(id)),
        ...itemIds.filter((id) => !previousOrder.includes(id)),
      ];
      await database.sections.put(result.section);
      conflicts += result.conflicts;
      addedRows += result.addedRows;
    }
    return { sections: pending.length, conflicts, addedRows };
  });
}
