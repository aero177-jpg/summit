import { AnimatePresence, motion } from "framer-motion";
import { GeneralItem } from "./GeneralItem";
import { useEffect, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { IItem } from "../models/item";
import { LightningIcon, WalletIcon } from "./customIcons";
import { db } from "../models/db";
import { BudgetItem } from "./BudgetItem";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { AnimateChangeInHeight } from "./AnimateChangeInHeight";

interface IItemLinkDropdownProps {
  data: IItem[];
  openItemsList: boolean;
  handleCloseList: () => void;
  status?: string;
}
const ItemLinkDropdown: React.FC<IItemLinkDropdownProps> = ({
  data,
  openItemsList,
  handleCloseList,
  status,
}) => {
  const [sectionsWithItems, setSectionsWithItems] = useState([]);
  const [expandItemClick, setExpandItemClick] = useState(null);
  const [openedItem, setOpenedItem] = useState<number>(null);
  const navigate = useNavigate();
  const expandClick = (key) => {
    if (key === openedItem) {
      return setOpenedItem(null);
    }
    setOpenedItem(key);
  };
  const [parent, enableAnimations] = useAutoAnimate({
    duration: 150,
    easing: "ease-in-out",
  });

  useEffect(() => {
    const uniqueSectionIds = [...new Set(data.map((item) => item.sectionId))];

    const fetchSection = async (sectionId) => {
      const section = await db.sections.where("_id").equals(sectionId).first();
      if (!section) {
        throw new Error(`Section not found for id: ${sectionId}`);
      }
      return section;
    };

    const fetchData = async () => {
      const sectionsWithItems = await Promise.all(
        uniqueSectionIds.map(async (sectionId) => {
          const section = await fetchSection(sectionId);
          const items = data.filter((item) => item.sectionId === sectionId);
          return { sectionId, section, items };
        })
      );
      setSectionsWithItems(sectionsWithItems);
    };
    if (openItemsList) fetchData();
  }, [data]);

  const handleChangeRoute = async (collectionId) => {
    const collection = await db.collections
      .where("_id")
      .equals(collectionId)
      .first();
    navigate(`/collection/${collection.id}`);
  };
  return (
    <>
      <div
        // style={{
        //   background: `${status == "active" ? "#a2c3c09c" : "#e5bfbfb0"}`,
        // }}
        style={{ marginTop: "-10px" }}
        className={` sectionDropdown ${
          openItemsList === false ? "squeezeAnimationClose" : ""
        }`}
      >
        <AnimatePresence mode="wait">
          {openItemsList && sectionsWithItems.length > 0 && (
            <AnimateChangeInHeight>
              <div className="h-2" />
              <div>
                <div
                  className=" px-2 mb-3 "
                  style={{
                    paddingTop: "2px",
                    maxHeight: "400px",
                    overflowY: `${true ? "auto" : "hidden"}`,
                    overflowX: "hidden",
                  }}
                >
                  <div ref={parent}>
                    {sectionsWithItems &&
                      sectionsWithItems.map((section, i) => (
                        <div key={i}>
                          <fieldset className="fieldset">
                            <legend
                              className="fieldsetlegend"
                              onClick={() =>
                                handleChangeRoute(section.section.collectionId)
                              }
                            >
                              {section.section.title}
                            </legend>
                            {section.items.map((item, j) => (
                              <div key={j}>
                                {item.amount != null ? (
                                  <BudgetItem
                                    key={item.id}
                                    _item={item}
                                    expandClick={expandClick}
                                    isOpened={item.id === openedItem}
                                  />
                                ) : (
                                  <GeneralItem
                                    key={item.id}
                                    _item={item}
                                    expandClick={expandClick}
                                    isOpened={item.id === openedItem}
                                    checklistMode={"tag"}
                                  />
                                )}
                              </div>
                            ))}
                          </fieldset>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </AnimateChangeInHeight>
            // </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const ActiveItemsToggle = ({
  style,
  status,
  onClick,
  itemsLength,
  disabled,
  className,
}) => {
  return (
    <>
      {itemsLength > 0 && (
        <Button
          disabled={disabled}
          onClick={onClick}
          className={`${className} hasAccent activeItemsAlert px-2 text-sm`}
          color={`${status == "active" ? "#349d95" : "#e74c4c"}`}
          style={{ ...style, gridAutoFlow: "column" }}
          // style={{
          //   ...style,
          //   background: `${status == "active" ? "#349d95" : "#e74c4c"}`,
          //   gridAutoFlow: "column",
          //   width: "auto",
          //   padding: "4px 8px",
          // }}
        >
          <b className="mr-1">{itemsLength}</b> <div>{status}</div>
        </Button>
      )}
    </>
  );
};

export const QuickItemsToggle = ({
  style,
  onClick,
  itemsLength,
  disabled,
  className,
}) => {
  return (
    <>
      <button
        disabled={disabled}
        onClick={onClick}
        className={`dropdown-item-label smallButton ${className}`}
        style={{
          ...style,
          // background: "#495463",
          gridAutoFlow: "column",
          width: "auto",
          minWidth: "40px",
          minHeight: "32px",
          padding: "4px 8px",
          // height: "100%",
        }}
      >
        {itemsLength > 0 && <b className="mr-2">{itemsLength}</b>}
        <LightningIcon />
      </button>
    </>
  );
};
export default ItemLinkDropdown;
