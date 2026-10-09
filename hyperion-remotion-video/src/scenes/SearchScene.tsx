import { useCurrentFrame, useVideoConfig } from "remotion";
import { matches, Palette, Section, TabRow, tabs } from "../components/Palette";
import {
  FocusRing,
  GuideBrowser,
  GuideCaption,
  GuideFrame,
  GuidePopup,
} from "../components/Walkthrough";

export const SearchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const query = "launch".slice(
    0,
    Math.max(0, Math.floor((seconds - 0.2) * 12)),
  );
  const switched = seconds >= 2.1;
  const selected = seconds >= 1.2 ? 1 : 0;
  return (
    <GuideFrame>
      <GuideBrowser
        page={switched ? "launch" : "design"}
        shade={switched ? 0 : 0.18}
      >
        <GuidePopup appear={-0.2} disappear={2}>
          <Palette query={query} bodyHeight={430}>
            {!query && <Section>Most frequented tabs</Section>}
            {(query ? matches : tabs).map((tab, i) => (
              <TabRow key={tab.title} tab={tab} selected={i === selected} />
            ))}
          </Palette>
          <FocusRing
            left={6}
            top={5}
            width={1188}
            height={79}
            from={0.1}
            until={0.8}
          />
        </GuidePopup>
      </GuideBrowser>
      <GuideCaption
        step="02 / FIND"
        title={
          switched
            ? "Back to your work."
            : seconds >= 1.05
              ? "Select a tab. Press Enter."
              : "Type to find a tab."
        }
        keys={switched ? undefined : ["↓", "Enter"]}
        active={
          seconds >= 1.2 && seconds < 1.4
            ? ["↓"]
            : seconds >= 1.9 && seconds < 2.12
              ? ["Enter"]
              : []
        }
        hint="Search titles, URLs, and tab groups"
      />
    </GuideFrame>
  );
};
