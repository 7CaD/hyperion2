import Fuse from "fuse.js";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Loader2,
  Pin,
  Settings,
  Volume2,
  X,
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
  openDetachedWindow,
  setPreferDetached,
  type TabFrequencies,
  type ManagedTab,
  type ManagedTabGroup,
} from "./lib/chrome-tabs";
import { cn } from "./lib/utils";

const SETTINGS_COMMAND = "/settings";
const DUPLICATES_COMMAND = "/duplicates";
const MOST_FREQUENT_TAB_LIMIT = 3;
const TAB_GROUP_BADGE_CLASSES: Record<ManagedTabGroup["color"], string> = {
  blue: "bg-blue-500 text-blue-700",
  cyan: "bg-cyan-500 text-cyan-700",
  green: "bg-green-300 text-green-700",
  grey: "bg-gray-300 text-gray-800",
  orange: "bg-orange-500 text-orange-700",
  pink: "bg-pink-400 text-pink-900",
  purple: "bg-purple-400 text-purple-800",
  red: "bg-red-500 text-red-700",
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
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [tabFrequencies, setTabFrequencies] = useState<TabFrequencies>({});
  const [mostFrequentTabs, setMostFrequentTabs] = useState<ManagedTab[]>([]);
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

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getAllTabs(), getTabFrequencies()])
      .then(([nextTabs, nextTabFrequencies]) => {
        if (isCurrent) {
          setTabs(nextTabs);
          setTabFrequencies(nextTabFrequencies);
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
      const nextDuplicateTabData =
        tabs.length === 0 ? emptyDuplicateTabData : getDuplicateTabData(tabs);

      if (isCurrent) {
        setMostFrequentTabs(nextMostFrequentTabs);
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
  const isDuplicatesQuery = trimmedQuery === DUPLICATES_COMMAND;
  const showSettingsCommand =
    trimmedQuery.length > 0 &&
    !isDuplicatesQuery &&
    (SETTINGS_COMMAND.startsWith(trimmedQuery) ||
      trimmedQuery.startsWith(SETTINGS_COMMAND));
  const duplicateUrlCounts = duplicateTabData.urlCounts;
  const duplicateTabs = duplicateTabData.tabs;
  const duplicateTabCount = duplicateTabData.tabCount;
  const duplicateGroupsByUrl = duplicateTabData.groupsByUrl;
  const fuse = fuseState.tabs === tabs ? fuseState.fuse : null;
  const isPreparingTabs =
    preparedTabs !== tabs || preparedTabFrequencies !== tabFrequencies;
  const isPreparingSearch = tabs.length > 0 && fuseState.tabs !== tabs;
  const showDuplicatesSummary =
    isBaseState && duplicateTabData.tabGroups.length > 0;
  const isSearchQuery =
    !isBaseState && !isDuplicatesQuery && !showSettingsCommand;
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

    if (showSettingsCommand) {
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
    isDuplicatesQuery,
    mostFrequentTabs,
    showSettingsCommand,
    tabFrequencies,
    trimmedQuery,
  ]);
  const showBusyIndicator =
    isLoading || isPreparingTabs || isPreparingSearch || isSearchPending;

  const itemCount =
    visibleTabs.length +
    Number(showDuplicatesSummary) +
    Number(showSettingsCommand);
  const activeIndex =
    itemCount === 0 ? 0 : Math.min(selectedIndex, itemCount - 1);
  const isDuplicatesSummarySelected =
    showDuplicatesSummary && activeIndex === visibleTabs.length;
  const isSettingsCommandSelected =
    showSettingsCommand &&
    activeIndex === visibleTabs.length + Number(showDuplicatesSummary);

  const selectedTab = visibleTabs[activeIndex];
  const selectedDuplicateGroup =
    isDuplicatesQuery && selectedTab
      ? duplicateGroupsByUrl[selectedTab.url]
      : undefined;

  useLayoutEffect(() => {
    selectedItemRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [
    activeIndex,
    isDuplicatesSummarySelected,
    isSettingsCommandSelected,
    selectedTab,
  ]);

  const handleActivate = async (tab: ManagedTab) => {
    await activateTab(tab);
    window.close();
  };

  const handleClose = async (tabId: number) => {
    await closeTab(tabId);
    setTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));
  };

  const handleMergeDuplicates = async (group: DuplicateTabGroup) => {
    const tabIdsToClose = group.tabs
      .filter((tab) => tab.id !== group.tab.id)
      .map((tab) => tab.id);

    await Promise.all(tabIdsToClose.map((tabId) => closeTab(tabId)));

    setTabs((currentTabs) =>
      currentTabs.filter((tab) => !tabIdsToClose.includes(tab.id)),
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (itemCount === 0) {
        return;
      }
      setSelectedIndex((index) => Math.min(index + 1, itemCount - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
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
            }}
            onKeyDown={handleKeyDown}
            className="h-16 rounded-none border-0 bg-transparent px-5 py-1 pr-24 text-xl font-medium shadow-none ring-offset-transparent placeholder:text-lg placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Search tabs or type /settings..."
            spellCheck={false}
          />
          <div className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm font-medium text-muted-foreground">
            {showBusyIndicator ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            <span>{tabs.length}</span>
          </div>
        </div>
      </section>

      <ScrollArea className="min-h-0 flex-1" contentClassName="px-2 pb-2 pt-1">
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

        {!isLoading && isBaseState && visibleTabs.length > 0 ? (
          <section className="px-2 pb-2 pt-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Most frequented tabs
            </h2>
          </section>
        ) : null}

        <div className="space-y-1">
          {visibleTabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={index === activeIndex ? selectedItemRef : undefined}
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
                "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60",
              )}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  {tab.favIconUrl ? (
                    <img
                      src={tab.favIconUrl}
                      alt=""
                      className="h-4 w-4 flex-none rounded-sm"
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
                <span className="mt-1 block truncate pl-6 text-xs text-muted-foreground">
                  {tab.url}
                </span>
              </span>

              <span className="flex items-center gap-1">
                {isDuplicatesQuery ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {duplicateUrlCounts[tab.url]}
                  </span>
                ) : null}
                {isDuplicatesQuery && index === activeIndex ? (
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Merge
                  </kbd>
                ) : null}
                <span
                  className={cn(
                    "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                    isDuplicatesQuery && "hidden",
                  )}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Close ${tab.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleClose(tab.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </span>
            </button>
          ))}

          {showDuplicatesSummary ? (
            <button
              ref={isDuplicatesSummarySelected ? selectedItemRef : undefined}
              type="button"
              onClick={() => {
                setQuery(DUPLICATES_COMMAND);
                setSelectedIndex(0);
              }}
              className={cn(
                "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                isDuplicatesSummarySelected
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
                  {duplicateTabCount}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </button>
          ) : null}

          {showSettingsCommand ? (
            <button
              ref={isSettingsCommandSelected ? selectedItemRef : undefined}
              type="button"
              onClick={() => navigateTo(SETTINGS_COMMAND)}
              className={cn(
                "group grid w-full grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                isSettingsCommandSelected
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
          ) : null}
        </div>
      </ScrollArea>

      <footer className="flex-none border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </KbdGroup>{" "}
        Navigate tabs <Kbd>Enter</Kbd> Execute Action
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
