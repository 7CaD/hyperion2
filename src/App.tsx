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
} from "./lib/chrome-tabs";
import { cn } from "./lib/utils";

const SETTINGS_COMMAND = "/settings";
const DUPLICATES_COMMAND = "/duplicates";
const MOST_FREQUENT_TAB_LIMIT = 3;

type NavigateTo = (path: string) => void;
type DuplicateTabGroup = {
  count: number;
  tab: ManagedTab;
  tabs: ManagedTab[];
  url: string;
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
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    getPreferDetached().then((preference) => {
      if (!isCurrent) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (preference && params.get("detached") !== "1") {
        openDetachedWindow();
        window.close();
      }
    });

    return () => {
      isCurrent = false;
    };
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

  const fuse = useMemo(
    () =>
      new Fuse(tabs, {
        includeScore: true,
        keys: [
          { name: "title", weight: 0.7 },
          { name: "url", weight: 0.3 },
        ],
        threshold: 0.35,
      }),
    [tabs],
  );

  const trimmedQuery = query.trim();
  const isBaseState = trimmedQuery.length === 0;
  const isDuplicatesQuery = trimmedQuery === DUPLICATES_COMMAND;
  const showSettingsCommand =
    trimmedQuery.length > 0 &&
    !isDuplicatesQuery &&
    (SETTINGS_COMMAND.startsWith(trimmedQuery) ||
      trimmedQuery.startsWith(SETTINGS_COMMAND));

  const mostFrequentTabs = useMemo(
    () =>
      [...tabs]
        .sort((a, b) => {
          const aFrequency = tabFrequencies[a.url];
          const bFrequency = tabFrequencies[b.url];

          return (
            (bFrequency?.count ?? 0) - (aFrequency?.count ?? 0) ||
            (bFrequency?.lastActivatedAt ?? 0) -
              (aFrequency?.lastActivatedAt ?? 0) ||
            Number(b.active) - Number(a.active) ||
            (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0) ||
            b.windowId - a.windowId ||
            a.index - b.index
          );
        })
        .slice(0, MOST_FREQUENT_TAB_LIMIT),
    [tabFrequencies, tabs],
  );

  const duplicateUrlCounts = useMemo(
    () =>
      tabs.reduce<Record<string, number>>((counts, tab) => {
        counts[tab.url] = (counts[tab.url] ?? 0) + 1;
        return counts;
      }, {}),
    [tabs],
  );

  const duplicateTabGroups = useMemo(() => {
    const groupsByUrl = tabs.reduce<Record<string, ManagedTab[]>>(
      (groups, tab) => {
        groups[tab.url] = [...(groups[tab.url] ?? []), tab];
        return groups;
      },
      {},
    );

    return Object.entries(groupsByUrl)
      .filter(([, groupTabs]) => groupTabs.length > 1)
      .map<DuplicateTabGroup>(([url, groupTabs]) => {
        const sortedGroupTabs = [...groupTabs].sort(
          (a, b) =>
            Number(b.active) - Number(a.active) ||
            (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0) ||
            b.windowId - a.windowId ||
            a.index - b.index,
        );

        return {
          count: sortedGroupTabs.length,
          tab: sortedGroupTabs[0],
          tabs: sortedGroupTabs,
          url,
        };
      })
      .sort((a, b) => {
        const countDifference =
          duplicateUrlCounts[b.url] - duplicateUrlCounts[a.url];

        return (
          countDifference ||
          a.url.localeCompare(b.url) ||
          Number(b.tab.active) - Number(a.tab.active) ||
          (b.tab.lastAccessed ?? 0) - (a.tab.lastAccessed ?? 0) ||
          b.tab.windowId - a.tab.windowId ||
          a.tab.index - b.tab.index
        );
      });
  }, [duplicateUrlCounts, tabs]);

  const duplicateTabs = useMemo(
    () => duplicateTabGroups.map((group) => group.tab),
    [duplicateTabGroups],
  );

  const duplicateTabCount = useMemo(
    () => duplicateTabGroups.reduce((count, group) => count + group.count, 0),
    [duplicateTabGroups],
  );

  const showDuplicatesSummary = isBaseState && duplicateTabGroups.length > 0;

  const duplicateGroupsByUrl = useMemo(
    () =>
      duplicateTabGroups.reduce<Record<string, DuplicateTabGroup>>(
        (groups, group) => {
          groups[group.url] = group;
          return groups;
        },
        {},
      ),
    [duplicateTabGroups],
  );

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

    return fuse.search(trimmedQuery).map((result) => result.item);
  }, [
    duplicateTabs,
    fuse,
    isBaseState,
    isDuplicatesQuery,
    mostFrequentTabs,
    showSettingsCommand,
    trimmedQuery,
  ]);

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
            {isLoading ? (
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

        {!isLoading && itemCount === 0 ? (
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
              onMouseEnter={() => setSelectedIndex(index)}
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
              onMouseEnter={() => setSelectedIndex(visibleTabs.length)}
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
              onMouseEnter={() =>
                setSelectedIndex(
                  visibleTabs.length + Number(showDuplicatesSummary),
                )
              }
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
