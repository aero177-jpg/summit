import { describe, expect, it } from "vitest";
import { detectTextLinks, readLinkText, safeLinkUrl, writeLinkText } from "../utils/linkText";

describe("link text", () => {
  it("keeps ordinary legacy text and URLs unchanged", () => {
    const text = "Literal *bold* [brackets] \\ path\nhttps://example.com/a(b).";
    expect(writeLinkText(readLinkText(text))).toBe(text);
    expect(detectTextLinks(text).find((part) => part.url)?.text).toBe("https://example.com/a(b)");
  });

  it("round-trips labels, literal brackets, repeated URLs and line breaks", () => {
    const parts = [
      { text: "See [literal] \\ " },
      { text: "Docs [v2]", url: "https://example.com/a(b)" },
      { text: "\nthen " },
      { text: "Other", url: "https://example.com/a(b)" },
      { text: " or https://second.example/path." },
    ];
    const restored = readLinkText(writeLinkText(parts), false);
    expect(restored.map((part) => part.text).join("")).toBe(parts.map((part) => part.text).join(""));
    expect(restored.filter((part) => part.url)).toEqual(parts.filter((part) => part.url));
  });

  it("uses bare URLs for blank labels and normalizes www destinations", () => {
    expect(safeLinkUrl("www.example.com/docs")).toBe("https://www.example.com/docs");
    expect(detectTextLinks("See www.example.com/docs.").find((part) => part.url)?.url).toBe(
      "https://www.example.com/docs",
    );
    expect(writeLinkText([{ text: "https://example.com", url: "https://example.com/" }])).toBe("https://example.com");
  });

  it("keeps adjacent labeled occurrences separate", () => {
    expect(readLinkText("[One](https://example.com)[Two](https://example.com)")).toEqual([
      { text: "One", url: "https://example.com/" },
      { text: "Two", url: "https://example.com/" },
    ]);
  });

  it("rejects unsafe and invalid destinations", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,hello",
      "ftp://example.com",
      "https://",
      "https://bad url.com",
    ]) {
      expect(safeLinkUrl(url)).toBeUndefined();
    }
    expect(readLinkText("[bad](javascript:alert(1))").some((part) => part.url)).toBe(false);
  });
});
