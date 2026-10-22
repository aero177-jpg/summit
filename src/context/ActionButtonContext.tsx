import React, { createContext, useState } from "react";

type ActionButtonContextValue = {
  actionBtnVisible: boolean;
  setActionBtnVisible: (actionBtnVisible: boolean) => void;
};

export const ActionButtonContext = createContext<ActionButtonContextValue>({
  actionBtnVisible: false,
  setActionBtnVisible: () => {},
});

export const ActionButtonProvider = ({ children }) => {
  const [actionBtnVisible, setActionBtnVisible] = useState(false);

  return (
    <ActionButtonContext.Provider
      value={{ actionBtnVisible, setActionBtnVisible }}
    >
      {children}
    </ActionButtonContext.Provider>
  );
};
