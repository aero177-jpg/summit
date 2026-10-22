import { IItem } from "../models/item";
import { ItemTableColumn, SectionMode, TableField } from "../models/section";

type TableColumn = {
  heading: string;
  value: (item: IItem) => string;
  include?: (items: IItem[]) => boolean;
};

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== "";

const formatDate = (date?: Date) => {
  if (!date) return "";
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toLocaleDateString();
};

const formatProgress = (item: IItem) => {
  if (item.sublistMode === "slider" && item.progress) {
    const current = item.progress.current ?? 0;
    const max = item.progress.max ?? 0;
    return `${current}/${max}${item.progress.type ? ` ${item.progress.type}` : ""}`;
  }

  if (item.checklistItems?.length) {
    const completed = item.checklistItems.filter((checklistItem) => checklistItem.checked).length;
    return `${completed}/${item.checklistItems.length}`;
  }

  return "";
};

const formatChecklist = (item: IItem) =>
  item.checklistItems
    ?.map((checklistItem) => `${checklistItem.checked ? "[x]" : "[ ]"} ${checklistItem.text}`)
    .join("\n") ?? "";

const commonColumns: TableColumn[] = [
  { heading: "Item", value: (item) => item.title ?? "" },
  {
    heading: "Status",
    value: (item) => item.status ?? "",
    include: (items) => items.some((item) => hasValue(item.status)),
  },
  {
    heading: "Progress",
    value: formatProgress,
    include: (items) => items.some((item) => hasValue(formatProgress(item))),
  },
  {
    heading: "Checklist",
    value: formatChecklist,
    include: (items) => items.some((item) => item.checklistItems?.length),
  },
  {
    heading: "Tags",
    value: (item) => item.tags?.map((tag) => tag.title ?? tag).join(", ") ?? "",
    include: (items) => items.some((item) => item.tags?.length),
  },
  {
    heading: "Date",
    value: (item) => formatDate(item.date),
    include: (items) => items.some((item) => hasValue(item.date)),
  },
  {
    heading: "Notes",
    value: (item) => item.comment ?? "",
    include: (items) => items.some((item) => hasValue(item.comment)),
  },
];

const budgetColumns: TableColumn[] = [
  commonColumns[0],
  { heading: "Amount", value: (item) => (hasValue(item.amount) ? String(item.amount) : "") },
  { heading: "Type", value: (item) => (item.isIncome ? "Income" : "Expense") },
  ...commonColumns.slice(1),
];

const timeColumns: TableColumn[] = [
  commonColumns[0],
  { heading: "Duration", value: (item) => (hasValue(item.amount) ? String(item.amount) : "") },
  ...commonColumns.slice(1),
];

export const convertItemsToTable = (items: IItem[], sourceMode: Exclude<SectionMode, "table">): string[][] => {
  const candidates = sourceMode === "budget" ? budgetColumns : sourceMode === "time" ? timeColumns : commonColumns;
  const columns = candidates.filter((column) => !column.include || column.include(items));
  return [columns.map((column) => column.heading), ...items.map((item) => columns.map((column) => column.value(item)))];
};

export const itemTableFields: { field: TableField; heading: string }[] = [
  { field: "title", heading: "Item" },
  { field: "amount", heading: "Amount" },
  { field: "durationSeconds", heading: "Duration (seconds)" },
  { field: "isIncome", heading: "Type" },
  { field: "status", heading: "Status" },
  { field: "progress", heading: "Progress" },
  { field: "checklistItems", heading: "Checklist" },
  { field: "tags", heading: "Tags" },
  { field: "date", heading: "Date" },
  { field: "comment", heading: "Notes" },
  { field: "multiplier", heading: "Multiplier" },
  { field: "multiplierMode", heading: "Multiplier mode" },
  { field: "timerSettings", heading: "Timer" },
  { field: "sublistMode", heading: "Sublist mode" },
  { field: "subItems", heading: "Subitems" },
];

