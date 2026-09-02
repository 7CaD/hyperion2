export type ManagedTab = {
  active: boolean;
  audible: boolean;
  favIconUrl?: string;
  id: number;
  index: number;
  lastAccessed?: number;
  pinned: boolean;
  title: string;
  url: string;
  windowId: number;
};

type TabFrequencyRecord = {
  count: number;
  lastActivatedAt: number;
};

export type TabFrequencies = Record<string, TabFrequencyRecord>;

const TAB_FREQUENCIES_KEY = "tabFrequencies";

const isExtensionRuntime = () =>
  typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);

const toManagedTab = (tab: chrome.tabs.Tab): ManagedTab | null => {
  if (typeof tab.id !== "number" || typeof tab.windowId !== "number") {
    return null;
  }

  return {
    active: Boolean(tab.active),
    audible: Boolean(tab.audible),
    favIconUrl: tab.favIconUrl,
    id: tab.id,
    index: tab.index ?? 0,
    lastAccessed: tab.lastAccessed,
    pinned: Boolean(tab.pinned),
    title: tab.title || tab.url || "Untitled tab",
    url: tab.url || "",
    windowId: tab.windowId,
  };
};

export async function getAllTabs(): Promise<ManagedTab[]> {
  if (!isExtensionRuntime() || !chrome.tabs?.query) {
    return [];
  }

  const tabs = await chrome.tabs.query({});

  return tabs
    .map(toManagedTab)
    .filter((tab): tab is ManagedTab => tab !== null)
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        b.windowId - a.windowId ||
        a.index - b.index,
    );
}

export async function activateTab(tab: ManagedTab) {
  if (!isExtensionRuntime()) {
    return;
  }

  await incrementTabFrequency(tab.url);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
}

export async function closeTab(tabId: number) {
  if (!isExtensionRuntime()) {
    return;
  }

  await chrome.tabs.remove(tabId);
}

export async function getPreferDetached() {
  if (!isExtensionRuntime() || !chrome.storage?.local) {
    return false;
  }

  const { preferDetached } = await chrome.storage.local.get({
    preferDetached: false,
  });

  return Boolean(preferDetached);
}

export async function setPreferDetached(preferDetached: boolean) {
  if (!isExtensionRuntime() || !chrome.storage?.local) {
    return;
  }

  await chrome.storage.local.set({ preferDetached });

  try {
    await chrome.runtime.sendMessage({
      preferDetached,
      type: "PREFER_DETACHED_CHANGED",
    });
  } catch {
    // Storage is the source of truth; the background syncs from it when awakened.
  }
}

export async function getTabFrequencies(): Promise<TabFrequencies> {
  if (!isExtensionRuntime() || !chrome.storage?.local) {
    return {};
  }

  const result = await chrome.storage.local.get({
    [TAB_FREQUENCIES_KEY]: {},
  });

  return result[TAB_FREQUENCIES_KEY] as TabFrequencies;
}

async function incrementTabFrequency(url: string) {
  if (!url || !isExtensionRuntime() || !chrome.storage?.local) {
    return;
  }

  const frequencies = await getTabFrequencies();
  const current = frequencies[url] ?? { count: 0, lastActivatedAt: 0 };

  await chrome.storage.local.set({
    [TAB_FREQUENCIES_KEY]: {
      ...frequencies,
      [url]: {
        count: current.count + 1,
        lastActivatedAt: Date.now(),
      },
    },
  });
}

export async function openDetachedWindow() {
  if (!isExtensionRuntime()) {
    return;
  }

  await chrome.runtime.sendMessage({ type: "OPEN_DETACHED" });
}
