import MarkdownIt from "markdown-it";
import LinkifyIt from "linkify-it";

export type LinkTextPart = { text: string; url?: string };

const parser = new MarkdownIt({ html: false, linkify: false }).disable([
  "autolink",
  "backticks",
  "emphasis",
  "entity",
  "image",
  "strikethrough",
]);
const detector = new LinkifyIt({ fuzzyLink: true, fuzzyEmail: false }).add("ftp:", null).add("mailto:", null);
parser.validateLink = (url) => !!safeLinkUrl(url);

export function safeLinkUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!/^(https?:\/\/|www\.)/i.test(trimmed) || /\s/.test(trimmed)) return undefined;
  try {
    const url = new URL(/^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function detectTextLinks(text: string): LinkTextPart[] {
  const matches = detector.match(text) ?? [];
  const parts: LinkTextPart[] = [];
  let offset = 0;
  for (const match of matches) {
    const url = safeLinkUrl(match.raw);
    if (!url) continue;
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index) });
    parts.push({ text: match.raw, url });
    offset = match.lastIndex;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}

export function readLinkText(value = "", detectUrls = true): LinkTextPart[] {
  const tokens = parser.parseInline(value, {})[0]?.children ?? [];
  if (!tokens.some((token) => token.type === "link_open")) {
    return detectUrls ? detectTextLinks(value) : [{ text: value }];
  }
  const parts: LinkTextPart[] = [];
  let destination: string | undefined;
  for (const token of tokens) {
    if (token.type === "link_open") {
      destination = safeLinkUrl(token.attrGet("href") ?? "");
      if (destination) parts.push({ text: "", url: destination });
    } else if (token.type === "link_close") destination = undefined;
    else {
      const text = token.type === "softbreak" || token.type === "hardbreak" ? "\n" : token.content;
      if (destination) {
        parts[parts.length - 1].text += text;
      } else parts.push(...(detectUrls ? detectTextLinks(text) : [{ text }]));
    }
  }
  return parts;
}

export function writeLinkText(parts: LinkTextPart[]): string {
  const hasLabels = parts.some((part) => part.url && safeLinkUrl(part.text) !== safeLinkUrl(part.url));
  if (!hasLabels) return parts.map((part) => part.text).join("");
  const escape = (text: string) => text.replace(/[\\[\]]/g, "\\$&");
  return parts
    .map(({ text, url }) => {
      const destination = url && safeLinkUrl(url);
      if (!destination || safeLinkUrl(text) === destination) return escape(text);
      return `[${escape(text)}](<${destination.replace(/</g, "%3C").replace(/>/g, "%3E")}>)`;
    })
    .join("");
}
