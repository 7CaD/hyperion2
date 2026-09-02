const POPUP_PATH = "index.html";
const DETACHED_URL = chrome.runtime.getURL(`${POPUP_PATH}?detached=1`);
const DETACHED_WIDTH = 871;
const DETACHED_HEIGHT = 528;
const PREFER_DETACHED_KEY = "preferDetached";

const getWindowBounds = (windowInfo) => ({
  height: windowInfo?.height ?? DETACHED_HEIGHT,
  left: windowInfo?.left ?? 0,
  top: windowInfo?.top ?? 0,
  width: windowInfo?.width ?? DETACHED_WIDTH,
});

const containsPoint = (bounds, point) =>
  point.x >= bounds.left &&
  point.x <= bounds.left + bounds.width &&
  point.y >= bounds.top &&
  point.y <= bounds.top + bounds.height;

const getCenteredGeometry = (bounds) => {
  const width = Math.min(DETACHED_WIDTH, bounds.width);
  const height = Math.min(DETACHED_HEIGHT, bounds.height);

  return {
    height,
    left: Math.round(bounds.left + (bounds.width - width) / 2),
    top: Math.round(bounds.top + (bounds.height - height) / 2),
    width,
  };
};

const getPreferDetached = async () => {
  const result = await chrome.storage.local.get({
    [PREFER_DETACHED_KEY]: false,
  });

  return Boolean(result[PREFER_DETACHED_KEY]);
};

const setActionPopupForPreference = async (preferDetached) => {
  if (!chrome.action?.setPopup) {
    return;
  }

  await chrome.action.setPopup({
    popup: preferDetached ? "" : POPUP_PATH,
  });
};

const syncActionPopupWithPreference = async () => {
  try {
    await setActionPopupForPreference(await getPreferDetached());
  } catch {
    // The click handler still falls back to opening a window if popup APIs fail.
  }
};

const getDisplayBounds = (windowInfo, callback) => {
  const fallbackBounds = getWindowBounds(windowInfo);

  if (!chrome.system?.display?.getInfo) {
    callback(fallbackBounds);
    return;
  }

  chrome.system.display.getInfo((displays) => {
    if (
      chrome.runtime.lastError ||
      !Array.isArray(displays) ||
      displays.length === 0
    ) {
      callback(fallbackBounds);
      return;
    }

    const windowBounds = getWindowBounds(windowInfo);
    const windowCenter = {
      x: windowBounds.left + windowBounds.width / 2,
      y: windowBounds.top + windowBounds.height / 2,
    };
    const display =
      displays.find(
        ({ workArea }) => workArea && containsPoint(workArea, windowCenter),
      ) ??
      displays.find(({ isPrimary }) => isPrimary) ??
      displays[0];

    callback(display.workArea ?? display.bounds ?? fallbackBounds);
  });
};

const openDetachedWindow = (sendResponse = () => {}) => {
  chrome.windows.getLastFocused((windowInfo) => {
    getDisplayBounds(windowInfo, (bounds) => {
      chrome.windows.create(
        {
          ...getCenteredGeometry(bounds),
          focused: true,
          type: "popup",
          url: DETACHED_URL,
        },
        () => sendResponse({ ok: true }),
      );
    });
  });
};

const openPopupWindowFallback = (sendResponse = () => {}) => {
  chrome.windows.getLastFocused((windowInfo) => {
    const bounds = getWindowBounds(windowInfo);

    chrome.windows.create(
      {
        ...getCenteredGeometry(bounds),
        focused: true,
        type: "popup",
        url: chrome.runtime.getURL(POPUP_PATH),
      },
      () => sendResponse({ ok: true }),
    );
  });
};

const openActionPopup = async () => {
  if (!chrome.action?.openPopup || !chrome.action?.setPopup) {
    openPopupWindowFallback();
    return;
  }

  try {
    await setActionPopupForPreference(false);
    await chrome.action.openPopup();
  } catch {
    openPopupWindowFallback();
  }
};

void syncActionPopupWithPreference();

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName !== "local" || !(PREFER_DETACHED_KEY in changes)) {
    return;
  }

  void setActionPopupForPreference(
    Boolean(changes[PREFER_DETACHED_KEY].newValue),
  );
});

chrome.action.onClicked.addListener(async () => {
  if (await getPreferDetached()) {
    openDetachedWindow();
    return;
  }

  await openActionPopup();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_DETACHED") {
    openDetachedWindow(sendResponse);

    return true;
  }

  if (message?.type === "PREFER_DETACHED_CHANGED") {
    setActionPopupForPreference(Boolean(message.preferDetached))
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));

    return true;
  }

  return false;
});