export const createItemTableColumns = (items: IItem[], existing: ItemTableColumn[] = []): ItemTableColumn[] => {
  const columns = [...existing];
  for (const { field, heading } of itemTableFields) {
    const populated =
      field === "title" ||
      items.some((item) => {
        const value = item[field];
        return hasValue(value) && (!Array.isArray(value) || value.length > 0);
      });
    if (populated && !columns.some((column) => column.field === field)) {
      columns.push({ id: `field:${field}`, field, heading });
    }
  }
  if (columns.length < 2) columns.push({ id: "field:comment", field: "comment", heading: "Notes" });
  return columns;
};

export const getItemTableValue = (item: IItem, column: ItemTableColumn, readable = false): string => {
  if (!column.field) return item.customValues?.[column.id] ?? "";
  const value = item[column.field];
  if (!hasValue(value)) return "";
  if (column.field === "isIncome") return value ? "Income" : "Expense";
  if (column.field === "date") {
    const date = new Date(value as Date);
    if (Number.isNaN(date.getTime())) return String(value);
    return readable
      ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : date.toISOString();
  }
  if (readable) {
    switch (column.field) {
      case "tags":
        return (
          item.tags
            ?.map((tag) => (typeof tag === "string" ? tag : (tag?.title ?? tag?.label ?? JSON.stringify(tag))))
            .join(", ") ?? ""
        );
      case "progress":
        return `${item.progress.current ?? 0} / ${item.progress.max ?? 0}${item.progress.type ? ` ${item.progress.type}` : ""}`;
      case "checklistItems":
        return formatChecklist(item);
      case "multiplier":
        return `${item.multiplier.baseAmount ?? 0} x ${item.multiplier.mod ?? 1}`;
      case "multiplierMode":
        return { none: "None", x: "Multiply", list: "Checklist total" }[String(value)] ?? String(value);
      case "sublistMode":
        return { none: "None", slider: "Progress", list: "Checklist" }[String(value)] ?? String(value);
      case "timerSettings": {
        const date = new Date(item.timerSettings.date);
        const label = item.timerSettings.isCompleted ? "Completed" : "Scheduled";
        return `${label}: ${Number.isNaN(date.getTime()) ? String(item.timerSettings.date) : date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
      }
      case "subItems":
        return (
          item.subItems
            ?.map((subitem) =>
              [
                subitem.title || "Untitled",
                subitem.status && `(${subitem.status})`,
                hasValue(subitem.amount) && `amount: ${subitem.amount}`,
                hasValue(subitem.durationSeconds) && `duration: ${subitem.durationSeconds}s`,
              ]
                .filter(Boolean)
                .join(" "),
            )
            .join("\n") ?? ""
        );
    }
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export const parseItemTableValue = (column: ItemTableColumn, text: string): Partial<IItem> => {
  const field = column.field;
  if (!field) return { customValues: { [column.id]: text } };
  if (text === "") return { [field]: undefined };
  if (field === "amount" || field === "durationSeconds") {
    const value = Number(text);
    if (!text.trim() || !Number.isFinite(value) || (field === "durationSeconds" && value < 0)) {
      throw new Error(`${column.heading} must be a valid ${field === "durationSeconds" ? "non-negative " : ""}number.`);
    }
    return { [field]: value };
  }
  if (field === "isIncome") {
    const value = text.trim().toLowerCase();
    if (!["income", "expense", "true", "false"].includes(value)) throw new Error("Type must be Income or Expense.");
    return { isIncome: value === "income" || value === "true" };
  }
  if (field === "date") {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) throw new Error("Date must be a valid date.");
    return { date };
  }
  if (["progress", "checklistItems", "tags", "multiplier", "timerSettings", "subItems"].includes(field)) {
    let value: any;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Error(`${column.heading} must be valid JSON.`);
    }
    const arrayField = ["checklistItems", "tags", "subItems"].includes(field);
    if (arrayField ? !Array.isArray(value) : !value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${column.heading} must be a JSON ${arrayField ? "array" : "object"}.`);
    }
    if (field === "checklistItems" && value.some((entry) => !entry || typeof entry.text !== "string")) {
      throw new Error("Checklist entries must contain text.");
    }
    return { [field]: value };
  }
  return { [field]: text };
};

export const applyItemTableValue = (item: IItem, column: ItemTableColumn, text: string): IItem => {
  const patch = parseItemTableValue(column, text);
  return column.field
    ? { ...item, ...patch }
    : { ...item, customValues: { ...item.customValues, ...patch.customValues } };
};
