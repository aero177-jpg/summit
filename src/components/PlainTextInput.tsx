import React, { useEffect, useRef } from "react";

// Single-line plain-text field built on contenteditable instead of <input>: Chrome on Android shows its
// password/card/address autofill ribbon for text inputs regardless of autocomplete="off", but never for
// contenteditable, which is why the Lexical-based quick item title never had the ribbon.
export default function PlainTextInput({
  value,
  onChange,
  onEnter,
  placeholder = "",
  autoFocus = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Only write to the DOM when the value changes from outside (e.g. cleared after save) so the caret isn't reset
  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) ref.current.textContent = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={ref}
      className={`plainTextInput ${className}`}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      aria-placeholder={placeholder}
      data-placeholder={placeholder}
      enterKeyHint="done"
      spellCheck
      onInput={(e) => {
        const element = e.currentTarget;
        const text = (element.textContent ?? "").replace(/\n/g, " ");
        // Drop the stray <br> browsers leave behind so :empty shows the placeholder again
        if (!text) element.textContent = "";
        onChange(text);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        onEnter?.();
      }}
    />
  );
}
