import { useVirtualizer } from "@tanstack/react-virtual";
import Fuse from "fuse.js";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Loader2,
  Pin,
  Settings,
  Snowflake,
  Trash,
  Volume2,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Kbd, KbdGroup } from "./components/ui/kbd";
import { ScrollArea } from "./components/ui/scroll-area";
import {
  activateTab,
  closeTab,
  getAllTabs,
  getPreferDetached,
  getTabFrequencies,
  initializeMissingTabFrequencies,
  openDetachedWindow,
  setPreferDetached,
  suspendTabs,
  type ManagedTab,
  type ManagedTabGroup,
  type TabFrequencies,
} from "./lib/chrome-tabs";
import { cn } from "./lib/utils";

const SETTINGS_COMMAND = "/settings";
const DUPLICATES_COMMAND = "/duplicates";
const LEAST_FREQUENTED_COMMAND = "/least-frequented";
const MOST_FREQUENT_TAB_LIMIT = 3;
const LEAST_FREQUENTED_LAST_SELECTED_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
const commandMatchesQuery = (command: string, query: string) =>
  query === "/" || command.startsWith(query);
const TAB_GROUP_BADGE_CLASSES: Record<ManagedTabGroup["color"], string> = {
  blue: "bg-blue-500 text-blue-700",
  cyan: "bg-cyan-500 text-cyan-700",
  green: "bg-green-300 text-green-700",
  grey: "bg-gray-300 text-gray-800",
  orange: "bg-orange-500 text-orange-700",
  pink: "bg-pink-300/90 text-pink-950",
  purple: "bg-purple-400 text-purple-950",
  red: "bg-red-400 text-red-950",
  yellow: "bg-yellow-200 text-yellow-900",
};

type NavigateTo = (path: string) => void;
type DuplicateTabGroup = {
  count: number;
  tab: ManagedTab;
  tabs: ManagedTab[];
  url: string;
};
type DuplicateTabData = {
  groupsByUrl: Record<string, DuplicateTabGroup>;
  tabCount: number;
  tabGroups: DuplicateTabGroup[];
  tabs: ManagedTab[];
  urlCounts: Record<string, number>;
};

const emptyDuplicateTabData: DuplicateTabData = {
  groupsByUrl: {},
  tabCount: 0,
  tabGroups: [],
  tabs: [],
  urlCounts: {},
};

const removeTabsById = (tabs: ManagedTab[], tabIds: Set<number>) =>
  tabs.filter((tab) => !tabIds.has(tab.id));

const restoreTabsBySnapshot = (
  currentTabs: ManagedTab[],
  snapshotTabs: ManagedTab[],
  tabIdsToRestore: Set<number>,
) => {
  const currentTabsById = new Map(currentTabs.map((tab) => [tab.id, tab]));
  const snapshotTabIds = new Set(snapshotTabs.map((tab) => tab.id));
  const hasMissingTabToRestore = snapshotTabs.some(
    (tab) => tabIdsToRestore.has(tab.id) && !currentTabsById.has(tab.id),
  );

  if (!hasMissingTabToRestore) {
    return currentTabs;
  }

  const restoredSnapshotTabs: ManagedTab[] = [];

  for (const tab of snapshotTabs) {
    const currentTab = currentTabsById.get(tab.id);

    if (currentTab) {
      restoredSnapshotTabs.push(currentTab);
    } else if (tabIdsToRestore.has(tab.id)) {
      restoredSnapshotTabs.push(tab);
    }
  }

  return [
    ...restoredSnapshotTabs,
    ...currentTabs.filter((tab) => !snapshotTabIds.has(tab.id)),
  ];
};

type TabListRow =
  | {
      key: string;
      title: string;
      type: "section-header";
      divided?: boolean;
    }
  | {
      key: string;
      selectableIndex: number;
      type: "suspend-least-frequent";
    }
  | {
      key: string;
      selectableIndex: number;
      type: "close-least-frequent";
    }
  | {
      key: string;
      selectableIndex: number;
      tab: ManagedTab;
      type: "tab";
      visibleTabIndex: number;
    }
  | {
      key: string;
      selectableIndex: number;
      type: "duplicates-summary";
    }
  | {
      key: string;
      selectableIndex: number;
      type: "least-frequented-summary";
    }
  | {
      key: string;
      selectableIndex: number;
      type: "settings-command";
    };

const scheduleAsyncWork = (work: () => void) => {
  if (window.requestIdleCallback && window.cancelIdleCallback) {
    const idleCallbackId = window.requestIdleCallback(work, { timeout: 100 });

    return () => window.cancelIdleCallback(idleCallbackId);
  }

  const timeoutId = window.setTimeout(work, 0);

  return () => window.clearTimeout(timeoutId);
};

