import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBorderAll, faCopy, faArrowPointer } from "@fortawesome/free-solid-svg-icons";
import { ISection } from "../models/section";
import { IItem } from "../models/item";
import { db } from "../models/db";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { createItemTableColumns, getItemTableValue } from "../domain/tableConversion";
import { saveTableCells } from "../domain/tableItems";
import { formatDuration } from "./DurationInput";
import { CheckIcon, EyeIcon, EyeSlashIcon, GearIcon, PlusIcon, TrashIcon } from "./customIcons";
import { EditIcon } from "./customIcons";
import LinkText from "./LinkText";
import LinkTextEditor from "./LazyLinkTextEditor";
import { readLinkText } from "../utils/linkText";
import { Button } from "./Button";

type TableSectionProps = {
  section: ISection;
  items: IItem[];
  setUpdatedSection: (section: ISection) => void;
};

type TableCell = { rowIndex: number; columnIndex: number };
const cellKey = (rowIndex: number, columnIndex: number) => `${rowIndex}:${columnIndex}`;

export const TableSection: React.FC<TableSectionProps> = ({ section, items, setUpdatedSection }) => {
  const [settingsMode, setSettingsMode] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectionAnchor = useRef<TableCell | null>(null);
  const dragSelection = useRef<{ start: TableCell; base: Set<string> } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnIndex: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const allColumns = createItemTableColumns(items, section.tableColumns);
  const columns = allColumns.filter((column) => settingsMode || !column.hidden);
  const grid = [
    columns.map((column) => column.heading),
    ...items.map((item) => columns.map((column) => getItemTableValue(item, column))),
  ];
  const headerVisible = section.tableHeaderVisible ?? true;
  const showHeader = headerVisible || settingsMode || copyMode;
  const showRowGutter = settingsMode || copyMode || section.numberedList;
  const firstCopyRow = headerVisible ? 0 : 1;
  const selectionShape = JSON.stringify([
    items.map((item) => item._id),
    columns.map((column) => column.id),
    headerVisible,
  ]);
  const allSelected = selectedCells.size > 0 && selectedCells.size === (grid.length - firstCopyRow) * columns.length;
  const fixedColumnWidths = columns
    .slice(0, -1)
    .map((column) => Math.max(80, columnWidths[column.id] ?? column.width ?? 144));

  useEffect(() => setColumnWidths({}), [section.tableColumns]);
  useEffect(() => {
    setSelectedCells(new Set());
    selectionAnchor.current = null;
    dragSelection.current = null;
    if (copyMode) scrollerRef.current?.focus({ preventScroll: true });
  }, [copyMode, selectionShape]);
  useEffect(() => setCopied(false), [selectedCells]);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Table update failed.");
    }
  };

  const addColumn = () =>
    setUpdatedSection({ ...section, tableColumns: [...allColumns, { id: nanoid(), heading: "" }] });

  const addRow = () =>
    runAction(() =>
      db.items.add({ _id: nanoid(), sectionId: section._id, collectionId: section.collectionId, title: "" }),
    );

  const toggleHeader = () => setUpdatedSection({ ...section, tableHeaderVisible: !headerVisible });

  const deleteColumn = (columnIndex: number) => {
    const column = columns[columnIndex];
    if (!column.hidden && allColumns.filter((entry) => !entry.hidden).length <= 1) return;
    setUpdatedSection({
      ...section,
      tableColumns: allColumns.map((entry) => (entry.id === column.id ? { ...entry, hidden: !entry.hidden } : entry)),
    });
  };

  const deleteRow = (rowIndex: number) => runAction(() => db.items.delete(items[rowIndex - 1].id));

  const updateCells = async (rowIndex: number, columnIndex: number, cells: string[][]) => {
    const nextSection = await saveTableCells(
      section,
      items.map((item) => item.id),
      columns,
      rowIndex,
      columnIndex,
      cells,
    );
    setUpdatedSection(nextSection);
  };

  const commitCell = () => {
    if (copyMode || !editingCell) return;
    const { rowIndex, columnIndex } = editingCell;
    void runAction(async () => {
      await updateCells(rowIndex, columnIndex, [[draft]]);
      setEditingCell((current) =>
        current?.rowIndex === rowIndex && current.columnIndex === columnIndex ? null : current,
      );
    });
  };

  const fitCellEditor = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const editor = event.currentTarget;
    editor.style.height = "auto";
    editor.style.height = `${editor.scrollHeight}px`;
  };

  const resizeColumn = (columnIndex: number, startX: number, startWidth: number) => {
    const handlePointerMove = (event: PointerEvent) => {
      const nextWidths = { ...columnWidths };
      nextWidths[columns[columnIndex].id] = Math.max(80, startWidth + event.clientX - startX);
      setColumnWidths(nextWidths);
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setColumnWidths((widths) => {
        setUpdatedSection({
          ...section,
          tableColumns: allColumns.map((column) => ({ ...column, width: widths[column.id] ?? column.width })),
        });
        return widths;
      });
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const pasteGrid = (rowIndex: number, columnIndex: number, pastedText: string) => {
    const parsed = Papa.parse<string[]>(pastedText, { delimiter: "\t", skipEmptyLines: false });
    if (parsed.errors.length) {
      setError(parsed.errors[0].message);
      return;
    }
    const cells = parsed.data;
    if (cells.length > 1 && cells[cells.length - 1].length === 1 && cells[cells.length - 1][0] === "") cells.pop();
    void runAction(async () => {
      await updateCells(rowIndex, columnIndex, cells);
      setEditingCell(null);
    });
  };

  const toggleCopyMode = () =>
    runAction(async () => {
      if (!copyMode && editingCell) {
        await updateCells(editingCell.rowIndex, editingCell.columnIndex, [[draft]]);
        setEditingCell(null);
      }
      setSettingsMode(false);
      setCopyMode((active) => !active);
    });

  const selectRectangle = (start: TableCell, end: TableCell, base = new Set<string>()) => {
    const next = new Set(base);
    for (
      let rowIndex = Math.max(firstCopyRow, Math.min(start.rowIndex, end.rowIndex));
      rowIndex <= Math.max(start.rowIndex, end.rowIndex);
      rowIndex++
    ) {
      for (
        let columnIndex = Math.min(start.columnIndex, end.columnIndex);
        columnIndex <= Math.max(start.columnIndex, end.columnIndex);
        columnIndex++
      ) {
        next.add(cellKey(rowIndex, columnIndex));
      }
    }
    setSelectedCells(next);
  };

  const toggleSelection = (cells: string[]) => {
    scrollerRef.current?.focus({ preventScroll: true });
    setSelectedCells((previous) => {
      const next = new Set(previous);
      const remove = cells.every((key) => previous.has(key));
      cells.forEach((key) => {
        if (remove) next.delete(key);
        else next.add(key);
      });
      return next;
    });
  };

  const selectAll = () => {
    scrollerRef.current?.focus({ preventScroll: true });
    const next = new Set<string>();
    for (let rowIndex = firstCopyRow; rowIndex < grid.length; rowIndex++) {
      columns.forEach((_, columnIndex) => next.add(cellKey(rowIndex, columnIndex)));
    }
    setSelectedCells(next);
  };

  const beginSelection = (event: React.PointerEvent, rowIndex: number, columnIndex: number) => {
    if (!copyMode || rowIndex === 0 || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const cell = { rowIndex, columnIndex };
    const start = event.shiftKey && selectionAnchor.current ? selectionAnchor.current : cell;
    const base = event.ctrlKey || event.metaKey ? new Set(selectedCells) : new Set<string>();
    selectionAnchor.current = start;
    dragSelection.current = { start, base };
    selectRectangle(start, cell, base);
    scrollerRef.current?.focus({ preventScroll: true });
    scrollerRef.current?.setPointerCapture(event.pointerId);
  };

  const moveSelection = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!copyMode || !dragSelection.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const horizontal = event.clientX > bounds.right - 24 ? 16 : event.clientX < bounds.left + 24 ? -16 : 0;
    const vertical = event.clientY > bounds.bottom - 24 ? 16 : event.clientY < bounds.top + 24 ? -16 : 0;
    event.currentTarget.scrollBy(horizontal, vertical);
    const target = document
      .elementFromPoint(
        Math.max(bounds.left + 2, Math.min(bounds.right - 2, event.clientX)),
        Math.max(bounds.top + 2, Math.min(bounds.bottom - 2, event.clientY)),
      )
      ?.closest<HTMLElement>("[data-table-row][data-table-column]");
    if (!target || !event.currentTarget.contains(target)) return;
    const rowIndex = Number(target.dataset.tableRow);
    const columnIndex = Number(target.dataset.tableColumn);
    if (rowIndex < firstCopyRow) return;
    selectRectangle(dragSelection.current.start, { rowIndex, columnIndex }, dragSelection.current.base);
  };

  const getSelectedGrid = () => {
    const rows = [...new Set([...selectedCells].map((key) => Number(key.split(":")[0])))].sort(
      (left, right) => left - right,
    );
    const selectedColumns = [...new Set([...selectedCells].map((key) => Number(key.split(":")[1])))].sort(
      (left, right) => left - right,
    );
    return rows.map((rowIndex) =>
      selectedColumns.map((columnIndex) => {
        if (!selectedCells.has(cellKey(rowIndex, columnIndex))) return "";
        if (rowIndex === 0) return columns[columnIndex].heading;
        const item = items[rowIndex - 1];
        return columns[columnIndex].field === "durationSeconds"
          ? item.durationSeconds === undefined
            ? ""
            : formatDuration(Number(item.durationSeconds))
          : getItemTableValue(item, columns[columnIndex], true);
      }),
    );
  };

  const getClipboardData = () => {
    const cells = getSelectedGrid();
    const table = document.createElement("table");
    cells.forEach((row) => {
      const tableRow = table.insertRow();
      row.forEach((value) => {
        const cell = tableRow.insertCell();
        value.split("\n").forEach((line, index) => {
          if (index > 0) cell.appendChild(document.createElement("br"));
          cell.appendChild(document.createTextNode(line));
        });
      });
    });
    return {
      text: Papa.unparse(cells, { delimiter: "\t", newline: "\r\n" }),
      html: table.outerHTML,
    };
  };

  const copySelection = () =>
    runAction(async () => {
      const { text, html } = getClipboardData();
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Could not access the clipboard.");
      }
      setCopied(true);
    });

  if (section.tableData?.length && section.dataVersion !== 1) {
    return (
      <div role="status" className="px-3 py-2">
        Legacy table pending conversion.
      </div>
    );
  }

  return (
    <div className={`tableSection ${copyMode ? "tableSectionCopyMode" : ""}`}>
      {error && (
        <div role="alert" className="px-2 py-1 text-red-400">
          {error}
        </div>
      )}
      <div className="tableSectionToolbar">
        {!copyMode && (
          <>
            <Button
              type="button"
              color="#566379"
              title="Add column"
              aria-label="Add column"
              disabled={copyMode}
              onClick={addColumn}
            >
              <PlusIcon style={{ width: ".75em" }} />
              <span>Column</span>
            </Button>
            <Button
              type="button"
              color="#566379"
              title="Add row"
              aria-label="Add row"
              disabled={copyMode}
              onClick={addRow}
            >
              <PlusIcon style={{ width: ".75em" }} />
              <span>Row</span>
            </Button>
          </>
        )}
        {copyMode && (
          <>
            <Button
              type="button"
              color="#61728e"
              className="tableSectionIconButton"
              title="Select all"
              aria-label="Select all"
              active={allSelected}
              onClick={selectAll}
            >
              <FontAwesomeIcon icon={faBorderAll} />
            </Button>
            <Button
              type="button"
              color={copied ? "#43876b" : "#566379"}
              active={copied}
              className="tableSectionIconButton"
              title={copied ? "Copied" : "Copy selection"}
              aria-label="Copy selection"
              disabled={!selectedCells.size}
              onClick={copySelection}
            >
              {copied ? <CheckIcon style={{ width: "1em" }} /> : <FontAwesomeIcon icon={faCopy} />}
            </Button>
          </>
        )}
        {settingsMode && (
          <Button
            type="button"
            color="#566379"
            active={headerVisible}
            title={headerVisible ? "Hide header" : "Show header"}
            onClick={toggleHeader}
          >
            {headerVisible ? <EyeIcon style={{ width: ".85em" }} /> : <EyeSlashIcon style={{ width: ".85em" }} />}
            <span>Header</span>
          </Button>
        )}
        <Button
          type="button"
          color="#61728e"
          active={settingsMode}
          className="tableSectionSettingsToggle tableSectionIconButton"
          style={{ margin: "1px 1px 1px auto" }}
          title={settingsMode ? "Close table settings" : "Table settings"}
          disabled={copyMode}
          onClick={() => setSettingsMode((active) => !active)}
        >
          <GearIcon style={{ width: "1em" }} />
        </Button>
        <Button
          type="button"
          color="#61728e"
          className="tableSectionIconButton"
          title={copyMode ? "Exit copy mode" : "Copy mode"}
          aria-label="Copy mode"
          active={copyMode}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleCopyMode}
        >
          <FontAwesomeIcon icon={faArrowPointer} />
        </Button>
      </div>
      <div
        ref={scrollerRef}
        className="tableSectionScroller"
        tabIndex={copyMode ? 0 : undefined}
        aria-label={copyMode ? "Table copy selection" : undefined}
        onPointerMove={moveSelection}
        onPointerUp={() => {
          dragSelection.current = null;
        }}
        onPointerCancel={() => {
          dragSelection.current = null;
        }}
        onLostPointerCapture={() => {
          dragSelection.current = null;
        }}
        onKeyDown={(event) => {
          if (!copyMode) return;
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
            event.preventDefault();
            selectAll();
          }
          if (event.key === "Escape") {
            setSelectedCells(new Set());
            selectionAnchor.current = null;
          }
        }}
        onCopy={(event) => {
          if (!copyMode || !selectedCells.size) return;
          event.preventDefault();
          const { text, html } = getClipboardData();
          event.clipboardData.setData("text/plain", text);
          event.clipboardData.setData("text/html", html);
          setCopied(true);
        }}
      >
        <table
          className="tableSectionGrid"
          style={{
            minWidth: `${fixedColumnWidths.reduce((total, width) => total + width, 144) + (showRowGutter ? 32 : 0)}px`,
          }}
        >
          <colgroup>
            {showRowGutter && <col className="tableSectionGutterColumn" />}
            {fixedColumnWidths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
            <col />
          </colgroup>
          <tbody>
            {grid.map((row, rowIndex) => {
              if (rowIndex === 0 && !showHeader) return null;
              const hiddenHeaderPreview = rowIndex === 0 && !headerVisible;
              return (
                <tr key={rowIndex === 0 ? "header" : items[rowIndex - 1]._id}>
                  {showRowGutter && (
                    <td className={`tableSectionDeleteCell ${rowIndex === 0 ? "tableSectionHeaderCell" : ""} ${hiddenHeaderPreview ? "tableSectionHiddenHeader" : ""}`}>
                      {copyMode ? (
                        <button
                          type="button"
                          className="tableSectionCopyRowButton tableSectionRowNumber"
                          title={rowIndex === 0 ? "Select all" : `Select row ${rowIndex}`}
                          aria-label={rowIndex === 0 ? "Select entire table" : `Select row ${rowIndex}`}
                          aria-pressed={
                            rowIndex === 0
                              ? allSelected
                              : columns.every((_, columnIndex) => selectedCells.has(cellKey(rowIndex, columnIndex)))
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            if (rowIndex === 0) selectAll();
                            else toggleSelection(columns.map((_, columnIndex) => cellKey(rowIndex, columnIndex)));
                          }}
                        >
                          {rowIndex === 0 ? <FontAwesomeIcon icon={faBorderAll} /> : rowIndex}
                        </button>
                      ) : (
                        rowIndex > 0 &&
                        (settingsMode ? (
                          <button
                            type="button"
                            className="tableSectionDeleteCellButton"
                            title={`Delete row ${rowIndex + 1}`}
                            onClick={() => deleteRow(rowIndex)}
                          >
                            <TrashIcon style={{ width: ".65em" }} />
                          </button>
                        ) : (
                          <span className="tableSectionRowNumber">{rowIndex}</span>
                        ))
                      )}
                    </td>
                  )}
                  {row.map((cell, columnIndex) => (
                    <td
                      key={columns[columnIndex].id}
                      data-table-row={rowIndex}
                      data-table-column={columnIndex}
                      className={`${rowIndex === 0 ? "tableSectionHeaderCell" : ""} ${hiddenHeaderPreview ? "tableSectionHiddenHeader" : ""} ${copyMode && selectedCells.has(cellKey(rowIndex, columnIndex)) ? "tableSectionCellSelected" : ""}`}
                    >
                      {rowIndex === 0 && settingsMode && (
                        <button
                          type="button"
                          className="tableSectionDeleteColumn"
                          title={`${columns[columnIndex].hidden ? "Show" : "Hide"} column ${columnIndex + 1}`}
                          onClick={() => deleteColumn(columnIndex)}
                        >
                          {columns[columnIndex].hidden ? (
                            <EyeSlashIcon style={{ width: ".85em" }} />
                          ) : (
                            <EyeIcon style={{ width: ".85em" }} />
                          )}
                        </button>
                      )}
                      {!copyMode && rowIndex === 0 && columnIndex < grid[0].length - 1 && (
                        <button
                          type="button"
                          className="tableSectionResizeHandle"
                          title={`Resize column ${columnIndex + 1}`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            resizeColumn(columnIndex, event.clientX, fixedColumnWidths[columnIndex]);
                          }}
                        />
                      )}
                      {!copyMode && editingCell?.rowIndex === rowIndex && editingCell.columnIndex === columnIndex ? (
                        rowIndex > 0 && columns[columnIndex].field === "title" ? (
                          <LinkTextEditor
                            value={draft}
                            onChange={setDraft}
                            autoFocus
                            label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                            className="tableTitleEditor"
                            onBlur={commitCell}
                            onCancel={() => {
                              setEditingCell(null);
                              setError("");
                            }}
                            onGridPaste={(text) => pasteGrid(rowIndex, columnIndex, text)}
                            controls={
                              <button
                                type="button"
                                aria-label="Save title"
                                onClick={commitCell}
                                className="submitArrow valid"
                              >
                                <CheckIcon />
                              </button>
                            }
                          />
                        ) : rowIndex > 0 && columns[columnIndex].field === "date" ? (
                          <input
                            type="date"
                            className="basicInput"
                            style={{ width: "100%", minWidth: 0 }}
                            aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                            autoFocus
                            value={
                              draft
                                ? (() => {
                                    const date = new Date(draft);
                                    if (Number.isNaN(date.getTime())) return "";
                                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                                  })()
                                : ""
                            }
                            onClick={(event) => event.stopPropagation()}
                            onFocus={(event) => {
                              try {
                                event.currentTarget.showPicker?.();
                              } catch {
                                return;
                              }
                            }}
                            onBlur={commitCell}
                            onChange={(event) =>
                              setDraft(
                                event.target.value ? new Date(`${event.target.value}T00:00:00`).toISOString() : "",
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setEditingCell(null);
                                setError("");
                              }
                              if (event.key === "Enter") event.currentTarget.blur();
                            }}
                          />
                        ) : (
                          <textarea
                            aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                            autoFocus
                            rows={1}
                            spellCheck={false}
                            value={draft}
                            onClick={(event) => event.stopPropagation()}
                            onFocus={fitCellEditor}
                            onInput={fitCellEditor}
                            onBlur={commitCell}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setEditingCell(null);
                                setError("");
                              }
                            }}
                            onChange={(event) => setDraft(event.target.value)}
                            onPaste={(event) => {
                              const text = event.clipboardData.getData("text/plain");
                              if (!text.includes("\t")) return;
                              event.preventDefault();
                              pasteGrid(rowIndex, columnIndex, text);
                            }}
                          />
                        )
                      ) : !copyMode &&
                        rowIndex > 0 &&
                        columns[columnIndex].field === "title" &&
                        readLinkText(cell).some((part) => part.url) ? (
                        <div
                          className="tableSectionCellDisplay tableTitleDisplay"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDraft(cell);
                            setError("");
                            setEditingCell({ rowIndex, columnIndex });
                          }}
                        >
                          <LinkText text={cell} />
                          <button
                            type="button"
                            className="tableTitleEditButton"
                            aria-label={`Edit row ${rowIndex + 1}, column ${columnIndex + 1}`}
                            title="Edit title"
                          >
                            <EditIcon style={{ width: ".8em" }} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`tableSectionCellDisplay ${hiddenHeaderPreview ? "tableSectionCellDisabled" : ""}`}
                          aria-label={
                            copyMode
                              ? rowIndex === 0
                                ? `Select column ${columns[columnIndex].heading || columnIndex + 1}`
                                : `Select row ${rowIndex}, column ${columnIndex + 1}`
                              : hiddenHeaderPreview
                                ? `Hidden header, column ${columnIndex + 1}`
                                : `Edit row ${rowIndex + 1}, column ${columnIndex + 1}`
                          }
                          aria-pressed={
                            copyMode
                              ? rowIndex === 0
                                ? Array.from(
                                    { length: grid.length - firstCopyRow },
                                    (_, index) => index + firstCopyRow,
                                  ).every((index) => selectedCells.has(cellKey(index, columnIndex)))
                                : selectedCells.has(cellKey(rowIndex, columnIndex))
                              : undefined
                          }
                          disabled={hiddenHeaderPreview && !copyMode}
                          onPointerDown={(event) => beginSelection(event, rowIndex, columnIndex)}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (copyMode) {
                              if (rowIndex === 0)
                                toggleSelection(
                                  Array.from({ length: grid.length - firstCopyRow }, (_, index) =>
                                    cellKey(index + firstCopyRow, columnIndex),
                                  ),
                                );
                              else if (event.detail === 0) {
                                const cell = { rowIndex, columnIndex };
                                selectRectangle(
                                  selectionAnchor.current && event.shiftKey ? selectionAnchor.current : cell,
                                  cell,
                                );
                                if (!event.shiftKey) selectionAnchor.current = cell;
                              }
                              return;
                            }
                            if (hiddenHeaderPreview) return;
                            setDraft(cell);
                            setError("");
                            setEditingCell({ rowIndex, columnIndex });
                          }}
                        >
                          {rowIndex > 0 && columns[columnIndex].field === "checklistItems" ? (
                            <span
                              role="list"
                              className="flex flex-col gap-1 text-left"
                              style={{ whiteSpace: "normal" }}
                            >
                              {items[rowIndex - 1].checklistItems?.map((entry, index) => (
                                <span key={index} role="listitem" className="flex items-start gap-1">
                                  <span
                                    role="img"
                                    aria-label={entry.checked ? "Completed" : "Not completed"}
                                    className="flex shrink-0 items-center justify-center"
                                    style={{ width: "1em", height: "1.25em" }}
                                  >
                                    {entry.checked ? (
                                      <CheckIcon style={{ width: ".7em", height: ".7em" }} />
                                    ) : (
                                      <span
                                        style={{
                                          width: ".25em",
                                          height: ".25em",
                                          borderRadius: "50%",
                                          background: "currentColor",
                                        }}
                                      />
                                    )}
                                  </span>
                                  <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>
                                    {entry.text}
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : rowIndex > 0 ? (
                            columns[columnIndex].field === "durationSeconds" ? (
                              items[rowIndex - 1].durationSeconds === undefined ? (
                                ""
                              ) : (
                                formatDuration(Number(items[rowIndex - 1].durationSeconds))
                              )
                            ) : (
                              getItemTableValue(items[rowIndex - 1], columns[columnIndex], true)
                            )
                          ) : (
                            cell
                          )}
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
