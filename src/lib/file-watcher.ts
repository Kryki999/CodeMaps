import chokidar, { type FSWatcher } from "chokidar";
import { getDiagramFilePath } from "./diagram-io";

type ChangeCallback = () => void;

interface WatcherState {
  watcher: FSWatcher | null;
  subscribers: Set<ChangeCallback>;
  refCount: number;
}

const globalForWatcher = globalThis as typeof globalThis & {
  __diagramWatcher?: WatcherState;
};

function getState(): WatcherState {
  if (!globalForWatcher.__diagramWatcher) {
    globalForWatcher.__diagramWatcher = {
      watcher: null,
      subscribers: new Set(),
      refCount: 0,
    };
  }
  return globalForWatcher.__diagramWatcher;
}

function ensureWatcher(): FSWatcher {
  const state = getState();

  if (!state.watcher) {
    const filePath = getDiagramFilePath();
    state.watcher = chokidar.watch(filePath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });

    const notify = () => {
      for (const cb of state.subscribers) {
        cb();
      }
    };

    state.watcher.on("change", notify);
    state.watcher.on("add", notify);
  }

  return state.watcher;
}

export function subscribeToDiagramFile(callback: ChangeCallback): () => void {
  const state = getState();
  ensureWatcher();
  state.subscribers.add(callback);
  state.refCount += 1;

  return () => {
    state.subscribers.delete(callback);
    state.refCount -= 1;

    if (state.refCount <= 0 && state.watcher) {
      void state.watcher.close();
      state.watcher = null;
      state.refCount = 0;
    }
  };
}