function TabGroupBadge({ group }: { group: ManagedTabGroup }) {
  return (
    <span
      className={cn(
        "max-w-24 flex-none truncate rounded-[4px] border-none px-1.5 py-1 text-[11px] font-medium leading-none",
        TAB_GROUP_BADGE_CLASSES[group.color],
      )}
      title={group.title || "Untitled group"}
    >
      {group.title || "Group"}
    </span>
  );
}

function IncognitoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className={className}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.807 5.78c-.026.481.365.856.847.862c1.069.014 2.505-.031 3.346-.031c.84 0 2.277.045 3.346.031c.482-.006.872-.38.846-.862c-.072-1.344-.554-2.874-.85-3.838a1.09 1.09 0 0 0-.93-.766C8.636 1.1 7.829 1.011 7 1.011c-.83 0-1.636.089-2.412.165c-.433.043-.802.35-.93.766c-.297.964-.778 2.494-.85 3.838M1 6.645h12m-7.018 4.149a1.88 1.88 0 0 1 2.036 0" />
        <path d="M4.117 12.88c1.197 0 1.87-.673 1.87-1.87c0-1.196-.673-1.87-1.87-1.87s-1.87.674-1.87 1.87s.673 1.87 1.87 1.87m5.765.04c1.197 0 1.87-.674 1.87-1.87s-.673-1.87-1.87-1.87c-1.196 0-1.87.673-1.87 1.87c0 1.196.674 1.87 1.87 1.87" />
      </g>
    </svg>
  );
}

