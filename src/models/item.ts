import { Progress } from "../constants";

export interface IItem {
  id?: number;
  _id?: string;
  sectionId: string;
  collectionId?: string;
  title?: string;
  amount?: number;
  durationSeconds?: number;
  customValues?: Record<string, string>;
  multiplier?: any;
  date?: Date;
  comment?: string;
  commentVisible?: boolean;
  multiplierMode?: string;
  isIncome?: boolean;
  subItems?: IItem[];
  status?: string;
  checklistItems?: { text: string; checked?: boolean; amount?: number }[];
  timerSettings?: { date: Date; isCompleted: boolean };
  tags?: any[];
  progress?: Progress;
  sublistMode?: string;
}
