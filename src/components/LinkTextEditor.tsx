import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { $createLinkNode, $isLinkNode, LinkNode } from "@lexical/link";
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $setSelection,
  $isElementNode,
  $isTextNode,
  $isLineBreakNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  PASTE_COMMAND,
} from "lexical";
import type { LexicalNode } from "lexical";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import PortalModal from "./PortalModal";
import { Button } from "./Button";
import { detectTextLinks, readLinkText, safeLinkUrl, writeLinkText } from "../utils/linkText";
import type { LinkTextPart } from "../utils/linkText";

type Props = {
  value?: string;
  onChange: (value: string) => void;
  singleLine?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
  controls?: ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  onBlur?: () => void;
  onGridPaste?: (text: string) => void;
};
type LinkDraft = { key: string; start?: number; end?: number; url: string; label: string };

function loadText(value: string, singleLine: boolean) {
  const root = $getRoot();
  root.clear();
  const lines = (singleLine ? value.replace(/\r?\n/g, " ") : value).split("\n");
  for (const line of lines) {
    const paragraph = $createParagraphNode();
    for (const part of readLinkText(line, false)) {
      const text = $createTextNode(part.text);
      paragraph.append(part.url ? $createLinkNode(part.url).append(text) : text);
    }
    root.append(paragraph);
  }
}

function nodeParts(node: LexicalNode): LinkTextPart[] {
  if ($isLinkNode(node)) return [{ text: node.getTextContent(), url: node.getURL() }];
  if ($isTextNode(node)) return [{ text: node.getTextContent() }];
  if ($isLineBreakNode(node)) return [{ text: "\n" }];
  return $isElementNode(node) ? node.getChildren().flatMap(nodeParts) : [];
}

function serializeText(): string {
  const parts: LinkTextPart[] = [];
  $getRoot()
    .getChildren()
    .forEach((node, index) => {
      if (index) parts.push({ text: "\n" });
      parts.push(...nodeParts(node));
    });
  return writeLinkText(parts);
}

function findLinks(): LinkDraft[] {
  const links: LinkDraft[] = [];
  const seen = new Set<string>();
  for (const node of $getRoot().getAllTextNodes()) {
    const parent = node.getParent();
    if ($isLinkNode(parent)) {
      if (seen.has(parent.getKey())) continue;
      seen.add(parent.getKey());
      links.push({
        key: parent.getKey(),
        url: parent.getURL(),
        label: safeLinkUrl(parent.getTextContent()) === safeLinkUrl(parent.getURL()) ? "" : parent.getTextContent(),
      });
    } else {
      let offset = 0;
      for (const part of detectTextLinks(node.getTextContent())) {
        if (part.url)
          links.push({ key: node.getKey(), start: offset, end: offset + part.text.length, url: part.text, label: "" });
        offset += part.text.length;
      }
    }
  }
  return links;
}

