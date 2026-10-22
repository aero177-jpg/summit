import { AnimatePresence, animate, motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import PortalModal from "../PortalModal";
import Dropdown from "../Dropdown";
import { Progress, progressTypes } from "../../constants";
import { calculateRoundedValue, displayCalculatedValue } from "../../actions";
import { Button } from "../Button";
import { CheckIcon, EditIcon, ExpandIcon, PlusIcon } from "../customIcons";
import { useTheme } from "../../App";

const ProgressSliderBar = ({
  mini,
  handleOpenModal,
  openModal,
  itemProgress,
  updateItem,
  itemStatus,
}: {
  mini?: boolean;
  handleOpenModal?: () => void;
  openModal: boolean;
  itemProgress?: Progress;
  updateItem?: (key: string, item: Progress | string) => void;
  itemStatus?: string;
}) => {
  const maxValue = Number(itemProgress?.max || 4);
  const [counterValue, setCounterValue] = useState(itemProgress?.current || "0");
  const { isDarkMode } = useTheme();
  useEffect(() => {
    setCounterValue(itemProgress?.current || "0");
  }, [itemProgress?.current]);

  const getBoundedValue = (value) => {
    if (value > maxValue) {
      return maxValue.toString();
    }
    return value;
  };

  const handleUpdateValue = (value) => {
    value = getBoundedValue(value);
    setCounterValue(value);
    updateItem("progress", { ...itemProgress, current: value });
  };

  const handlePreviewValue = (value) => {
    setCounterValue(getBoundedValue(value));
  };

  const generateDots = (maxCount, currentValue) => {
    let dots = [];

    if (maxCount > 20 || maxValue < 2) {
      return dots;
    }

    for (let i = 0; i < maxCount + 1; i++) {
      dots.push(
        <div
          key={i}
          style={{
            scale: mini ? "0.5" : "0.7",
            transition: "all 0.1s ease-in-out",
            transform: `translateY(${i == calculateRoundedValue(currentValue) && currentValue != 0 ? "-0px" : "5px"})`,
          }}
          className={`w-2 h-2  rounded-full ${
            i >= currentValue + 0.2 || currentValue == 0
              ? "rangeDots"
              : i == maxCount
                ? "bg-green-400 rangeDotGlow"
                : "bg-red-400"
          }`}
        ></div>,
      );
    }
    return dots;
  };

  const getBackgroundSize = (value, max) => {
    return { backgroundSize: `${(value * 100) / max}% 100%` };
  };
  const dots = useMemo(() => {
    return generateDots(maxValue, Number(counterValue));
  }, [maxValue, counterValue]);
  return (
    <div
      className="w-full"
      style={{
        transition: "opacity 0.1s ease-in-out",
        opacity: (mini && !openModal) || (!mini && openModal) ? "1" : "0",
      }}
    >
      {!mini && (
        <div
          className={`text-xl mb-4 basicInput w-fit mx-auto ${!isDarkMode ? "range-title-light" : ""}`}
          style={{
            padding: ".2em 1em",
            opacity: itemProgress?.max > 0 ? 1 : 0,
          }}
          //   animate={{ y: dragging && percent < 0.15 ? 20 : 0 }}
        >
          {progressTypes.find((option) => option.shorthand === itemProgress?.type)?.label.slice(0, -1)}{" "}
          {displayCalculatedValue(counterValue, itemProgress?.max)} of {itemProgress?.max}
          {/* {maxValue ?? 0} */}
          {/* {counterValue} */}
          {/* {Math.floor(value * 100) / 100} */}
        </div>
      )}
      <div className="w-full flex justify-between" style={{ top: "-8px" }}>
        {dots}
      </div>
      <input
        type="range"
        min={"0"}
        max={maxValue.toString()}
        onChange={(e) => handlePreviewValue(e.target.value)}
        onPointerUp={(e) => handleUpdateValue(e.currentTarget.value)}
        onKeyUp={(e) => handleUpdateValue(e.currentTarget.value)}
        onBlur={(e) => handleUpdateValue(e.currentTarget.value)}
        step={"0.01"}
        style={getBackgroundSize(counterValue, maxValue)}
        value={counterValue}
      />
      {mini && (
        <div className="flex gap-1" style={{ height: "25px" }}>
          <Button color="#617385" onClick={() => handleUpdateValue((Number(counterValue) + 1).toString())}>
            <PlusIcon style={{ width: ".8em", height: ".8em" }} />
          </Button>
          <Button onClick={() => handleOpenModal()} color="#617385">
            <ExpandIcon style={{ width: ".9em", scale: "0.9" }} />
          </Button>
          <AnimatePresence>
            {itemProgress?.current == itemProgress?.max.toString() && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button
                  onClick={() => updateItem("status", itemStatus == "done" ? "none" : "done")}
                  color={itemStatus == "done" ? "#509c7c" : "#617385"}
                >
                  <CheckIcon style={{ width: ".9em", scale: "0.9" }} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const ProgressSliderControl = ({ itemProgress, updateItem, itemStatus }) => {
  const [openModal, setOpenModal] = useState(false);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (!itemProgress?.max) {
      updateItem("progress", { ...itemProgress, max: 4 });
    }
  }, []);
  return (
    <>
      <div className="flex flex-1">
        <ProgressSliderBar
          mini={true}
          handleOpenModal={() => setOpenModal(true)}
          openModal={openModal}
          itemProgress={itemProgress}
          updateItem={updateItem}
          itemStatus={itemStatus}
        />{" "}
      </div>
      <PortalModal showModal={openModal} handleCloseCB={() => setOpenModal(false)}>
        <div className="px-6 pt-2">
          <ProgressSliderBar openModal={openModal} itemProgress={itemProgress} updateItem={updateItem} />
          <div className=" flex  mt-2 justify-end w-full">
            <div className="flex-grow" />
            <div
              className="progressSettings flex items-center py-2 px-3 gap-1 rounded-md"
              style={{
                background: isDarkMode ? "var(--item-bg-active)" : "transparent",
              }}
            >
              <input
                min={"0"}
                className={"basicInput"}
                style={{
                  padding: "0 0.4em",
                  borderRadius: "6px",
                  width: "3em",
                  background: isDarkMode ? "var(--sectionheader-bg)" : undefined,
                }}
                type="number"
                value={itemProgress?.max}
                placeholder=""
                onChange={(e) =>
                  updateItem("progress", {
                    ...itemProgress,
                    max: e.target.value,
                  })
                }
              />
              <Dropdown
                data={progressTypes}
                triggerVariant="button"
                popoverClassName="neutralOptionsPopover"
                handleUpdate={(e) => updateItem("progress", { ...itemProgress, type: e.shorthand })}
                monochrome={isDarkMode}
                open={true}
                useLabel={true}
                initialItem={
                  progressTypes.find((option) => option.shorthand === itemProgress?.type) ?? progressTypes[0]
                }
              />
            </div>
          </div>
        </div>
      </PortalModal>
    </>
  );
};
export default ProgressSliderControl;
