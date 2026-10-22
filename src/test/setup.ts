import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { vi } from "vitest";

// Render the editor synchronously in tests instead of through the lazy-loading wrapper
vi.mock("../components/LazyLinkTextEditor", async () => import("../components/LinkTextEditor"));