function TabSectionHeader({
  divided = false,
  title,
}: {
  divided?: boolean;
  title: string;
}) {
  return (
    <section
      className={cn(
        divided ? "mx-2 mt-2 border-t border-border/70 pt-2" : "px-2 pb-1 pt-1",
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
    </section>
  );
}

const compareTabsByPosition = (a: ManagedTab, b: ManagedTab) =>
  Number(b.active) - Number(a.active) ||
  (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0) ||
  b.windowId - a.windowId ||
  a.index - b.index;

const compareTabsByFrequency =
  (tabFrequencies: TabFrequencies) => (a: ManagedTab, b: ManagedTab) => {
    const aFrequency = tabFrequencies[a.url];
    const bFrequency = tabFrequencies[b.url];

    return (
      (bFrequency?.count ?? 0) - (aFrequency?.count ?? 0) ||
      (bFrequency?.lastActivatedAt ?? 0) - (aFrequency?.lastActivatedAt ?? 0) ||
      compareTabsByPosition(a, b)
    );
  };

const getMostFrequentTabs = (
  tabs: ManagedTab[],
  tabFrequencies: TabFrequencies,
) =>
  [...tabs]
    .sort(compareTabsByFrequency(tabFrequencies))
    .slice(0, MOST_FREQUENT_TAB_LIMIT);

const compareTabsByLeastFrequency =
  (tabFrequencies: TabFrequencies) => (a: ManagedTab, b: ManagedTab) => {
    const aFrequency = tabFrequencies[a.url];
    const bFrequency = tabFrequencies[b.url];

    return (
      (aFrequency?.count ?? 0) - (bFrequency?.count ?? 0) ||
      (aFrequency?.lastActivatedAt ?? 0) - (bFrequency?.lastActivatedAt ?? 0) ||
      compareTabsByPosition(a, b)
    );
  };

const getLeastFrequentSuspendableTabs = (
  tabs: ManagedTab[],
  tabFrequencies: TabFrequencies,
) => {
  const lastSelectedCutoff =
    Date.now() - LEAST_FREQUENTED_LAST_SELECTED_THRESHOLD_MS;

  return [...tabs]
    .filter((tab) => {
      const lastSelectedAt = tabFrequencies[tab.url]?.lastActivatedAt ?? 0;

      return (
        !tab.active &&
        !tab.pinned &&
        !tab.audible &&
        !tab.discarded &&
        lastSelectedAt < lastSelectedCutoff
      );
    })
    .sort(compareTabsByLeastFrequency(tabFrequencies));
};

const getDuplicateTabData = (tabs: ManagedTab[]): DuplicateTabData => {
  const groupsByUrl = tabs.reduce<Record<string, ManagedTab[]>>(
    (groups, tab) => {
      groups[tab.url] ??= [];
      groups[tab.url].push(tab);
      return groups;
    },
    {},
  );

  const urlCounts = Object.fromEntries(
    Object.entries(groupsByUrl).map(([url, groupTabs]) => [
      url,
      groupTabs.length,
    ]),
  );

  const tabGroups = Object.entries(groupsByUrl)
    .filter(([, groupTabs]) => groupTabs.length > 1)
    .map<DuplicateTabGroup>(([url, groupTabs]) => {
      const sortedGroupTabs = [...groupTabs].sort(compareTabsByPosition);

      return {
        count: sortedGroupTabs.length,
        tab: sortedGroupTabs[0],
        tabs: sortedGroupTabs,
        url,
      };
    })
    .sort((a, b) => {
      const countDifference = urlCounts[b.url] - urlCounts[a.url];

      return (
        countDifference ||
        a.url.localeCompare(b.url) ||
        compareTabsByPosition(a.tab, b.tab)
      );
    });

  return {
    groupsByUrl: tabGroups.reduce<Record<string, DuplicateTabGroup>>(
      (groups, group) => {
        groups[group.url] = group;
        return groups;
      },
      {},
    ),
    tabCount: tabGroups.reduce((count, group) => count + group.count, 0),
    tabGroups,
    tabs: tabGroups.map((group) => group.tab),
    urlCounts,
  };
};

function getCurrentPath() {
  return window.location.pathname;
}

function App() {
  const [path, setPath] = useState(getCurrentPath);
  const [isDetached] = useState(
    () => new URLSearchParams(window.location.search).get("detached") === "1",
  );

  useEffect(() => {
    if (isDetached) {
      return;
    }

    let isCurrent = true;

    getPreferDetached()
      .then(async (preferDetached) => {
        if (!isCurrent || !preferDetached) {
          return;
        }

        await openDetachedWindow();
        window.close();
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [isDetached]);

  useEffect(() => {
    const handlePopState = () => setPath(getCurrentPath());

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isDetached) {
      return;
    }

    const handleWindowBlur = () => {
      window.setTimeout(() => {
        if (!document.hasFocus()) {
          window.close();
        }
      }, 0);
    };

    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isDetached]);

  const navigateTo: NavigateTo = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(getCurrentPath());
  };

  const isSettingsPage = path === SETTINGS_COMMAND;

  return (
    <main
      className={cn(
        "h-screen min-h-[470.4px] bg-background text-foreground",
        isDetached && "min-h-screen",
      )}
    >
      {isSettingsPage ? (
        <SettingsPage navigateTo={navigateTo} />
      ) : (
        <TabSwitcherPage navigateTo={navigateTo} />
      )}
    </main>
  );
}

function TabSwitcherPage({ navigateTo }: { navigateTo: NavigateTo }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [tabFrequencies, setTabFrequencies] = useState<TabFrequencies>({});
  const [mostFrequentTabs, setMostFrequentTabs] = useState<ManagedTab[]>([]);
  const [leastFrequentSuspendableTabs, setLeastFrequentSuspendableTabs] =
    useState<ManagedTab[]>([]);
  const [duplicateTabData, setDuplicateTabData] = useState<DuplicateTabData>(
    emptyDuplicateTabData,
  );
  const [preparedTabs, setPreparedTabs] = useState(tabs);
  const [preparedTabFrequencies, setPreparedTabFrequencies] =
    useState(tabFrequencies);
  const [fuseState, setFuseState] = useState<{
    fuse: Fuse<ManagedTab> | null;
    tabs: ManagedTab[];
  }>({ fuse: null, tabs });
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMetaActionsRevealed, setIsMetaActionsRevealed] = useState(false);
  const [selectedAdditionalActionIndex, setSelectedAdditionalActionIndex] =
    useState(0);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getAllTabs(), getTabFrequencies()])
      .then(async ([nextTabs, nextTabFrequencies]) => {
        const initializedTabFrequencies = await initializeMissingTabFrequencies(
          nextTabs,
          nextTabFrequencies,
        );

        if (isCurrent) {
          setTabs(nextTabs);
          setTabFrequencies(initializedTabFrequencies);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const cancel = scheduleAsyncWork(() => {
      const nextMostFrequentTabs =
        tabs.length === 0 ? [] : getMostFrequentTabs(tabs, tabFrequencies);
      const nextLeastFrequentSuspendableTabs =
        tabs.length === 0
          ? []
          : getLeastFrequentSuspendableTabs(tabs, tabFrequencies);
      const nextDuplicateTabData =
        tabs.length === 0 ? emptyDuplicateTabData : getDuplicateTabData(tabs);

      if (isCurrent) {
        setMostFrequentTabs(nextMostFrequentTabs);
        setLeastFrequentSuspendableTabs(nextLeastFrequentSuspendableTabs);
        setDuplicateTabData(nextDuplicateTabData);
        setPreparedTabs(tabs);
        setPreparedTabFrequencies(tabFrequencies);
      }
    });

    return () => {
      isCurrent = false;
      cancel();
    };
  }, [tabFrequencies, tabs]);

  useEffect(() => {
    let isCurrent = true;

    const cancel = scheduleAsyncWork(() => {
      const nextFuse =
        tabs.length === 0
          ? null
          : new Fuse(tabs, {
              includeScore: true,
              keys: [
                {
                  name: "group.title",
                  weight: 2,
                },
                { name: "title", weight: 0.7 },
                { name: "url", weight: 0.3 },
              ],
              threshold: 0.6,
              distance: 1000,
            });

      if (isCurrent) {
        setFuseState({ fuse: nextFuse, tabs });
      }
    });

    return () => {
      isCurrent = false;
      cancel();
    };
  }, [tabs]);

  const trimmedQuery = query.trim();
  const isBaseState = trimmedQuery.length === 0;
  const isCommandSearch = trimmedQuery.startsWith("/");
  const isDuplicatesQuery = trimmedQuery === DUPLICATES_COMMAND;
  const isLeastFrequentedQuery = trimmedQuery === LEAST_FREQUENTED_COMMAND;
  const showSettingsCommand =
    isCommandSearch && commandMatchesQuery(SETTINGS_COMMAND, trimmedQuery);
  const duplicateUrlCounts = duplicateTabData.urlCounts;
  const duplicateTabs = duplicateTabData.tabs;
  const duplicateTabCount = duplicateTabData.tabCount;
  const duplicateGroupsByUrl = duplicateTabData.groupsByUrl;
  const fuse = fuseState.tabs === tabs ? fuseState.fuse : null;
  const isPreparingTabs =
    preparedTabs !== tabs || preparedTabFrequencies !== tabFrequencies;
  const isCleanupCommandActive = isDuplicatesQuery || isLeastFrequentedQuery;
  const isPreparingSearch =
    !isCommandSearch && tabs.length > 0 && fuseState.tabs !== tabs;
  const showDuplicatesSummary =
    (isCommandSearch &&
      !isCleanupCommandActive &&
      commandMatchesQuery(DUPLICATES_COMMAND, trimmedQuery)) ||
    (isBaseState && duplicateTabData.tabGroups.length > 0);
  const showLeastFrequentedSummary =
    (isCommandSearch &&
      !isCleanupCommandActive &&
      commandMatchesQuery(LEAST_FREQUENTED_COMMAND, trimmedQuery)) ||
    (isBaseState && leastFrequentSuspendableTabs.length > 0);
  const showSuspendLeastFrequentAction =
    isLeastFrequentedQuery && leastFrequentSuspendableTabs.length > 0;
  const showCloseLeastFrequentAction = showSuspendLeastFrequentAction;
  const showTabCleanupSection =
    showDuplicatesSummary || showLeastFrequentedSummary;
  const isSearchQuery =
    !isBaseState &&
    !isCommandSearch &&
    !isDuplicatesQuery &&
    !isLeastFrequentedQuery &&
    !showSettingsCommand;
  const isSearchPending = isSearchQuery && tabs.length > 0 && !fuse;
  const isDuplicatesPending =
    isDuplicatesQuery && tabs.length > 0 && isPreparingTabs;

  const visibleTabs = useMemo(() => {
    if (isBaseState) {
      return mostFrequentTabs;
    }

    if (isDuplicatesQuery) {
      return duplicateTabs;
    }

    if (isLeastFrequentedQuery) {
      return leastFrequentSuspendableTabs;
    }

    if (isCommandSearch || showSettingsCommand) {
      return [];
    }

    if (!fuse) {
      return [];
    }

    return fuse
      .search(trimmedQuery)
      .sort(
        (a, b) =>
          (a.score ?? Number.POSITIVE_INFINITY) -
            (b.score ?? Number.POSITIVE_INFINITY) ||
          (tabFrequencies[b.item.url]?.count ?? 0) -
            (tabFrequencies[a.item.url]?.count ?? 0),
      )
      .map((result) => result.item);
  }, [
    duplicateTabs,
    fuse,
    isBaseState,
    isCommandSearch,
    isDuplicatesQuery,
    isLeastFrequentedQuery,
    leastFrequentSuspendableTabs,
    mostFrequentTabs,
    showSettingsCommand,
    tabFrequencies,
    trimmedQuery,
  ]);
  const showBusyIndicator =
    isLoading || isPreparingTabs || isPreparingSearch || isSearchPending;

  const leadingActionCount =
    Number(showSuspendLeastFrequentAction) +
    Number(showCloseLeastFrequentAction);
  const visibleTabStartIndex = leadingActionCount;
  const itemCount =
    leadingActionCount +
    visibleTabs.length +
    Number(showDuplicatesSummary) +
    Number(showLeastFrequentedSummary) +
    Number(showSettingsCommand);
  const activeIndex =
    itemCount === 0 ? 0 : Math.min(selectedIndex, itemCount - 1);
  const selectedVisibleTabIndex = activeIndex - visibleTabStartIndex;
  const isDuplicatesSummarySelected =
    showDuplicatesSummary &&
    activeIndex === visibleTabStartIndex + visibleTabs.length;
  const isSuspendLeastFrequentSelected =
    showSuspendLeastFrequentAction && activeIndex === 0;
  const isCloseLeastFrequentSelected =
    showCloseLeastFrequentAction &&
    activeIndex === Number(showSuspendLeastFrequentAction);
  const isLeastFrequentedSummarySelected =
    showLeastFrequentedSummary &&
    activeIndex ===
      visibleTabStartIndex + visibleTabs.length + Number(showDuplicatesSummary);
  const isSettingsCommandSelected =
    showSettingsCommand &&
    activeIndex ===
      visibleTabStartIndex +
        visibleTabs.length +
        Number(showDuplicatesSummary) +
        Number(showLeastFrequentedSummary);

  const selectedTab =
    selectedVisibleTabIndex >= 0
      ? visibleTabs[selectedVisibleTabIndex]
      : undefined;
  const selectedTabId = selectedTab?.id;
  const selectedDuplicateGroup =
    isDuplicatesQuery && selectedTab
      ? duplicateGroupsByUrl[selectedTab.url]
      : undefined;

  useEffect(() => {
    setIsMetaActionsRevealed(false);
    setSelectedAdditionalActionIndex(0);
  }, [selectedTabId]);

  const rows = useMemo<TabListRow[]>(() => {
    const nextRows: TabListRow[] = [];

    if (!isLoading && isBaseState && visibleTabs.length > 0) {
      nextRows.push({
        key: "most-frequented-tabs-header",
        title: "Most frequented tabs",
        type: "section-header",
      });
    }

    if (showSuspendLeastFrequentAction) {
      nextRows.push({
        key: "suspend-least-frequent",
        selectableIndex: 0,
        type: "suspend-least-frequent",
      });
    }

    if (showCloseLeastFrequentAction) {
      nextRows.push({
        key: "close-least-frequent",
        selectableIndex: Number(showSuspendLeastFrequentAction),
        type: "close-least-frequent",
      });
    }

    if (!isLoading && isLeastFrequentedQuery && visibleTabs.length > 0) {
      nextRows.push({
        key: "least-frequented-tabs-header",
        title: "Least frequented tabs",
        type: "section-header",
      });
    }

    visibleTabs.forEach((tab, index) => {
      nextRows.push({
        key: `tab-${tab.id}`,
        selectableIndex: visibleTabStartIndex + index,
        tab,
        type: "tab",
        visibleTabIndex: index,
      });
    });

    if (showTabCleanupSection) {
      if (visibleTabs.length > 0) {
        nextRows.push({
          divided: true,
          key: "tab-cleanup-header",
          title: "Tab cleanup",
          type: "section-header",
        });
      }

      if (showDuplicatesSummary) {
        nextRows.push({
          key: "duplicates-summary",
          selectableIndex: visibleTabStartIndex + visibleTabs.length,
          type: "duplicates-summary",
        });
      }

      if (showLeastFrequentedSummary) {
        nextRows.push({
          key: "least-frequented-summary",
          selectableIndex:
            visibleTabStartIndex +
            visibleTabs.length +
            Number(showDuplicatesSummary),
          type: "least-frequented-summary",
        });
      }
    }

    if (showSettingsCommand) {
      nextRows.push({
        key: "settings-command",
        selectableIndex:
          visibleTabStartIndex +
          visibleTabs.length +
          Number(showDuplicatesSummary) +
          Number(showLeastFrequentedSummary),
        type: "settings-command",
      });
    }

    return nextRows;
  }, [
    isBaseState,
    isLeastFrequentedQuery,
    isLoading,
    showDuplicatesSummary,
    showLeastFrequentedSummary,
    showCloseLeastFrequentAction,
    showSettingsCommand,
    showSuspendLeastFrequentAction,
    showTabCleanupSection,
    visibleTabStartIndex,
    visibleTabs,
  ]);

  const selectedRowIndex = rows.findIndex(
    (row) => "selectableIndex" in row && row.selectableIndex === activeIndex,
  );
  // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual is intentionally used for list windowing.
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: (index) => (rows[index]?.type === "section-header" ? 28 : 57),
    getScrollElement: () => scrollViewportRef.current,
    getItemKey: (index) => rows[index]?.key ?? index,
    overscan: 6,
  });

  useLayoutEffect(() => {
    if (selectedRowIndex >= 0) {
      rowVirtualizer.scrollToIndex(selectedRowIndex, { align: "auto" });
    }
  }, [rowVirtualizer, selectedRowIndex]);

  const handleActivate = async (tab: ManagedTab) => {
    await activateTab(tab);
    window.close();
  };

  const closeTabsOptimistically = async (tabIdsToClose: number[]) => {
    const tabIdsToCloseSet = new Set(tabIdsToClose);

    if (tabIdsToCloseSet.size === 0) {
      return;
    }

    const tabsBeforeClose = tabs;
    const leastFrequentTabsBeforeClose = leastFrequentSuspendableTabs;

    setIsMetaActionsRevealed(false);
    setTabs((currentTabs) => removeTabsById(currentTabs, tabIdsToCloseSet));
    setLeastFrequentSuspendableTabs((currentTabs) =>
      removeTabsById(currentTabs, tabIdsToCloseSet),
    );

    const uniqueTabIdsToClose = [...tabIdsToCloseSet];
    const results = await Promise.allSettled(
      uniqueTabIdsToClose.map((tabId) => closeTab(tabId)),
    );
    const failedTabIds = new Set<number>();

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        const tabId = uniqueTabIdsToClose[index];

        if (tabId !== undefined) {
          failedTabIds.add(tabId);
        }

        console.error("Failed to close tab", result.reason);
      }
    }

    if (failedTabIds.size === 0) {
      return;
    }

    setTabs((currentTabs) =>
      restoreTabsBySnapshot(currentTabs, tabsBeforeClose, failedTabIds),
    );
    setLeastFrequentSuspendableTabs((currentTabs) =>
      restoreTabsBySnapshot(
        currentTabs,
        leastFrequentTabsBeforeClose,
        failedTabIds,
      ),
    );
  };

  const handleClose = async (tabId: number) => {
    await closeTabsOptimistically([tabId]);
  };

  const handleMergeDuplicates = async (group: DuplicateTabGroup) => {
    const tabIdsToClose = group.tabs
      .filter((tab) => tab.id !== group.tab.id)
      .map((tab) => tab.id);

    await closeTabsOptimistically(tabIdsToClose);
  };

  const handleSuspendLeastFrequent = async () => {
    const tabIdsToSuspend = leastFrequentSuspendableTabs.map((tab) => tab.id);

    await suspendTabs(tabIdsToSuspend);

    setTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tabIdsToSuspend.includes(tab.id) ? { ...tab, discarded: true } : tab,
      ),
    );
  };

  const handleCloseLeastFrequent = async () => {
    const tabIdsToClose = leastFrequentSuspendableTabs.map((tab) => tab.id);

    await closeTabsOptimistically(tabIdsToClose);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Meta") {
      if (event.repeat) {
        return;
      }

      setIsMetaActionsRevealed((isRevealed) =>
        selectedTab ? !isRevealed : false,
      );
      setSelectedAdditionalActionIndex(0);
      return;
    }

    if (isMetaActionsRevealed && selectedTab) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedAdditionalActionIndex(0);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void handleClose(selectedTab.id);
        return;
      }
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (itemCount === 0) {
        return;
      }
      setIsMetaActionsRevealed(false);
      setSelectedAdditionalActionIndex(0);
      setSelectedIndex((index) => (index + 1) % itemCount);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (itemCount === 0) {
        return;
      }
      setIsMetaActionsRevealed(false);
      setSelectedAdditionalActionIndex(0);
      setSelectedIndex((index) => (index - 1 + itemCount) % itemCount);
    }

    if (event.key === "Enter" && isSettingsCommandSelected) {
      event.preventDefault();
      navigateTo(SETTINGS_COMMAND);
      return;
    }

    if (event.key === "Enter" && isDuplicatesSummarySelected) {
      event.preventDefault();
      setQuery(DUPLICATES_COMMAND);
      setSelectedIndex(0);
      return;
    }

    if (event.key === "Enter" && isLeastFrequentedSummarySelected) {
      event.preventDefault();
      setQuery(LEAST_FREQUENTED_COMMAND);
      setSelectedIndex(0);
      return;
    }

    if (event.key === "Enter" && isSuspendLeastFrequentSelected) {
      event.preventDefault();
      void handleSuspendLeastFrequent();
      return;
    }

    if (event.key === "Enter" && isCloseLeastFrequentSelected) {
      event.preventDefault();
      void handleCloseLeastFrequent();
      return;
    }

    if (event.key === "Enter" && selectedDuplicateGroup) {
      event.preventDefault();
      void handleMergeDuplicates(selectedDuplicateGroup);
      return;
    }

    if (event.key === "Enter" && selectedTab) {
      event.preventDefault();
      void handleActivate(selectedTab);
    }
  };

  const renderRow = (row: TabListRow) => {
    if (row.type === "section-header") {
      return <TabSectionHeader divided={row.divided} title={row.title} />;
    }

    if (row.type === "suspend-least-frequent") {
      const isSelected = row.selectableIndex === activeIndex;

      return (
        <button
          type="button"
          onClick={() => void handleSuspendLeastFrequent()}
          className={cn(
            "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
            isSelected
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/60",
          )}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 flex-none text-muted-foreground" />
              <span className="truncate text-sm font-medium">
                Suspend least frequented tabs
              </span>
            </span>
            <span className="mt-1 block truncate pl-6 text-xs text-muted-foreground">
              Free memory from all tabs in this list
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {leastFrequentSuspendableTabs.length}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      );
    }

    if (row.type === "close-least-frequent") {
      const isSelected = row.selectableIndex === activeIndex;

      return (
        <button
          type="button"
          onClick={() => void handleCloseLeastFrequent()}
          className={cn(
            "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
            isSelected
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/60",
          )}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <Trash className="h-4 w-4 flex-none text-muted-foreground" />
              <span className="truncate text-sm font-medium">
                Close least frequented tabs
              </span>
            </span>
            <span className="mt-1 block truncate pl-6 text-xs text-muted-foreground">
              Close all tabs in this list
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {leastFrequentSuspendableTabs.length}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      );
    }

    if (row.type === "tab") {
      const { tab } = row;
      const isSelected = row.selectableIndex === activeIndex;
      const isActionRevealed = isSelected && isMetaActionsRevealed;
      const isCloseActionSelected =
        isActionRevealed && selectedAdditionalActionIndex === 0;

      return (
        <div className="group relative overflow-hidden rounded-lg">
          {isSelected ? (
            <button
              type="button"
              className={cn(
                "absolute inset-y-0 right-0 z-0 flex w-16 items-center justify-center rounded-r-lg bg-red-600 text-white transition-colors hover:bg-red-700",
                !isActionRevealed && "pointer-events-none",
              )}
              aria-label={`Close ${tab.title}`}
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                void handleClose(tab.id);
              }}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                  isCloseActionSelected && "bg-white/85 text-red-600",
                )}
              >
                <Trash className="h-4 w-4" />
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const duplicateGroup = duplicateGroupsByUrl[tab.url];

              if (isDuplicatesQuery && duplicateGroup) {
                void handleMergeDuplicates(duplicateGroup);
                return;
              }

              void handleActivate(tab);
            }}
            className={cn(
              "relative z-10 grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg px-3 py-2 text-left ease-out",
              isSelected
                ? "bg-accent text-accent-foreground transition-transform duration-200"
                : "transition-[background-color,color,transform] duration-200 hover:bg-accent/60",
              isActionRevealed && "-translate-x-16 rounded-r-none",
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                {tab.favIconUrl ? (
                  <img
                    src={tab.favIconUrl}
                    alt=""
                    className="mt-px h-4 w-4 flex-none rounded-sm"
                    loading="lazy"
                  />
                ) : (
                  <span className="h-4 w-4 flex-none rounded-sm bg-muted" />
                )}
                {tab.group ? <TabGroupBadge group={tab.group} /> : null}
                <span className="truncate text-sm font-medium">
                  {tab.title}
                </span>
                {tab.pinned ? (
                  <Pin className="h-3 w-3 flex-none text-muted-foreground" />
                ) : null}
                {tab.audible ? (
                  <Volume2 className="h-3 w-3 flex-none text-muted-foreground" />
                ) : null}
              </span>
              <span className="mt-1 block truncate pl-6 text-[11px] text-muted-foreground">
                {tab.url}
              </span>
            </span>

            <span className="flex items-center gap-1">
              {tab.incognito ? (
                <span
                  className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-muted-foreground"
                  aria-label="Incognito tab"
                  title="Incognito tab"
                >
                  <IncognitoIcon className="h-4 w-4" />
                </span>
              ) : null}
              {isBaseState ? (
                <span
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  aria-label={`Opened ${tabFrequencies[tab.url]?.count ?? 0} times`}
                >
                  opened {tabFrequencies[tab.url]?.count ?? 0} times
                </span>
              ) : null}
              {isDuplicatesQuery ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {duplicateUrlCounts[tab.url]}
                </span>
              ) : null}
              {isDuplicatesQuery && isSelected && !isActionRevealed ? (
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Merge
                </kbd>
              ) : null}
            </span>
          </button>
        </div>
      );
    }

    if (row.type === "duplicates-summary") {
      const isSelected = row.selectableIndex === activeIndex;

      return (
        <button
          type="button"
          onClick={() => {
            setQuery(DUPLICATES_COMMAND);
            setSelectedIndex(0);
          }}
          className={cn(
            "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
            isSelected
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/60",
          )}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <Copy className="h-4 w-4 flex-none text-muted-foreground" />
              <span className="truncate text-sm font-medium">
                Duplicated tabs
              </span>
            </span>
            <span className="mt-1 block truncate pl-6 text-xs text-muted-foreground">
              Show tabs with the exact same URL
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {duplicateTabCount} tab{duplicateTabCount === 1 ? "" : "s"}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      );
    }

    if (row.type === "least-frequented-summary") {
      const isSelected = row.selectableIndex === activeIndex;

      return (
        <button
          type="button"
          onClick={() => {
            setQuery(LEAST_FREQUENTED_COMMAND);
            setSelectedIndex(0);
          }}
          className={cn(
            "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
            isSelected
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/60",
          )}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 flex-none text-muted-foreground" />
              <span className="truncate text-sm font-medium">
                Least frequented tabs
              </span>
            </span>
            <span className="mt-1 block truncate pl-6 text-xs text-muted-foreground">
              Review tabs you rarely open
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {leastFrequentSuspendableTabs.length} tab
              {leastFrequentSuspendableTabs.length === 1 ? "" : "s"}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      );
    }

    const isSelected = row.selectableIndex === activeIndex;

    return (
      <button
        type="button"
        onClick={() => navigateTo(SETTINGS_COMMAND)}
        className={cn(
          "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/60",
        )}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 flex-none text-muted-foreground" />
            <span className="truncate text-sm font-medium">Settings</span>
          </span>
          <span className="mt-1 block truncate pl-6 text-xs text-muted-foreground">
            Configure Hyperion2 preferences
          </span>
        </span>

        <span className="flex items-center gap-1">
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="flex-none border-b border-border/70">
        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
              setIsMetaActionsRevealed(false);
              setSelectedAdditionalActionIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-14 rounded-none border-0 bg-transparent px-5 py-1 pr-24 text-base font-medium shadow-none ring-offset-transparent placeholder:text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Search tabs or type / for commands..."
            spellCheck={false}
          />
          <div className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm font-medium text-muted-foreground">
            {showBusyIndicator ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            <span>
              {tabs.length} open tab{tabs.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </section>

      <ScrollArea
        className="min-h-0 flex-1"
        contentClassName="px-2 pb-2 pt-1"
        viewportRef={scrollViewportRef}
      >
        {isLoading && tabs.length === 0 ? (
          <div className="mx-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Loading tabs in the background...
          </div>
        ) : null}

        {!isLoading && (isSearchPending || isDuplicatesPending) ? (
          <div className="mx-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Preparing tab data...
          </div>
        ) : null}

        {!isLoading &&
        !isSearchPending &&
        !isDuplicatesPending &&
        itemCount === 0 ? (
          <div className="mx-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No matching tabs.
          </div>
        ) : null}

        <div
          className="relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];

            if (!row) {
              return null;
            }

            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute left-0 top-0 w-full pb-1"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(row)}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <footer className="flex items-center gap-2.5 flex-none border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <div>
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>{" "}
          Navigate tabs
        </div>
        <div>
          <Kbd>Enter</Kbd> Execute Action
        </div>
        <div>
          <Kbd>⌘</Kbd> Reveal Tab Actions
        </div>
      </footer>
    </div>
  );
}

function SettingsPage({ navigateTo }: { navigateTo: NavigateTo }) {
  const [preferDetached, setPreferDetachedState] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    getPreferDetached().then((preference) => {
      if (isCurrent) {
        setPreferDetachedState(preference);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handlePreferDetachedChange = async (checked: boolean) => {
    setPreferDetachedState(checked);
    await setPreferDetached(checked);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Settings</h1>
            <p className="text-xs text-muted-foreground">
              Configure Hyperion2 preferences
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigateTo("/")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        </div>
      </header>

      <section className="space-y-3 p-4">
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span>
            <span className="block font-medium">Prefer detached</span>
            <span className="text-xs text-muted-foreground">
              Open future launches in a separate window.
            </span>
          </span>
          <input
            type="checkbox"
            checked={preferDetached}
            onChange={(event) => {
              void handlePreferDetachedChange(event.target.checked);
            }}
            className="h-4 w-4 accent-primary"
          />
        </label>
      </section>
    </div>
  );
}

export default App;
