import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activateTab,
  getAllTabs,
  getPreferDetached,
  getTabFrequencies,
  initializeMissingTabFrequencies,
  setPreferDetached,
  suspendTabs,
  type ManagedTab,
  type TabFrequencies,
} from "./chrome-tabs";

const makeManagedTab = (overrides: Partial<ManagedTab> = {}): ManagedTab => ({
  active: false,
  audible: false,
  discarded: false,
  id: 1,
  index: 0,
  pinned: false,
  title: "Example",
  url: "https://example.com",
  windowId: 1,
  ...overrides,
});

const stubChrome = (chromeMock: unknown) => {
  vi.stubGlobal("chrome", chromeMock);
};

describe("chrome tab helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getAllTabs", () => {
    it("returns an empty list outside the extension runtime", async () => {
      await expect(getAllTabs()).resolves.toEqual([]);
    });

    it("normalizes valid tabs, attaches groups, filters invalid tabs, and sorts active tabs first", async () => {
      const queryTabs = vi.fn().mockResolvedValue([
        {
          active: false,
          groupId: 7,
          id: 2,
          index: 0,
          title: "Second",
          url: "https://second.example",
          windowId: 1,
        },
        {
          active: true,
          groupId: -1,
          id: 3,
          index: 3,
          url: "https://active.example",
          windowId: 1,
        },
        {
          active: false,
          id: 4,
          index: 1,
          title: "Other window",
          url: "https://other.example",
          windowId: 2,
        },
        {
          active: false,
          index: 2,
          title: "Invalid",
          url: "https://invalid.example",
          windowId: 1,
        },
      ]);
      const queryGroups = vi.fn().mockResolvedValue([
        { color: "blue", id: 7, title: "  Work  " },
      ]);

      stubChrome({
        runtime: { id: "extension-id" },
        tabGroups: { query: queryGroups },
        tabs: { query: queryTabs },
      });

      await expect(getAllTabs()).resolves.toEqual([
        expect.objectContaining({
          active: true,
          group: undefined,
          groupId: undefined,
          id: 3,
          title: "https://active.example",
        }),
        expect.objectContaining({
          active: false,
          group: undefined,
          id: 4,
          title: "Other window",
          windowId: 2,
        }),
        expect.objectContaining({
          active: false,
          group: { color: "blue", id: 7, title: "Work" },
          groupId: 7,
          id: 2,
          title: "Second",
        }),
      ]);
      expect(queryGroups).toHaveBeenCalledWith({});
    });

    it("skips group lookup when no normalized tabs have a group id", async () => {
      const queryGroups = vi.fn();

      stubChrome({
        runtime: { id: "extension-id" },
        tabGroups: { query: queryGroups },
        tabs: {
          query: vi.fn().mockResolvedValue([
            { active: false, id: 1, index: 0, url: "https://a.example", windowId: 1 },
          ]),
        },
      });

      await expect(getAllTabs()).resolves.toHaveLength(1);
      expect(queryGroups).not.toHaveBeenCalled();
    });
  });

  it("activates a tab, records its frequency, and focuses the owning window", async () => {
    vi.spyOn(Date, "now").mockReturnValue(12345);

    const storageGet = vi.fn().mockResolvedValue({
      tabFrequencies: {
        "https://example.com": { count: 2, lastActivatedAt: 100 },
      } satisfies TabFrequencies,
    });
    const storageSet = vi.fn().mockResolvedValue(undefined);
    const windowUpdate = vi.fn().mockResolvedValue(undefined);
    const tabUpdate = vi.fn().mockResolvedValue(undefined);

    stubChrome({
      runtime: { id: "extension-id" },
      storage: { local: { get: storageGet, set: storageSet } },
      tabs: { update: tabUpdate },
      windows: { update: windowUpdate },
    });

    await activateTab(makeManagedTab({ id: 9, windowId: 4 }));

    expect(storageSet).toHaveBeenCalledWith({
      tabFrequencies: {
        "https://example.com": { count: 3, lastActivatedAt: 12345 },
      },
    });
    expect(windowUpdate).toHaveBeenCalledWith(4, { focused: true });
    expect(tabUpdate).toHaveBeenCalledWith(9, { active: true });
  });

  it("does not mutate Chrome state when activating outside the extension runtime", async () => {
    const storageSet = vi.fn();

    stubChrome({
      runtime: {},
      storage: { local: { set: storageSet } },
      tabs: { update: vi.fn() },
      windows: { update: vi.fn() },
    });

    await activateTab(makeManagedTab());

    expect(storageSet).not.toHaveBeenCalled();
  });

  it("discards each requested tab when suspend support is available", async () => {
    const discard = vi.fn().mockResolvedValue(undefined);

    stubChrome({
      runtime: { id: "extension-id" },
      tabs: { discard },
    });

    await suspendTabs([1, 2, 3]);

    expect(discard).toHaveBeenCalledTimes(3);
    expect(discard).toHaveBeenNthCalledWith(1, 1);
    expect(discard).toHaveBeenNthCalledWith(2, 2);
    expect(discard).toHaveBeenNthCalledWith(3, 3);
  });

  it("reads and writes the detached-window preference", async () => {
    const storageGet = vi.fn().mockResolvedValue({ preferDetached: 1 });
    const storageSet = vi.fn().mockResolvedValue(undefined);
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    stubChrome({
      runtime: { id: "extension-id", sendMessage },
      storage: { local: { get: storageGet, set: storageSet } },
    });

    await expect(getPreferDetached()).resolves.toBe(true);
    await setPreferDetached(false);

    expect(storageGet).toHaveBeenCalledWith({ preferDetached: false });
    expect(storageSet).toHaveBeenCalledWith({ preferDetached: false });
    expect(sendMessage).toHaveBeenCalledWith({
      preferDetached: false,
      type: "PREFER_DETACHED_CHANGED",
    });
  });

  it("keeps storage as source of truth when preference broadcast fails", async () => {
    const storageSet = vi.fn().mockResolvedValue(undefined);

    stubChrome({
      runtime: {
        id: "extension-id",
        sendMessage: vi.fn().mockRejectedValue(new Error("sleeping background")),
      },
      storage: { local: { set: storageSet } },
    });

    await expect(setPreferDetached(true)).resolves.toBeUndefined();
    expect(storageSet).toHaveBeenCalledWith({ preferDetached: true });
  });

  it("returns stored tab frequencies or an empty object without storage access", async () => {
    stubChrome({
      runtime: { id: "extension-id" },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            tabFrequencies: {
              "https://example.com": { count: 4, lastActivatedAt: 1000 },
            },
          }),
        },
      },
    });

    await expect(getTabFrequencies()).resolves.toEqual({
      "https://example.com": { count: 4, lastActivatedAt: 1000 },
    });

    vi.unstubAllGlobals();

    await expect(getTabFrequencies()).resolves.toEqual({});
  });

  describe("initializeMissingTabFrequencies", () => {
    it("adds one zero-count record per missing non-empty tab URL and persists it", async () => {
      vi.spyOn(Date, "now").mockReturnValue(5000);

      const storageSet = vi.fn().mockResolvedValue(undefined);
      const existing = {
        "https://known.example": { count: 2, lastActivatedAt: 100 },
      };

      stubChrome({
        runtime: { id: "extension-id" },
        storage: { local: { set: storageSet } },
      });

      await expect(
        initializeMissingTabFrequencies(
          [
            makeManagedTab({ id: 1, url: "https://known.example" }),
            makeManagedTab({ id: 2, url: "https://new.example" }),
            makeManagedTab({ id: 3, url: "https://new.example" }),
            makeManagedTab({ id: 4, url: "" }),
          ],
          existing,
        ),
      ).resolves.toEqual({
        "https://known.example": { count: 2, lastActivatedAt: 100 },
        "https://new.example": { count: 0, lastActivatedAt: 5000 },
      });

      expect(storageSet).toHaveBeenCalledWith({
        tabFrequencies: {
          "https://known.example": { count: 2, lastActivatedAt: 100 },
          "https://new.example": { count: 0, lastActivatedAt: 5000 },
        },
      });
    });

    it("returns the original frequency object without writing when nothing is missing", async () => {
      const storageSet = vi.fn();
      const existing = {
        "https://known.example": { count: 1, lastActivatedAt: 100 },
      };

      stubChrome({
        runtime: { id: "extension-id" },
        storage: { local: { set: storageSet } },
      });

      const result = await initializeMissingTabFrequencies(
        [makeManagedTab({ url: "https://known.example" })],
        existing,
      );

      expect(result).toBe(existing);
      expect(storageSet).not.toHaveBeenCalled();
    });
  });
});
