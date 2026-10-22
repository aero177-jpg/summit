import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ActionButton } from "../components/ActionButton";
import { ActionButtonContext } from "../context/ActionButtonContext";

function renderButton() {
  const onClick = vi.fn();
  const onClickSecondary = vi.fn();
  const parentDivRef = { current: document.createElement("div") };
  const result = render(
    <ActionButtonContext.Provider value={{ actionBtnVisible: true, setActionBtnVisible: vi.fn() }}>
      <ActionButton onClick={onClick} onClickSecondary={onClickSecondary} parentDivRef={parentDivRef} />
    </ActionButtonContext.Provider>,
  );
  return { button: result.container.querySelector(".actionButton"), onClick, onClickSecondary };
}

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("innerWidth", 500);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("action button clicks", () => {
  it("opens the primary modal only once on a tap", async () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerUp(button, { button: 0 });
    fireEvent.click(button);
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it("does not open the primary modal on a hold release", async () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, { pointerId: 1, button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 310));
    });
    fireEvent.pointerUp(button, { pointerId: 1, button: 0 });
    fireEvent.click(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("opens on the next tap after a hold without a click event", async () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, { button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 310));
    });
    fireEvent.pointerUp(button, { button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerUp(button, { button: 0 });
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it("does not open from a standalone click event", async () => {
    const { button, onClick } = renderButton();
    fireEvent.click(button);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("accepts a longer mobile tap without revealing the target", async () => {
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, { button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 180));
    });
    expect(button.parentElement.querySelectorAll(".actionButton")).toHaveLength(1);
    fireEvent.pointerUp(button, { button: 0 });
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it("accepts a desktop tap longer than the mobile hold threshold", async () => {
    vi.stubGlobal("innerWidth", 1024);
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, { button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 380));
    });
    expect(button.parentElement.querySelectorAll(".actionButton")).toHaveLength(1);
    fireEvent.pointerUp(button, { button: 0 });
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it("reveals the target on a desktop hold without opening the primary modal", async () => {
    vi.stubGlobal("innerWidth", 1024);
    const { button, onClick } = renderButton();
    fireEvent.pointerDown(button, { button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });
    expect(button.parentElement.querySelectorAll(".actionButton")).toHaveLength(2);
    fireEvent.pointerUp(button, { button: 0 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(onClick).not.toHaveBeenCalled();
  });
});
