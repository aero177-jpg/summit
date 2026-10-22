import type { ICollection } from "../../models/collection";
import type { IItem } from "../../models/item";
import type { ISection } from "../../models/section";

export interface LegacyChecklistEntry {
  text: string;
  checked?: boolean;
  amount?: number;
  createdAt?: string;
}

export type LegacyItem = Omit<IItem, "checklistItems"> & {
  checklistItems?: LegacyChecklistEntry[];
};

export type LegacySectionDocument = Omit<ISection, "id"> & {
  items: LegacyItem[];
};

export type LegacyCollectionDocument = Omit<ICollection, "id" | "sections"> & {
  sections: LegacySectionDocument[];
};

export interface LegacyTables {
  collections: ICollection[];
  sections: ISection[];
  items: LegacyItem[];
}

const budgetCollectionId = "legacy-collection-budget";
const generalCollectionId = "legacy-collection-general";
const quickCollectionId = "legacy-collection-quick";
const budgetSectionId = "legacy-section-budget";
const generalSectionId = "legacy-section-general";
const quickSectionId = "legacy-section-quick";

export function createLegacyTables(): LegacyTables {
  return {
    collections: [
      {
        id: 101,
        _id: budgetCollectionId,
        title: "Household budget",
        dateCreated: new Date("2024-01-05T10:00:00.000Z"),
        collectionType: "budget",
        comment: "Monthly plan",
        tag: { label: "green", value: "#52a56f" },
        sorted: true,
        archived: false,
        allTags: [{ title: "essential", color: "#eb5858" }],
      },
      {
        id: 102,
        _id: generalCollectionId,
        title: "Projects",
        dateCreated: new Date("2024-02-10T11:30:00.000Z"),
        collectionType: "general",
        sorted: false,
        archived: false,
        allTags: [{ title: "home", color: "#68a1d1" }],
      },
      {
        id: 103,
        _id: quickCollectionId,
        title: "Quick Collection",
        collectionType: "quick",
        sorted: false,
      },
    ],
    sections: [
      {
        id: 201,
        _id: budgetSectionId,
        collectionId: budgetCollectionId,
        title: "September",
        locked: 2_000,
        amount: 1_550,
        checkListMode: "none",
        customOrder: [301, 302],
        sortBy: "",
        showLockedAmount: true,
      },
      {
        id: 202,
        _id: generalSectionId,
        collectionId: generalCollectionId,
        title: "In progress",
        comment: "All current status values",
        commentVisible: true,
        checkListMode: "tag",
        numberedList: true,
        hideFinished: false,
        reverseOrder: false,
        customOrder: [303, 304, 305, 306, 307, 308],
        sortBy: "progress",
      },
      {
        id: 203,
        _id: quickSectionId,
        collectionId: quickCollectionId,
        title: "07.09.26 - general",
        createdAt: new Date("2026-09-07T08:00:00.000Z"),
        customOrder: [309],
      },
    ],
    items: [
      {
        id: 301,
        _id: "legacy-item-groceries",
        sectionId: budgetSectionId,
        collectionId: budgetCollectionId,
        title: "Groceries",
        amount: 150,
        multiplier: { baseAmount: 50, mod: 3 },
        multiplierMode: "list",
        isIncome: false,
        date: new Date("2024-09-01T12:00:00.000Z"),
        checklistItems: [
          { text: "Fruit", checked: true, amount: 20, createdAt: "2024-09-01" },
          { text: "Pantry", checked: false, amount: 30 },
        ],
      },
      {
        id: 302,
        _id: "legacy-item-salary",
        sectionId: budgetSectionId,
        collectionId: budgetCollectionId,
        title: "Salary",
        amount: 1_700,
        multiplier: { baseAmount: 850, mod: 2 },
        multiplierMode: "x",
        isIncome: true,
      },
      {
        id: 303,
        _id: "legacy-item-done",
        sectionId: generalSectionId,
        collectionId: generalCollectionId,
        title: "Finished task",
        status: "done",
        tags: [{ title: "home", color: "#68a1d1" }],
        checklistItems: [{ text: "Confirm result", checked: true, createdAt: "2024-02-12" }],
        progress: { max: 12, current: "12", type: "chapters" },
        sublistMode: "slider",
        timerSettings: { date: new Date("2024-02-12T09:00:00.000Z"), isCompleted: true },
      },
      {
        id: 304,
        _id: "legacy-item-active",
        sectionId: generalSectionId,
        collectionId: generalCollectionId,
        title: "Active task",
        status: "active",
      },
      {
        id: 305,
        _id: "legacy-item-started",
        sectionId: generalSectionId,
        collectionId: generalCollectionId,
        title: "Started task",
        status: "started",
      },
      {
        id: 306,
        _id: "legacy-item-paused",
        sectionId: generalSectionId,
        collectionId: generalCollectionId,
        title: "Paused task",
        status: "paused",
      },
      {
        id: 307,
        _id: "legacy-item-nah",
        sectionId: generalSectionId,
        collectionId: generalCollectionId,
        title: "Rejected task",
        status: "nah",
      },
      {
        id: 308,
        _id: "legacy-item-do-now",
        sectionId: generalSectionId,
        collectionId: generalCollectionId,
        title: "Urgent task",
        status: "do now!",
        timerSettings: { date: new Date("2026-09-07T09:00:00.000Z"), isCompleted: false },
      },
      {
        id: 309,
        _id: "legacy-item-quick",
        sectionId: quickSectionId,
        collectionId: quickCollectionId,
        title: "Quick reminder",
        status: "none",
        date: new Date("2026-09-07T08:05:00.000Z"),
      },
    ],
  };
}

export function createLegacyUploadDocuments(): LegacyCollectionDocument[] {
  const { collections, sections, items } = createLegacyTables();

  return collections.map((collection) => {
    const collectionDocument = { ...collection };
    delete collectionDocument.id;
    delete collectionDocument.sections;

    return {
      ...collectionDocument,
      sections: sections
        .filter((section) => section.collectionId === collection._id)
        .map((section) => {
          const sectionDocument = { ...section };
          delete sectionDocument.id;

          return {
            ...sectionDocument,
            items: items.filter((item) => item.sectionId === section._id).map((item) => ({ ...item })),
          };
        }),
    };
  });
}
