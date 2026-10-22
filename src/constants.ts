import { ISection } from "./models/section";
import { CheckIcon, ClockIcon, StatusIcon, TableIcon, WalletIcon } from "./components/customIcons";

export const newGeneralSection: ISection = {
  title: "",
  tag: { label: "", value: "#dbdbdb1f" },
  comment: "",
  numberedList: false,
  checkListMode: "none",
  sectionMode: "general",
};

export const statusOptions = [
  {
    label: "done",
    value: "#4f884f",
    darkModeColor: "#4f884f",
  },
  {
    label: "active",
    value: "#349d95",
    darkModeColor: "#349d95",
  },
  {
    label: "started",
    value: "#ddbd5e",
    darkModeColor: "#ddbd5e",
  },
  {
    label: "paused",
    value: "#866b8f",
    darkModeColor: "#866b8f",
  },
  {
    label: "nah",
    value: "var(--text-contrast)",
    darkModeColor: "#ababab",
  },
  { label: "do now!", value: "#d34e4e", darkModeColor: "#d34e4e" },
];

export const checkListModeOptions = ["none", "check", "tag"];

export const sectionModeOptions = [
  { label: "none", value: "none" },
  { label: "check", value: "check", icon: CheckIcon },
  { label: "status", value: "tag", icon: StatusIcon },
  { label: "budget", value: "budget", icon: WalletIcon },
  { label: "time", value: "time", icon: ClockIcon },
  { label: "table", value: "table", icon: TableIcon },
];

export enum variantEnum {
  BUDGET = "budget",
  GENERAL = "general",
  QUICK = "quick",
}
export interface ColorItem {
  color: string;
  value: number;
}
export const colorOptions = [
  { label: "red", value: "#eb5858" },
  { label: "green", value: "#52a56f" },
  { label: "yellow", value: "#e9e97a" },
  { label: "orange", value: "#f79643" },
  { label: "purple", value: "#8080c9" },
  { label: "blue", value: " #68a1d1" },
  { label: "teal", value: "#64c7a7" },
];

export const progressTypes = [
  { shorthand: "prt.", label: "parts", value: "#434343" },
  { shorthand: "ch.", label: "chapters", value: "#434344" },
  { shorthand: "lvl", label: "levels", value: "#434345" },
  { shorthand: "ep.", label: "episodes", value: "#434346" },
  { shorthand: "sn.", label: "seasons", value: "#434347" },
  // { shorthand: "%", label: "%", value: "#434348" },
];

export const sortByTypes = [
  { label: "-", value: "#434346" },
  { label: "progress", value: "#434343" },
  { label: "status", value: "#434344" },
  { label: "tag", value: "#434345" },
  // {  label: "seasons", value: "#434347" },
  // { shorthand: "%", label: "%", value: "#434348" },
];

export interface Progress {
  max: number;
  current: string;
  type: string;
}
