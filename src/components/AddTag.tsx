import React, { useEffect, useState } from "react";
import Dropdown from "./Dropdown";
import { db } from "../models/db";
import { ArrowIcon, ChevronIcon } from "./customIcons";
import { useAutoAnimate } from "@formkit/auto-animate/react";

export const colorOptionsTag = [
  { label: "red", value: "#eb5858" },
  { label: "green", value: "#52a56f" },
  { label: "orange", value: "#e5934c" },
  { label: "purple", value: "#8080c9" },
  { label: "blue", value: " #68a1d1" },
  { label: "teal", value: "#63b7a8" },
  { label: "black", value: "#282727" },
];

const ItemTags = ({ itemTags, updateItemTags, updateItemStatus }) => {
  const [newTag, setNewTag] = useState({ title: "", color: "gray" });
  const [allTags, setAllTags] = useState([]);
  const [showInput, setShowInput] = useState(allTags?.length > 0 ? false : true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [parent, enableAnimations] = useAutoAnimate();
  const currentCollection = JSON.parse(localStorage.getItem("currentCollection"));
  const defaultTags = [
    { title: "active", color: "teal" },
    { title: "do now!", color: "red" },
    { title: "done", color: "green" },
  ];
  useEffect(() => {
    db.collections.get(Number(currentCollection)).then(function (collection) {
      setAllTags(collection?.allTags || []);
    });
  }, []);

  const updateAllTags = (allTags) => {
    db.collections.update(Number(currentCollection), {
      allTags: allTags,
    });
  };

  const addNewTag = (e) => {
    e.preventDefault();
    if (newTag.title !== "") {
      const updatedTags = [...allTags, newTag];
      setAllTags(updatedTags);
      updateAllTags(updatedTags);
      addTag(newTag);
      setNewTag({ title: "", color: "gray" });
      setShowInput(false);
    }
  };

  const toggleTag = (tag) => {
    if (isInItemTags(tag.title)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  };
  const removeTag = (tagToRemove) => {
    const updatedTags = itemTags.filter((tag) => tag.title !== tagToRemove.title);
    updateItemTags(updatedTags);
  };

  const addTag = (tagToAdd) => {
    setRefreshKey(refreshKey + 1);
    const updatedTags = [...itemTags, tagToAdd];
    updateItemTags(updatedTags);
  };

  const isInItemTags = (title) => {
    return itemTags.some((tag) => tag.title === title);
  };
  const isDisabled = !newTag.title || allTags.some((tag) => tag.title === newTag.title);

  const toggleDefaultTag = (tag) => {
    if (isInItemTags(tag.title)) {
      removeTag(tag);
      updateItemStatus("none");
    } else {
      setRefreshKey(refreshKey + 1);
      updateItemTags(
        itemTags.filter((tag) => !defaultTags.some((defaultTag) => defaultTag.title === tag.title)).concat(tag),
      );
      updateItemStatus(tag.title);
    }
  };

  return (
    <div
      ref={parent}
      style={{ gap: ".4em", marginLeft: "2px", marginBottom: ".3em" }}
      className="flex flex-wrap items-center w-full "
    >
      <form
        onSubmit={(e) => addNewTag(e)}
        style={{
          padding: ".1em .4em",
          height: "2.2em",
          // maxHeight: "3em",
          maxWidth: "14em",
          marginLeft: "-0.2px",
          // margin: "0.3em",
        }}
        className="itemCommentInput itemCreationInput flex items-center"
      >
        <div className="flex-auto">
          <input
            style={{ width: "calc(100% - 8px)" }}
            // onKeyDown={(e) => handleEnter(e, handleAddItem)}
            className="bg-transparent outline-none "
            autoFocus={allTags.length > 0 ? false : true}
            placeholder="Add tag..."
            type="text"
            onSubmit={() => {}}
            value={newTag.title}
            onChange={(e) => setNewTag({ ...newTag, title: e.target.value })}
          />
        </div>
        <div className="grid place-items-center transition-all" style={{ width: "3rem" }}>
          <div key={refreshKey}>
            <Dropdown
              headerSmall={true}
              data={colorOptionsTag}
              allowOverflow={true}
              handleUpdate={(value, e) =>
                setNewTag({
                  ...newTag,
                  color: value.label.length ? value.label : "gray",
                })
              }
              open={!open}
              initialItem={null}
            />
          </div>
        </div>
        <button
          // onClick={() => addNewTag()}
          disabled={isDisabled}
          type="submit"
          value=""
          className={` submitArrow ${!isDisabled && "valid"}`}
          style={{
            padding: "3px 0.4em",
            marginLeft: "8px",
            borderRadius: "6px",
          }}
        >
          <ArrowIcon />
        </button>
      </form>

      {defaultTags.map((tag, i) => (
        <div>
          <div
            key={i}
            onClick={() => toggleDefaultTag(tag)}
            className={`px-3 largeTag rounded-md text-xs font-semibold ${
              isInItemTags(tag.title) ? "opacity-100" : "opacity-50"
            } ${tag.color}tag`}
          >
            {tag.title}
          </div>
        </div>
      ))}
      {allTags.map((tag, i) => (
        <div>
          <div
            key={i}
            onClick={() => toggleTag(tag)}
            className={`px-3 largeTag rounded-md text-xs font-semibold ${
              isInItemTags(tag.title) ? "opacity-100" : "opacity-50"
            } ${tag.color}tag`}
          >
            {tag.title}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemTags;
