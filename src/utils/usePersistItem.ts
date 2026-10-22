import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { db } from "../models/db";
import { IItem } from "../models/item";

export const getItemChanges = (previous: IItem, next: IItem): Partial<IItem> =>
  Object.fromEntries(
    [...new Set([...Object.keys(previous), ...Object.keys(next)])]
      .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]))
      .map((key) => [key, next[key]]),
  );

export const usePersistItem = (item: IItem, sourceItem?: IItem, setItem?: Dispatch<SetStateAction<IItem>>) => {
  const baseline = useRef(item);
  const latestItem = useRef(item);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const save = () => {
    const changes = getItemChanges(baseline.current, latestItem.current);
    if (Object.keys(changes).length && latestItem.current.id !== undefined) {
      baseline.current = latestItem.current;
      void db.items.update(latestItem.current.id, changes);
    }
    saveTimer.current = undefined;
  };

  useEffect(() => {
    latestItem.current = item;
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    if (Object.keys(getItemChanges(baseline.current, item)).length) saveTimer.current = setTimeout(save, 250);
  }, [item]);

  useEffect(() => {
    if (!sourceItem || !setItem) return;
    const localChanges = getItemChanges(baseline.current, latestItem.current);
    baseline.current = sourceItem;
    const nextItem = Object.keys(localChanges).length ? { ...sourceItem, ...localChanges } : sourceItem;
    latestItem.current = nextItem;
    setItem(nextItem);
  }, [sourceItem]);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        save();
      }
    },
    [],
  );
};
