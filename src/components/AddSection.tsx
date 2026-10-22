import * as React from "react";
import { useContext, useState } from "react";
import {
  ArrowIcon,
  BulletListIcon,
  CalendarIcon,
  ChevronIcon,
  CommentIcon,
  NumberListIcon,
  PlusIcon,
  WalletIcon,
  XMarkIcon,
} from "./customIcons";
import { ActionButtonContext } from "../context/ActionButtonContext";
import { colorOptions, sectionModeOptions } from "../constants";
import { collectionTypeOptions } from "./CollectionList";
import Dropdown from "./Dropdown";
import TextareaAutoResize from "react-textarea-autosize";
import ExpandableText from "./ExpandableText";
import { Button } from "./Button";

export const AddSection: React.FC<{
  saveCB: any;
  variant?: string;
  newSection?: any;
  placeholder?: string;
}> = ({ saveCB, variant, newSection, placeholder = "" }) => {
  const [section, setSection] = useState(newSection);
  const saveChange = (e) => {
    e.preventDefault();
    saveCB(section);
    setSection(newSection);
  };
  const handleModeChange = (e, options, key) => {
    e.preventDefault();
    const currentIndex = section !== null && key in section ? options.indexOf(section[key] ?? 0) : 0;
    const nextIndex = (currentIndex + 1) % options.length;
    const nextOption = options[nextIndex];
    setSection({ ...section, [key]: nextOption });
  };

  const handleUpdateSection = (key: string, value: any, e) => {
    e.preventDefault();
    setSection({ ...section, [key]: value });
  };
  const handleSectionModeChange = (option, e) => {
    e.preventDefault();
    if (!option.label) return;
    if (["budget", "time", "table"].includes(option.value)) {
      setSection({ ...section, sectionMode: option.value });
      return;
    }
    setSection({ ...section, sectionMode: "general", checkListMode: option.value });
  };

  const saveOnEnter = (e) => {
    if (e.key === "Enter") {
      saveChange(e);
    }
    return;
  };

  return (
    <div className="addSectionInputs">
      {/* Not a <form>: Chrome treats a lone text field in a form as a login form and offers password/card autofill */}
      <div className="itemContainer newItem inputWhite mt-3 flex p-1">
        <input
          className=" itemTitleContainer"
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          autoFocus={true}
          value={section?.title ?? ""}
          onChange={(e) => setSection({ ...section, title: e.target.value })}
          onKeyDown={saveOnEnter}
          placeholder={placeholder}
        />
        <div className="h-full flex items-center mx-1">
          <Dropdown
            data={colorOptions}
            allowOverflow={true}
            handleUpdate={(value, e) => handleUpdateSection("tag", value, e)}
            open={!open}
            initialItem={section?.tag ?? null}
          />
        </div>

        <button
          onClick={saveChange}
          value=""
          className={` submitArrow ${section?.title && "valid"}`}
          style={{
            padding: "0px 0.5em",
            margin: "2px 4px",
            borderRadius: "6px",
          }}
        >
          <ArrowIcon />
        </button>
      </div>

      <div className="flex justify-between mt-2" style={{ gap: "3px" }}>
        <div className="w-3/4">
          <ExpandableText
            autofocus={false}
            text={section?.comment}
            open={true}
            showSubmit={false}
            updateText={(text) => setSection({ ...section, comment: text, commentVisible: true })}
          />
        </div>
        <div style={{ marginTop: "1px", maxHeight: "33px" }} className="flex gap-1">
          {variant !== "collection" && (
            <Dropdown
              data={sectionModeOptions}
              handleUpdate={handleSectionModeChange}
              open={false}
              useLabel={true}
              triggerVariant="button"
              hideClickShield={true}
              closeOnSelect={false}
              labelMinWidth="85px"
              initialItem={sectionModeOptions.find(
                (option) =>
                  option.value ===
                  (["budget", "time", "table"].includes(section?.sectionMode)
                    ? section.sectionMode
                    : (section?.checkListMode ?? "none")),
              )}
              footer={
                section?.sectionMode !== "budget" && (
                  <div className="dropdown-item grid">
                    <div
                      className="dropdown-item-label"
                      onClick={() => setSection({ ...section, numberedList: !section?.numberedList })}
                      style={{
                        boxShadow: section?.numberedList ? "#b4b4b9 0px 0px 3px 0px" : "",
                        opacity: section?.numberedList ? 1 : 0.5,
                      }}
                    >
                      <NumberListIcon style={{ width: "0.8em", height: "0.8em", marginRight: "0.35em" }} />
                      list
                    </div>
                  </div>
                )
              }
            />
          )}
          {variant == "collection" && (
            <>
              <Button
                onClick={(e) => handleModeChange(e, collectionTypeOptions, "collectionType")}
                color={`${
                  section?.collectionType == "general"
                    ? "#5086ad"
                    : section?.collectionType == "budget"
                      ? "#6f877b"
                      : "#5086ad"
                }`}
                colorDarkMode={`${
                  section?.collectionType == "general"
                    ? "#5f93b9"
                    : section?.collectionType == "budget"
                      ? "#7ea592"
                      : "#5086ad"
                }`}
                style={{
                  display: "flex",
                  padding: "0.1em 0.6em",
                  minWidth: "5.1rem",
                  boxShadow: "black 1px 2px 7px -5px",
                }}
                className="rounded-md gap-1 items-center"
              >
                {section?.collectionType == "budget" ? (
                  <WalletIcon style={{ width: ".8em" }} />
                ) : (
                  <BulletListIcon style={{ width: ".8em" }} />
                )}
                {section?.collectionType ?? "general"}
              </Button>
              {/* <button
                onClick={(e) =>
                  handleModeChange(e, collectionTypeOptions, "collectionType")
                }
                style={{
                  background: `${
                    section?.collectionType == "general"
                      ? "#5086ad"
                      : section?.collectionType == "budget"
                      ? "#6f877b"
                      : "#5086ad"
                  }`,
                  padding: "0.1em 0.35em",
                  width: "5.1rem",
                  boxShadow: "black 1px 2px 6px -3px",
                }}
                className="rounded-md"
              >
                {section?.collectionType ?? "general"}
              </button>{" "} */}
            </>
          )}
          <button style={{ height: "0px", width: "0px" }} onClick={(e) => e.preventDefault()}></button>
        </div>
      </div>
      {/* <div style={{ height: ".4em" }}></div> */}
    </div>
  );
};
