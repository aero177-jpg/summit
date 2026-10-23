import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AddSection } from "../components/AddSection";
import { TinyChecklist } from "../components/TinyChecklist";

vi.mock("../App", () => ({ useTheme: () => ({ theme: "dark", isDarkMode: true }) }));
vi.mock("@formkit/auto-animate/react", () => ({ useAutoAnimate: () => [vi.fn(), vi.fn()] }));
vi.mock("../components/Dropdown", () => ({ default: () => null }));

afterEach(cleanup);

describe("creation input autofill semantics", () => {
  it.each([
    { variant: undefined, placeholder: "Add section..." },
    { variant: "collection", placeholder: "Add collection..." },
  ])("opts out of autofill for $placeholder without changing submission", ({ variant, placeholder }) => {
    const saveCB = vi.fn();
    render(<AddSection saveCB={saveCB} variant={variant} placeholder={placeholder} newSection={{ title: "" }} />);
    // Chrome on Android offers password/card autofill on any <input>, so the title is a contenteditable textbox
    const input = screen.getByRole("textbox", { name: placeholder });
    expect(input.tagName).not.toBe("INPUT");
    expect(input).toHaveAttribute("contenteditable", "plaintext-only");
    input.textContent = "Groceries";
    fireEvent.input(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(saveCB).toHaveBeenCalledWith({ title: "Groceries" });
    expect(input).toHaveTextContent("");
  });

  it("opts out of autofill for a new checklist item without changing submission", () => {
    const updateItemChecklist = vi.fn();
    render(<TinyChecklist items={[]} updateItemChecklist={updateItemChecklist} />);
    const input = screen.getByPlaceholderText("Add a new item...");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("autocomplete", "off");
    fireEvent.change(input, { target: { value: "Milk" } });
    fireEvent.submit(input.closest("form"));
    expect(updateItemChecklist).toHaveBeenCalledWith([{ text: "Milk", amount: 0, checked: false, createdAt: "" }]);
    expect(input).toHaveValue("");
  });
});
