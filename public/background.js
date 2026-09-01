const DETACHED_URL = chrome.runtime.getURL("index.html?detached=1");
const DETACHED_WIDTH = 720;
const DETACHED_HEIGHT = 440;

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_DETACHED") {
    return false;
  }

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

  return true;
});
