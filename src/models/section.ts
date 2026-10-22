export type SectionMode = "general" | "budget" | "time" | "table";

export type TableField =
  | "title"
  | "amount"
  | "durationSeconds"
  | "isIncome"
  | "status"
  | "progress"
  | "checklistItems"
  | "tags"
  | "date"
  | "comment"
  | "multiplier"
  | "multiplierMode"
  | "timerSettings"
  | "sublistMode"
  | "subItems";

export type ItemTableColumn = {
  id: string;
  heading: string;
  field?: TableField;
  hidden?: boolean;
  width?: number;
};

export interface ISection {
  id?: number;
  title?: string;
  collectionId?: string;
  locked?: number;
  comment?: string;
  commentVisible?: boolean;
  amount?: number;
  tag?: any;
  numberedList?: boolean;
  checkListMode?: string;
  sectionMode?: SectionMode;
  tableData?: string[][];
  dataVersion?: number;
  tableColumns?: ItemTableColumn[];
  tableColumnWidths?: number[];
  tableHeaderVisible?: boolean;
  _id?: string;
  archived?: boolean;
  hideFinished?: boolean;
  showLockedAmount?: boolean;
  reverseOrder?: boolean;
  customOrder?: number[];
  sortBy?: string;
  createdAt?: Date;
}