function LinkModal({
  links,
  onApply,
  onClose,
}: {
  links: LinkDraft[];
  onApply: (links: LinkDraft[]) => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState(links);
  const dialogRef = useRef<HTMLDivElement>(null);
  const valid = drafts.every((link) => safeLinkUrl(link.url));
  const update = (index: number, patch: Partial<LinkDraft>) =>
    setDrafts((current) => current.map((link, position) => (position === index ? { ...link, ...patch } : link)));
  return (
    <PortalModal showModal handleCloseCB={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit links"
        className="linkEditorModal"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") {
            const controls = dialogRef.current?.querySelectorAll<HTMLElement>("input, button:not(:disabled)");
            if (!controls?.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="linkEditorFields">
          {drafts.map((link, index) => (
            <fieldset key={`${link.key}-${link.start ?? "link"}`} aria-label={`Link ${index + 1}`}>
              <label>
                <span>URL</span>
                <input
                  autoFocus={index === 0}
                  type="text"
                  inputMode="url"
                  value={link.url}
                  aria-invalid={!safeLinkUrl(link.url)}
                  onChange={(event) => update(index, { url: event.target.value })}
                />
              </label>
              {!safeLinkUrl(link.url) && <span role="alert">Enter an http or https URL.</span>}
              <label>
                <span>Display text</span>
                <input
                  type="text"
                  placeholder="Leave blank to show the URL"
                  value={link.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
              </label>
            </fieldset>
          ))}
        </div>
        <div className="linkEditorActions">
          <Button type="button" color="#808080" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} /> Cancel
          </Button>
          <Button type="button" color="#618576" disabled={!valid} onClick={() => onApply(drafts)}>
            <FontAwesomeIcon icon={faCheck} /> Apply
          </Button>
        </div>
      </div>
    </PortalModal>
  );
}

function EditorBody(props: Props) {
  const [editor] = useLexicalComposerContext();
  const [historyState] = useState(() => ({
    current: { editor, editorState: editor.getEditorState() },
    undoStack: [],
    redoStack: [],
  }));
  const [links, setLinks] = useState<LinkDraft[] | null>(null);
  const [hasLinks, setHasLinks] = useState(false);
  const modalOpen = useRef(false);
  const emitted = useRef(props.value ?? "");
  const currentProps = useRef(props);
  currentProps.current = props;
  const selection = useRef<ReturnType<typeof $getSelection>>(null);

  useEffect(() => {
    const value = props.value ?? "";
    if (value === emitted.current) return;
    emitted.current = value;
    editor.update(() => loadText(value, !!props.singleLine), { tag: "external-value" });
  }, [editor, props.value, props.singleLine]);

  useEffect(() => {
    historyState.current = { editor, editorState: editor.getEditorState() };
    editor.getEditorState().read(() => setHasLinks(findLinks().length > 0));
    if (props.autoFocus) editor.focus();
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!currentProps.current.singleLine || event?.isComposing) return false;
        event?.preventDefault();
        currentProps.current.onSubmit?.();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        if (!currentProps.current.onCancel) return false;
        event.preventDefault();
        event.stopPropagation();
        currentProps.current.onCancel();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const removePaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const text = event && "clipboardData" in event ? event.clipboardData?.getData("text/plain") : undefined;
        if (text?.includes("\t") && currentProps.current.onGridPaste) {
          event?.preventDefault();
          currentProps.current.onGridPaste(text);
          return true;
        }
        if (text && currentProps.current.singleLine && /[\r\n]/.test(text)) {
          event?.preventDefault();
          const active = $getSelection();
          if (active && "insertText" in active) active.insertText(text.replace(/\r?\n/g, " "));
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return () => {
      removeEnter();
      removeEscape();
      removePaste();
    };
  }, [editor]);

  const closeModal = () => {
    modalOpen.current = false;
    editor.setEditable(true);
    setLinks(null);
    editor.update(() => $setSelection(selection.current));
    editor.focus();
  };
  const applyLinks = (drafts: LinkDraft[]) => {
    editor.update(
      () => {
        for (const draft of [...drafts].reverse()) {
          const node = $getNodeByKey(draft.key);
          const url = safeLinkUrl(draft.url);
          if (!node || !url) continue;
          const text = draft.label.trim() ? draft.label : draft.url.trim();
          if ($isLinkNode(node)) {
            node.replace($createLinkNode(url).append($createTextNode(text)));
          } else if ($isTextNode(node) && draft.start !== undefined && draft.end !== undefined) {
            const pieces = node.splitText(draft.start, draft.end);
            const target = pieces[draft.start === 0 ? 0 : 1];
            target.replace($createLinkNode(url).append($createTextNode(text)));
          }
        }
        $getRoot().selectEnd();
        selection.current = $getSelection()?.clone() ?? null;
      },
      { tag: "history-push", discrete: true },
    );
    closeModal();
  };

  return (
    <div
      className={`linkTextEditor ${props.singleLine ? "linkTextEditorSingle" : ""}`}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        if (!modalOpen.current && !event.currentTarget.contains(event.relatedTarget as Node | null)) props.onBlur?.();
      }}
    >
      <div className="linkTextEditorInput">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={props.className ?? "itemCommentInput itemCommentText"}
              aria-label={props.label ?? (props.singleLine ? "Item title" : "Comment")}
              aria-multiline={!props.singleLine}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) event.preventDefault();
              }}
            />
          }
          placeholder={props.placeholder ? <span className="linkTextPlaceholder">{props.placeholder}</span> : null}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <div className="linkTextEditorControls">
        {hasLinks && (
          <span title="Edit links" onMouseDown={(event) => event.preventDefault()}>
            <Button
              type="button"
              color="#617385"
              onClick={() => {
                editor.getEditorState().read(() => {
                  selection.current = $getSelection()?.clone() ?? selection.current;
                  setLinks(findLinks());
                });
                modalOpen.current = true;
                editor.setEditable(false);
              }}
            >
              <FontAwesomeIcon icon={faLink} />
              <span className="sr-only">Edit links</span>
            </Button>
          </span>
        )}
        {props.controls}
      </div>
      <OnChangePlugin
        onChange={(state, _editor, tags) => {
          state.read(() => {
            const value = serializeText();
            if (!modalOpen.current) selection.current = $getSelection()?.clone() ?? selection.current;
            setHasLinks(findLinks().length > 0);
            if (tags.has("external-value")) {
              historyState.current = { editor, editorState: state };
              historyState.undoStack.length = 0;
              historyState.redoStack.length = 0;
              return;
            }
            if (value !== emitted.current) {
              emitted.current = value;
              currentProps.current.onChange(value);
            }
          });
        }}
      />
      <HistoryPlugin externalHistoryState={historyState} />
      {links && <LinkModal links={links} onApply={applyLinks} onClose={closeModal} />}
    </div>
  );
}

export default function LinkTextEditor(props: Props) {
  const initialConfig = useRef({
    namespace: "LinkTextEditor",
    nodes: [LinkNode],
    theme: { link: "inlineTextLink" },
    onError: (error: Error) => {
      throw error;
    },
    editorState: () => loadText(props.value ?? "", !!props.singleLine),
  });
  return (
    <LexicalComposer initialConfig={initialConfig.current}>
      <EditorBody {...props} />
    </LexicalComposer>
  );
}
