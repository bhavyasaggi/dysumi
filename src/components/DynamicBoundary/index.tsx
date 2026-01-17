import type React from "react";
import { useSyncExternalStore } from "react";

import { DynamicContext } from "./context";

function subscribeClean() {
  return;
}
function subscribe() {
  return subscribeClean;
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export default function DynamicBoundary(props: { children?: React.ReactNode }) {
  const clientReady = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return (
    <DynamicContext value={{ clientReady }}>{props.children}</DynamicContext>
  );
}
