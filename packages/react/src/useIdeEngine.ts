import { useSyncExternalStore } from "react";
import type { IdeEngine, IdeSnapshot } from "@bioide/core";

export function useIdeEngine(engine: IdeEngine): IdeSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => engine.subscribe(onStoreChange),
    () => engine.getSnapshot(),
    () => engine.getSnapshot(),
  );
}
