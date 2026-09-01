const DETACHED_URL = chrome.runtime.getURL("index.html?detached=1");
const DETACHED_WIDTH = 640;
const DETACHED_HEIGHT = 420;

const getSpotlightGeometry = (windowInfo) => {
  const browserWidth = windowInfo?.width ?? DETACHED_WIDTH;
  const browserHeight = windowInfo?.height ?? DETACHED_HEIGHT;
  const browserLeft = windowInfo?.left ?? 0;
  const browserTop = windowInfo?.top ?? 0;
  const horizontalInset = 80;
  const verticalInset = 80;
  const width = Math.min(
    DETACHED_WIDTH,
    Math.max(420, browserWidth - horizontalInset),
  );
  const height = Math.min(
    DETACHED_HEIGHT,
    Math.max(320, browserHeight - verticalInset),
  );

  return {
    height,
    left: Math.round(browserLeft + (browserWidth - width) / 2),
    top: Math.round(browserTop + browserHeight * 0.18),
    width,
  };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OPEN_DETACHED") {
    return false;
  }

  chrome.windows.getLastFocused((windowInfo) => {
    chrome.windows.create(
      {
        ...getSpotlightGeometry(windowInfo),
        focused: true,
        type: "popup",
        url: DETACHED_URL,
      },
      () => sendResponse({ ok: true }),
    );
  });

  return true;
});
