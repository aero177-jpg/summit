import { useState, useEffect } from "react";
import { LongPressCallbackReason, LongPressEventType, useLongPress } from "use-long-press";

const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    let currentValue;

    try {
      currentValue = JSON.parse(localStorage.getItem(key) || String(defaultValue));
    } catch (error) {
      currentValue = defaultValue;
    }

    return currentValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value, key]);

  return [value, setValue];
};

export const handleEnter = (e, toggleThing) => {
  if (e.key === "Enter") {
    e.preventDefault();
    toggleThing();
  }
};
export const longPressOptions = (onCancel) => ({
  onCancel: (event, { reason }) =>
    reason !== LongPressCallbackReason.CancelledByMovement &&
    reason !== LongPressCallbackReason.CancelledOutsideElement &&
    onCancel(),
  threshold: 500,
  detect: LongPressEventType.Pointer,
  cancelOnMovement: true,
});

export const calculateRoundedValue = (value) => {
  if (value - Math.floor(value) > 0.8) {
    return Math.ceil(value);
  } else return Math.floor(value);
};

export const displayCalculatedValue = (value, maxValue) => {
  if (value == maxValue || value == 0) {
    return value;
  }

  return Math.min(maxValue, value - Math.floor(value) > 0.8 ? Math.ceil(value) + 1 : Math.floor(value) + 1);
};

export default useLocalStorage;
