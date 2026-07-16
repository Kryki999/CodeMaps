import chokidar, { type FSWatcher } from "chokidar";
import { getDiagramFilePath } from "./diagram-io";

type ChangeCallback = () => void;

interface WatcherState {
  watcher: FSWatcher | null;
  subscribers: Set<ChangeCallback>;
  refCount: number;
  watchedPath: string | null;
  initPromise: Promise<void> | null;
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
      watchedPath: null,
      initPromise: null,
    };
  }
  return globalForWatcher.__diagramWatcher;
}

async function ensureWatcher(): Promise<FSWatcher> {
  const state = getState();

  if (state.watcher) return state.watcher;

  if (!state.initPromise) {
    state.initPromise = (async () => {
      const filePath = await getDiagramFilePath();
      state.watchedPath = filePath;
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
    })().finally(() => {
      state.initPromise = null;
    });
  }

  await state.initPromise;
  if (!state.watcher) {
    throw new Error("Failed to initialize diagram file watcher");
  }
  return state.watcher;
}

export function subscribeToDiagramFile(callback: ChangeCallback): () => void {
  const state = getState();
  state.subscribers.add(callback);
  state.refCount += 1;

  void ensureWatcher();

  return () => {
    state.subscribers.delete(callback);
    state.refCount -= 1;

    if (state.refCount <= 0 && state.watcher) {
      void state.watcher.close();
      state.watcher = null;
      state.watchedPath = null;
      state.refCount = 0;
    }
  };
}

/** Restart watcher after project root / diagram path changes. */
export async function restartDiagramWatcher(): Promise<void> {
  const state = getState();
  if (state.watcher) {
    await state.watcher.close();
    state.watcher = null;
    state.watchedPath = null;
  }
  if (state.refCount > 0) {
    await ensureWatcher();
  }
}
