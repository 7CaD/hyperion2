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
}

export async function openDetachedWindow() {
  if (!isExtensionRuntime()) {
    return;
  }

  await chrome.runtime.sendMessage({ type: "OPEN_DETACHED" });
}
