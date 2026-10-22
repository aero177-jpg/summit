import { readLinkText } from "../utils/linkText";

export default function LinkText({ text }: { text?: string }) {
  return (
    <span className="linkTextDisplay">
      {readLinkText(text).map((part, index) =>
        part.url ? (
          <a
            key={index}
            className="inlineTextLink"
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}
