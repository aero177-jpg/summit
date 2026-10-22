import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LinkTextEditor from "../components/LinkTextEditor";
import LinkText from "../components/LinkText";
import ExpandableText from "../components/ExpandableText";

vi.mock("../App", () => ({ useTheme: () => ({ theme: "light", isDarkMode: false }) }));
vi.mock("../components/PortalModal", () => ({ default: ({ children }) => <div>{children}</div> }));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness({ initial = "https://example.com/a and https://example.com/a" }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <LinkTextEditor value={value} onChange={setValue} singleLine />
      <output data-testid="stored">{value}</output>
      <div data-testid="saved">
        <LinkText text={value} />
      </div>
    </>
  );
}

describe("link editor", () => {
  it("labels repeated URLs independently, keeps a blank label as a URL, and reloads", async () => {
    const view = render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit links" }));
    const labels = screen.getAllByRole("textbox", { name: "Display text" });
    expect(labels).toHaveLength(2);
    fireEvent.change(labels[0], { target: { value: "Docs" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Item title" })).toHaveTextContent("Docs and https://example.com/a"),
    );
    const stored = screen.getByTestId("stored").textContent!;
    expect(screen.getByTestId("saved").querySelector("a")?.getAttribute("href")).toBe("https://example.com/a");
    view.unmount();
    render(<Harness initial={stored} />);
    expect(screen.getByRole("textbox", { name: "Item title" })).toHaveTextContent("Docs and https://example.com/a");
  });

  it("cancels without changes and disables invalid URLs", async () => {
    render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit links" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "URL" })[0], { target: { value: "javascript:alert(1)" } });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("stored")).toHaveTextContent("https://example.com/a and https://example.com/a");
  });

  it("hides the toggle for text without links", () => {
    render(<Harness initial="Just a title" />);
    expect(screen.queryByRole("button", { name: "Edit links" })).not.toBeInTheDocument();
  });

  it("updates an existing label and supports undo", async () => {
    render(<Harness initial="See [Docs](https://example.com/docs)" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit links" }));
    expect(screen.getByRole("textbox", { name: "Display text" })).toHaveValue("Docs");
    fireEvent.change(screen.getByRole("textbox", { name: "Display text" }), { target: { value: "Guide" } });
    fireEvent.change(screen.getByRole("textbox", { name: "URL" }), { target: { value: "https://example.com/guide" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const editor = screen.getByRole("textbox", { name: "Item title" });
    await waitFor(() => expect(editor).toHaveTextContent("See Guide"));
    expect(screen.getByTestId("saved").querySelector("a")).toHaveAttribute("href", "https://example.com/guide");
    fireEvent.keyDown(editor, { key: "z", code: "KeyZ", keyCode: 90, ctrlKey: true });
    await waitFor(() => expect(editor).toHaveTextContent("See Docs"));
    fireEvent.keyDown(editor, { key: "y", code: "KeyY", keyCode: 89, ctrlKey: true });
    await waitFor(() => expect(editor).toHaveTextContent("See Guide"));
  });

  it("loads externally updated text", async () => {
    const change = vi.fn();
    const view = render(<LinkTextEditor value="Original" onChange={change} singleLine />);
    view.rerender(<LinkTextEditor value="[New](https://example.com/new)" onChange={change} singleLine />);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Item title" })).toHaveTextContent("New"));
    expect(change).not.toHaveBeenCalled();
  });

  it("keeps comment link changes as a draft until comment submit", async () => {
    const updateText = vi.fn();
    const view = render(<ExpandableText open text="See https://example.com/docs" updateText={updateText} />);
    fireEvent.click(view.container.querySelector(".itemCommentInput"));
    fireEvent.click(await screen.findByRole("button", { name: "Edit links" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Display text" }), { target: { value: "Docs" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Comment" })).toHaveTextContent("See Docs"));
    expect(updateText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save comment" }));
    expect(updateText).toHaveBeenCalledWith(expect.stringContaining("[Docs](<https://example.com/docs>)"));
  });

  it("updates a collection comment draft while typing without a submit button", async () => {
    const updateText = vi.fn();
    const view = render(<ExpandableText open text="" updateText={updateText} showSubmit={false} />);
    const editor = screen.getByRole("textbox", { name: "Comment" });

    expect(screen.queryByRole("button", { name: "Save comment" })).not.toBeInTheDocument();
    fireEvent.input(editor, { target: { textContent: "Draft comment" } });

    await waitFor(() => expect(updateText).toHaveBeenCalledWith("Draft comment"));
    expect(view.container.querySelector(".itemCommentInput")).toHaveTextContent("Draft comment");
  });
});
