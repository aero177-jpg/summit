import React, { useEffect, useState } from "react";
import { Popover } from "react-tiny-popover";
import { Collapse } from "react-collapse";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Button, Chip } from "./Button";
import { useTheme } from "../App";

type IOption = {
  label: string;
  value: string;
  darkModeColor?: string;
  shorthand?: string;
  icon?: React.ComponentType<any>;
};

type DropdownProps = {
  data: any[];
  handleUpdate: (option: IOption, e?: any) => void;
  open: boolean;
  right?: boolean;
  initialItem?: any;
  useLabel?: boolean;
  allowOverflow?: boolean;
  headerSmall?: boolean;
  hideClickShield?: boolean;
  monochrome?: boolean;
  footer?: React.ReactNode;
  closeOnSelect?: boolean;
  labelMinWidth?: string;
  triggerVariant?: "chip" | "button";
  triggerColor?: string;
  colorTriggerStyle?: React.CSSProperties;
  popoverClassName?: string;
  secondaryData?: IOption[];
  handleSecondaryUpdate?: (option: IOption, e?: any) => void;
  secondaryInitialItem?: IOption;
};
const Dropdown = ({
  headerSmall = false,
  data,
  handleUpdate,
  open,
  right,
  allowOverflow = false,
  initialItem,
  useLabel,
  hideClickShield = false,
  monochrome = false,
  footer,
  closeOnSelect = true,
  labelMinWidth,
  triggerVariant = "chip",
  triggerColor = "gray",
  colorTriggerStyle,
  popoverClassName,
  secondaryData,
  handleSecondaryUpdate,
  secondaryInitialItem,
}: DropdownProps) => {
  const emptyItem: IOption = {
    label: "",
    value: "#dbdbdb1f",
  };
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItem] = useState(data);
  const [openInner, setOpenInner] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IOption>(emptyItem);
  const [selectedSecondaryItem, setSelectedSecondaryItem] = useState<IOption | undefined>(secondaryInitialItem);

  useEffect(() => {
    if (initialItem) {
      setSelectedItem(initialItem);
    }
  }, [initialItem]);
  useEffect(() => {
    setSelectedSecondaryItem(secondaryInitialItem);
  }, [secondaryInitialItem]);
  const { ref, inView, entry } = useInView({
    rootMargin: "0px 0px -230px 0px",
  });
  const { isDarkMode } = useTheme();

  const closeDropdown = () => {
    setOpenInner(false);
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };
  const toggleDropdown = () => {
    if (isOpen) {
      return closeDropdown();
    } else {
      setIsOpen(true);
      setTimeout(() => {
        setOpenInner(true);
      }, 10);
    }
  };

  const handleItemClick = (e, item) => {
    let itemToUpdate;
    if (selectedItem?.value == item.value) {
      itemToUpdate = emptyItem;
    } else {
      itemToUpdate = item;
    }
    setSelectedItem(itemToUpdate);
    handleUpdate(itemToUpdate, e);
    if (closeOnSelect) {
      closeDropdown();
    }
  };
  const handleSecondaryItemClick = (e, item) => {
    setSelectedSecondaryItem(item);
    handleSecondaryUpdate?.(item, e);
    if (closeOnSelect) {
      closeDropdown();
    }
  };
  const triggerLabel = (
    <>
      {selectedItem?.icon && <selectedItem.icon style={{ width: "0.8em", height: "0.8em", marginRight: "0.35em" }} />}
      {selectedItem?.label}
    </>
  );
  return (
    <div ref={ref}>
      <Popover
        isOpen={isOpen}
        positions={[inView || allowOverflow ? "bottom" : "top"]}
        containerStyle={{ zIndex: "110" }}
        containerClassName={popoverClassName}
        onClickOutside={() => closeDropdown()}
        content={
          <DropdownItems
            monochrome={monochrome}
            right={false}
            items={items}
            handleItemClick={handleItemClick}
            isOpen={openInner}
            useLabel={useLabel}
            selectedItem={selectedItem}
            footer={footer}
            secondaryItems={secondaryData}
            selectedSecondaryItem={selectedSecondaryItem}
            handleSecondaryItemClick={handleSecondaryItemClick}
          />
        }
      >
        <div
          className=" dropdown-header grid place-items-center"
          style={{
            minWidth: labelMinWidth ?? (headerSmall ? "2.5em" : "3rem"),
            minHeight: headerSmall ? "1.5em" : "1.2rem",
          }}
          onClick={() => toggleDropdown()}
        >
          {useLabel ? (
            triggerVariant === "button" ? (
              <Button
                type="button"
                color={monochrome ? "#c1c1c1" : triggerColor}
                colorDarkMode={isDarkMode ? "var(--sectionheader-text)" : undefined}
                style={{
                  minWidth: labelMinWidth ?? "3.7rem",
                  padding: "0 6px",
                  display: "flex",
                  whiteSpace: "nowrap",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                {triggerLabel}
              </Button>
            ) : (
              <Chip
                style={{ color: "var(--sectionheader-text)" }}
                color={monochrome ? "#c1c1c1" : selectedItem?.value}
                darkModeAccent={monochrome ? undefined : selectedItem?.darkModeColor}
                darkModeTextColor="var(--sectionheader-text)"
                minWidth={labelMinWidth}
              >
                {triggerLabel}
              </Chip>
            )
          ) : (
            <div
              className={`dropdown-item-dot ${selectedItem && "selected"}`}
              style={{ background: selectedItem?.value, ...colorTriggerStyle }}
            >
              {/* <i className={`fa fa-chevron-right icon ${isOpen && "open"}`}></i> */}
            </div>
          )}
        </div>
      </Popover>
      {isOpen && hideClickShield == false && (
        <div className="absolute bg-transparent z-10" style={{ width: "70px", height: "400px", top: "0px" }}></div>
      )}
    </div>
  );
};

type DropdownItemsProps = {
  items: any[];
  handleItemClick: (e, item) => void;
  isOpen: boolean;
  useLabel?: boolean;
  selectedItem: any;
  right?: boolean;
  ref?: any;
  monochrome?: boolean;
  footer?: React.ReactNode;
  secondaryItems?: IOption[];
  selectedSecondaryItem?: IOption;
  handleSecondaryItemClick?: (e, item: IOption) => void;
};
const DropdownItems = ({
  items,
  handleItemClick,
  isOpen,
  useLabel,
  selectedItem,
  right,
  ref,
  monochrome = false,
  footer,
  secondaryItems,
  selectedSecondaryItem,
  handleSecondaryItemClick,
}: DropdownItemsProps) => {
  const { theme, isDarkMode } = useTheme();
  // useEffect(() => {
  //   console.log("theme", theme);
  // }, [theme]);
  return (
    <>
      {right ? (
        <div
          ref={ref}
          className="dropdownRight flex"
          // style={{ height: "33px" }}
        >
          <div className={`dropdown-body right `} data-theme={theme}>
            <div
              className="flex"
              style={{
                transition: ".3s all ease-in-out",
                width: `${isOpen ? `${items.length * 38}px` : "0px"}`,
                // height: "25px",
                // background: "red",
              }}
            >
              {items &&
                items.map((item, i) => (
                  <div
                    key={i}
                    className={`dropdown-item right grid place-items-center ${
                      item.value == selectedItem?.value && "selected"
                    }`}
                    onClick={(e) => handleItemClick(e, item)}
                    id={item.value}
                  >
                    <div
                      style={{
                        background: item.value,
                        width: "1.6em",
                        transition: `.3s all ease-in-out ${100 + i * 50}ms`,
                      }}
                      className={`dropdown-item-dot ${isOpen ? "fadeIn" : "close"}`}
                    ></div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={`dropdown-body ${isDarkMode ? "dark" : ""} `} data-theme={theme}>
          <Collapse isOpened={isOpen}>
            {items.map((item, i) => (
              <div
                key={i}
                className={`dropdown-item grid ${!useLabel && "place-items-center align-middle"} ${
                  useLabel && item.value == selectedItem.value && !isDarkMode && "selected"
                }`}
                onClick={(e) => handleItemClick(e, item)}
                id={item.value}
                style={!useLabel ? { width: "4rem", margin: "0 auto", padding: "5px 4px" } : undefined}
              >
                {useLabel ? (
                  <Chip
                    style={{
                      boxShadow: item.value == selectedItem.value && "var(--dropdown-selected-glow, #b4b4b9 0px 0px 3px 0px)",
                    }}
                    color={monochrome ? "#c1c1c1" : item.label == "nah" && isDarkMode ? "#ababab" : item.value}
                    darkModeAccent={monochrome ? undefined : item.darkModeColor}
                    darkModeTextColor={
                      item.value == selectedItem.value
                        ? "var(--sectionheader-text)"
                        : "var(--dropdown-muted-text, #c2c7ca99)"
                    }
                    i={i}
                    isOpen={isOpen}
                    animated={true}
                  >
                    {item.icon && <item.icon style={{ width: "0.8em", height: "0.8em", marginRight: "0.35em" }} />}
                    {item.label}
                  </Chip>
                ) : (
                  <div
                    style={{
                      background: item.value,
                      transition: `.3s all ease-in-out ${100 + i * 50}ms`,
                    }}
                    className={`dropdown-item-dot ${isOpen ? "open" : "close"}`}
                  />
                )}
              </div>
            ))}
            {footer && (
              <div style={{ borderTop: "1px solid #ffffff26", marginTop: "2px", paddingTop: "2px" }}>{footer}</div>
            )}
            {secondaryItems && (
              <motion.div
                initial="hidden"
                animate={isOpen ? "visible" : "hidden"}
                variants={{
                  hidden: {},
                  visible: { transition: { delayChildren: 0.3, staggerChildren: 0.04 } },
                }}
                style={{ borderTop: "1px solid #ffffff26", marginTop: "2px", padding: "4px" }}
              >
                {secondaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="dropdown-item grid"
                    onClick={(e) => handleSecondaryItemClick?.(e, item)}
                  >
                    <motion.div
                      variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { duration: 0.1 } },
                      }}
                    >
                      <Chip
                        style={{
                          backgroundImage: item.value,
                          boxShadow: item.value === selectedSecondaryItem?.value && "var(--dropdown-selected-glow, #b4b4b9 0px 0px 3px 0px)",
                          opacity: item.value === selectedSecondaryItem?.value ? 1 : 0.8,
                        }}
                        color={item.value}
                        darkModeTextColor={
                          item.value === selectedSecondaryItem?.value
                            ? "var(--sectionheader-text)"
                            : "var(--dropdown-muted-text, #c2c7ca99)"
                        }
                      >
                        {item.label}
                      </Chip>
                    </motion.div>
                  </div>
                ))}
              </motion.div>
            )}
          </Collapse>
        </div>
      )}
    </>
  );
};

export default Dropdown;
