export interface ICollection {
  id?: number;
  title: string;
  dateCreated?: Date;
  isTemplate?: boolean;
  archived?: boolean;
  comment?: string;
  collectionType: string;
  tag?: any;
  sorted: boolean;
  sections?: number[];
  _id?: string;
  allTags?: any[];
}
