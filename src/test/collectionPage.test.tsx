import React from "react";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CollectionPage } from "../pages/CollectionPage";
import { db } from "../models/db";

vi.mock("../App", () => ({ useTheme: () => ({ theme: "dark", setTheme: vi.fn() }) }));
vi.mock("../components/Collection", () => ({ Collection: ({ collection }) => <div>{collection.title}</div> }));
vi.mock("../models/db", () => ({ db: { collections: { get: vi.fn() } } }));

function renderCollection(path = "/collection/4") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/collection/:collectionId" element={<CollectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(db.collections.get).mockReset();
  localStorage.setItem("currentCollection", "4");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("collection route fallback", () => {
  it("redirects a missing collection to home and clears the saved collection", async () => {
    vi.mocked(db.collections.get).mockResolvedValue(undefined);
    renderCollection();
    expect(await screen.findByText("Home")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("currentCollection")).toBe("null"));
  });

  it("redirects an invalid ID without querying the database", async () => {
    renderCollection("/collection/not-a-number");
    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(db.collections.get).not.toHaveBeenCalled();
  });

  it("waits for the collection lookup before deciding whether to redirect", async () => {
    let resolveCollection;
    vi.mocked(db.collections.get).mockImplementation(
      () =>
        new Dexie.Promise((resolve) => {
          resolveCollection = resolve;
        }),
    );
    renderCollection();
    await waitFor(() => expect(db.collections.get).toHaveBeenCalledWith(4));
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
    resolveCollection({ id: 4, title: "Existing collection", collectionType: "general" });
    expect(await screen.findByText("Existing collection")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });
});
