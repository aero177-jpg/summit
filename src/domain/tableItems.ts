import { nanoid } from "nanoid";
import { db, BudgetDB } from "../models/db";
import { ISection, ItemTableColumn } from "../models/section";
import { applyItemTableValue } from "./tableConversion";

export async function saveTableCells(
  section: ISection,
  rowIds: number[],
  columns: ItemTableColumn[],
  startRow: number,
  startColumn: number,
  cells: string[][],
  database: BudgetDB = db,
): Promise<ISection> {
  if (!section._id || section.id === undefined) throw new Error("This table needs a saved section.");
  return database.transaction("rw", database.sections, database.items, async () => {
    const currentSection = await database.sections.get(section.id);
    if (!currentSection) throw new Error("The section no longer exists.");
    if (currentSection.tableData?.length && currentSection.dataVersion !== 1)
      throw new Error("Convert legacy data first.");
    const nextColumns = columns.map((column) => ({ ...column }));
    const neededColumns = startColumn + Math.max(0, ...cells.map((row) => row.length));
    while (nextColumns.length < neededColumns) nextColumns.push({ id: nanoid(), heading: "" });
    const nextRowIds = [...rowIds];
    const neededRows = startRow + cells.length - 1;
    while (nextRowIds.length < neededRows) {
      nextRowIds.push(
        await database.items.add({
          _id: nanoid(),
          sectionId: section._id,
          collectionId: section.collectionId,
          title: "",
        }),
      );
    }
    for (const [offset, row] of cells.entries()) {
      const rowIndex = startRow + offset;
      if (rowIndex === 0) {
        row.forEach((text, columnIndex) => {
          nextColumns[startColumn + columnIndex].heading = text;
        });
        continue;
      }
      const itemId = nextRowIds[rowIndex - 1];
      let item = await database.items.get(itemId);
      if (!item || item.sectionId !== section._id) throw new Error("A table row no longer exists. Try again.");
      row.forEach((text, columnIndex) => {
        item = applyItemTableValue(item, nextColumns[startColumn + columnIndex], text);
      });
      await database.items.put(item);
    }
    const visibleIds = new Set(nextColumns.map((column) => column.id));
    const nextSection = {
      ...currentSection,
      tableColumns: [
        ...nextColumns,
        ...(currentSection.tableColumns ?? []).filter((column) => !visibleIds.has(column.id)),
      ],
    };
    await database.sections.put(nextSection);
    return nextSection;
  });
}
