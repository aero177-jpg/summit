import React, { useState } from "react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLiveQuery } from "dexie-react-hooks";
import { TableSection } from "../components/TableSection";
import { db, resetDatabase } from "../models/db";
import { ISection } from "../models/section";
import LinkText from "../components/LinkText";

vi.mock("../App", () => ({ useTheme: () => ({ theme: "dark", isDarkMode: true }) }));

function TableHarness({ sectionId }: { sectionId: number }) {
  const section = useLiveQuery(() => db.sections.get(sectionId), [sectionId]);
  const items = useLiveQuery(() => db.items.where("sectionId").equals("table-test").toArray(), []);
  const [tableVisible, setTableVisible] = useState(true);
  if (!section || !items) return null;
  return (
    <>
      <button onClick={() => setTableVisible((visible) => !visible)}>Switch view</button>
      {tableVisible ? (
        <TableSection
          section={section}
          items={items}
          setUpdatedSection={(next) => {
            void db.sections.put(next);
          }}
        />
      ) : (
        items.map((item) => (
          <div key={item.id} data-testid="list-row">
            <LinkText text={item.title} />: {item.amount}
          </div>
        ))
      )}
    </>
  );
}

describe("item-backed table UI", () => {
  let sectionId: number;
  beforeEach(async () => {
    await resetDatabase([], [], []);
    const section: ISection = {
      _id: "table-test",
      dataVersion: 1,
      tableColumns: [
        { id: "field:title", field: "title", heading: "Item" },
        { id: "field:amount", field: "amount", heading: "Amount" },
      ],
    };
    sectionId = await db.sections.add(section);
    await db.items.add({
      _id: "row-test",
      sectionId: "table-test",
      title: "Original",
      amount: 10,
      durationSeconds: 90,
    });
  });
  afterEach(cleanup);
  afterAll(async () => {
    await db.delete();
  });

  it("saves an edited cell and shows the same value after switching views", async () => {
    render(<TableHarness sectionId={sectionId} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit row 2, column 1" }));
    const editor = screen.getByRole("textbox", { name: "Row 2, column 1" });
    await act(async () => {
      const textNode = editor.querySelector("[data-lexical-text]").firstChild;
      textNode.textContent = "Edited";
      const range = document.createRange();
      range.setStart(textNode, 6);
      range.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      fireEvent.input(editor, { inputType: "insertText", data: "Edited" });
    });
    fireEvent.blur(editor);
    await waitFor(async () => expect((await db.items.toArray())[0].title).toBe("Edited"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit row 2, column 1" })).toHaveTextContent("Edited"),
    );
    fireEvent.click(screen.getByText("Switch view"));
    expect(await screen.findByTestId("list-row")).toHaveTextContent("Edited: 10");
    expect((await db.items.toArray())[0].durationSeconds).toBe(90);
    fireEvent.click(screen.getByText("Switch view"));
    expect(await screen.findByRole("button", { name: "Edit row 2, column 1" })).toHaveTextContent("Edited");
  });

  it("rejects invalid numeric input without changing stored data", async () => {
    render(<TableHarness sectionId={sectionId} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit row 2, column 2" }));
    const editor = screen.getByRole("textbox", { name: "Row 2, column 2" });
    fireEvent.change(editor, { target: { value: "not a number" } });
    fireEvent.blur(editor);
    expect(await screen.findByRole("alert")).toHaveTextContent("valid number");
    expect((await db.items.toArray())[0].amount).toBe(10);
  });

  it("labels a title without blur-saving when its link modal opens", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    try {
      const item = (await db.items.toArray())[0];
      await db.items.update(item.id, { title: "https://example.com/docs" });
      render(<TableHarness sectionId={sectionId} />);
      fireEvent.click(await screen.findByRole("button", { name: "Edit row 2, column 1" }));
      const editor = screen.getByRole("textbox", { name: "Row 2, column 1" });
      fireEvent.click(await screen.findByRole("button", { name: "Edit links" }));
      const label = screen.getByRole("textbox", { name: "Display text" });
      fireEvent.blur(editor, { relatedTarget: label });
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute("contenteditable", "false");
      fireEvent.change(label, { target: { value: "Docs" } });
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      await waitFor(() => expect(editor).toHaveTextContent("Docs"));
      fireEvent.click(screen.getByRole("button", { name: "Save title" }));
      const link = await screen.findByRole("link", { name: "Docs" });
      expect(link).toHaveAttribute("href", "https://example.com/docs");
      expect((await db.items.get(item.id)).title).toContain("[Docs]");
      link.addEventListener("click", (event) => event.preventDefault(), { once: true });
      fireEvent.click(link);
      expect(screen.queryByRole("textbox", { name: "Row 2, column 1" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("Switch view"));
      expect(await screen.findByRole("link", { name: "Docs" })).toHaveAttribute("href", "https://example.com/docs");
    } finally {
      root.remove();
    }
  });

  it("adds and deletes canonical item rows", async () => {
    render(<TableHarness sectionId={sectionId} />);
    fireEvent.click(await screen.findByRole("button", { name: "Add row" }));
    await screen.findByRole("button", { name: "Edit row 3, column 1" });
    expect(await db.items.count()).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Table settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete row 3" }));
    await waitFor(async () => expect(await db.items.count()).toBe(1));
  });

  it("preserves quoted multiline cells when pasting a spreadsheet", async () => {
    render(<TableHarness sectionId={sectionId} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit row 2, column 1" }));
    const editor = screen.getByRole("textbox", { name: "Row 2, column 1" });
    fireEvent.paste(editor, { clipboardData: { getData: () => '"First\nline"\t20\r\nSecond\t30\r\n' } });
    await waitFor(async () => expect(await db.items.count()).toBe(2));
    const items = await db.items.orderBy("id").toArray();
    expect(items[0]).toMatchObject({ title: "First\nline", amount: 20 });
    expect(items[1]).toMatchObject({ title: "Second", amount: 30 });
  });
});
