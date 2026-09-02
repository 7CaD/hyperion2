export type ManagedTab = {
  active: boolean;
  audible: boolean;
  discarded: boolean;
  favIconUrl?: string;
  group?: ManagedTabGroup;
  groupId?: number;
  id: number;
  index: number;
  lastAccessed?: number;
  pinned: boolean;
  title: string;
  url: string;
  windowId: number;
};

export type ManagedTabGroup = {
  color: chrome.tabGroups.TabGroup["color"];
  id: number;
  title?: string;
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
    discarded: Boolean(tab.discarded),
    favIconUrl: tab.favIconUrl,
    groupId:
      typeof tab.groupId === "number" && tab.groupId !== -1
        ? tab.groupId
        : undefined,
    id: tab.id,
    index: tab.index ?? 0,
    lastAccessed: tab.lastAccessed,
    pinned: Boolean(tab.pinned),
    title: tab.title || tab.url || "Untitled tab",
    url: tab.url || "",
    windowId: tab.windowId,
  };
};

async function getTabGroupsById(): Promise<Record<number, ManagedTabGroup>> {
  if (!isExtensionRuntime() || !chrome.tabGroups?.query) {
    return {};
  }

  try {
    const tabGroups = await chrome.tabGroups.query({});

    return tabGroups.reduce<Record<number, ManagedTabGroup>>(
      (groupsById, group) => {
        groupsById[group.id] = {
          color: group.color,
          id: group.id,
          title: group.title?.trim() || undefined,
        };
        return groupsById;
      },
      {},
    );
  } catch {
    return {};
  }
}

export async function getAllTabs(): Promise<ManagedTab[]> {
  if (!isExtensionRuntime() || !chrome.tabs?.query) {
    return [];
  }

  const tabs = await chrome.tabs.query({});
  const managedTabs = tabs
    .map(toManagedTab)
    .filter((tab): tab is ManagedTab => tab !== null);
  const hasGroupedTabs = managedTabs.some(
    (tab) => typeof tab.groupId === "number",
  );
  const tabGroupsById = hasGroupedTabs ? await getTabGroupsById() : {};

  return managedTabs
    .map((tab) => ({
      ...tab,
      group:
        typeof tab.groupId === "number"
          ? tabGroupsById[tab.groupId]
          : undefined,
    }))
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
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

export async function closeTab(tabId: number) {
  if (!isExtensionRuntime()) {
    return;
  }

  await chrome.tabs.remove(tabId);
}

export async function suspendTabs(tabIds: number[]) {
  if (!isExtensionRuntime() || !chrome.tabs?.discard) {
    return;
  }

  await Promise.all(tabIds.map((tabId) => chrome.tabs.discard(tabId)));
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

export async function initializeMissingTabFrequencies(
  tabs: ManagedTab[],
  tabFrequencies: TabFrequencies,
): Promise<TabFrequencies> {
  const now = Date.now();
  const missingTabFrequencies = tabs.reduce<TabFrequencies>((records, tab) => {
    if (!tab.url || tabFrequencies[tab.url] || records[tab.url]) {
      return records;
    }

    records[tab.url] = { count: 0, lastActivatedAt: now };
    return records;
  }, {});

  if (Object.keys(missingTabFrequencies).length === 0) {
    return tabFrequencies;
  }

  const nextTabFrequencies = {
    ...tabFrequencies,
    ...missingTabFrequencies,
  };

  if (isExtensionRuntime() && chrome.storage?.local) {
    await chrome.storage.local.set({
      [TAB_FREQUENCIES_KEY]: nextTabFrequencies,
    });
  }

  return nextTabFrequencies;
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
