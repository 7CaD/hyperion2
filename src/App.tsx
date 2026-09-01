import Fuse from "fuse.js";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Pin,
  Search,
  Settings,
  Volume2,
  X,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  activateTab,
  closeTab,
  getAllTabs,
  getPreferDetached,
  openDetachedWindow,
  setPreferDetached,
  type ManagedTab,
} from "./lib/chrome-tabs";
import { cn } from "./lib/utils";

const SETTINGS_COMMAND = "/settings";

type NavigateTo = (path: string) => void;

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
        "min-h-[392px] bg-background text-foreground",
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
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
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

    getAllTabs()
      .then((nextTabs) => {
        if (isCurrent) {
          setTabs(nextTabs);
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
  const showSettingsCommand =
    trimmedQuery.length > 0 &&
    (SETTINGS_COMMAND.startsWith(trimmedQuery) ||
      trimmedQuery.startsWith(SETTINGS_COMMAND));

  const visibleTabs = useMemo(() => {
    if (!trimmedQuery) {
      return tabs;
    }

    if (showSettingsCommand) {
      return [];
    }

    return fuse.search(trimmedQuery).map((result) => result.item);
  }, [fuse, showSettingsCommand, tabs, trimmedQuery]);

  const itemCount = visibleTabs.length + Number(showSettingsCommand);
  const activeIndex =
    itemCount === 0 ? 0 : Math.min(selectedIndex, itemCount - 1);
  const isSettingsCommandSelected =
    showSettingsCommand && activeIndex === visibleTabs.length;

  const selectedTab = visibleTabs[activeIndex];

  const handleActivate = async (tab: ManagedTab) => {
    await activateTab(tab);
    window.close();
  };

  const handleClose = async (tabId: number) => {
    await closeTab(tabId);
    setTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));
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

    if (event.key === "Enter" && selectedTab) {
      event.preventDefault();
      void handleActivate(selectedTab);
    }
  };

  return (
    <div className="flex min-h-[inherit] flex-col">
      <section className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-12 pl-9 pr-24 text-base"
            placeholder="Search tabs or type /settings..."
            spellCheck={false}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-muted-foreground">
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            <span>{tabs.length}</span>
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
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

        <div className="space-y-1">
          {visibleTabs.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
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

              <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
            </button>
          ))}

          {showSettingsCommand ? (
            <button
              type="button"
              onClick={() => navigateTo(SETTINGS_COMMAND)}
              onMouseEnter={() => setSelectedIndex(visibleTabs.length)}
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
      </section>

      <footer className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Use arrow keys to navigate, Enter to switch.
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
    <div className="flex min-h-[inherit] flex-col">
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
