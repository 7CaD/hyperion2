import { useCurrentFrame, useVideoConfig } from "remotion";
import { HomePalette } from "../components/Palette";
import {
  GuideBrowser,
  GuideCaption,
  GuideFrame,
  GuidePopup,
  Pointer,
  toolbarTarget,
} from "../components/Walkthrough";

export const OpeningScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opened = frame >= 0.65 * fps;
  return (
    <GuideFrame>
      <GuideBrowser highlightToolbar={!opened} shade={opened ? 0.18 : 0}>
        <GuidePopup appear={0.65}>
          <HomePalette />
        </GuidePopup>
      </GuideBrowser>
      <Pointer
        points={[
          { at: 0, x: 1410, y: 495 },
          { at: 0.5, ...toolbarTarget },
          { at: 0.9, ...toolbarTarget },
          { at: 1.15, x: 1570, y: 233 },
        ]}
        clicks={[0.6]}
        hideAt={1.7}
      />
      <GuideCaption
        step="01 / OPEN"
        title={
          opened
            ? "Open Hyperion2 from your Chrome toolbar."
            : "Meet Hyperion2."
        }
        keys={["⌘ / Ctrl", "Shift", "F"]}
        hint="Or use the keyboard shortcut"
      />
    </GuideFrame>
  );
};
