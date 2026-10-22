import React, { ComponentProps, Suspense, lazy } from "react";

// Lexical is split out of the startup bundle and preloaded once the app is idle, so editors open without a delay
const loadEditor = () => import("./LinkTextEditor");
const LinkTextEditor = lazy(loadEditor);

if (typeof window !== "undefined") {
  const preload = () => void loadEditor();
  if ("requestIdleCallback" in window) window.requestIdleCallback(preload);
  else setTimeout(preload, 1000);
}

type Props = ComponentProps<typeof LinkTextEditor>;

export default function LazyLinkTextEditor(props: Props) {
  return (
    <Suspense fallback={null}>
      <LinkTextEditor {...props} />
    </Suspense>
  );
}
