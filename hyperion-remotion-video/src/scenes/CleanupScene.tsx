import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { color, smooth } from "../components/Design";
import {
  ActionRow,
  Palette,
  Section,
  TabRow,
  tabs,
} from "../components/Palette";
import {
  GuideBrowser,
  GuideCaption,
  GuideFrame,
  GuidePopup,
} from "../components/Walkthrough";

export const CleanupScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const mergeProgress = interpolate(
    frame,
    [1.35 * fps, 1.58 * fps],
    [0, 1],
    smooth,
  );
  const merged = seconds >= 1.35;
  const clearing = seconds >= 2.4 && seconds < 2.6;
  const suspendMode = seconds >= 2.6;
  const suspendOpen = seconds >= 3.15;
  const suspended = seconds >= 3.95;
  const suspendProgress = interpolate(
    frame,
    [3.95 * fps, 4.17 * fps],
    [0, 1],
    smooth,
  );
  const duplicatesOpen = seconds >= 0.7;
  const query = suspendMode
    ? suspendOpen
      ? "/least-frequented"
      : "/least".slice(0, Math.max(1, Math.floor((seconds - 2.6) * 14)))
    : duplicatesOpen
      ? "/duplicates"
      : "/dup".slice(0, Math.max(1, Math.floor((seconds - 0.1) * 12)));
  const title = suspended
    ? "Memory freed. Tabs stay open."
    : suspendMode
      ? "Suspend idle tabs."
      : merged
        ? "Extra copies closed. One stays open."
        : "Merge duplicate tabs.";
  return (
    <GuideFrame>
      <GuideBrowser page="launch" merged={mergeProgress} shade={0.18}>
        <GuidePopup appear={0.18}>
          <Palette
            query={query}
            count={merged ? 40 : 42}
            bodyHeight={430}
            selectQuery={clearing}
          >
            {!suspendMode ? (
              !duplicatesOpen ? (
                <ActionRow
                  title="Duplicated tabs"
                  description="Show tabs with the exact same URL"
                  icon="copy"
                  count={5}
                  selected
                />
              ) : (
                <>
                  <div
                    style={{
                      height: 91 * (1 - mergeProgress),
                      opacity: 1 - mergeProgress,
                      overflow: "hidden",
                    }}
                  >
                    <TabRow
                      tab={{ ...tabs[0], badge: undefined }}
                      selected
                      badge="3 · Merge"
                      merging
                    />
                  </div>
                  <TabRow
                    tab={{ ...tabs[1], badge: undefined }}
                    selected={merged}
                    badge={merged ? "2 · Merge" : "2"}
                    merging={merged}
                  />
                </>
              )
            ) : !suspendOpen ? (
              <ActionRow
                title="Least frequented tabs"
                description="Review tabs you rarely open"
                icon="moon"
                count={2}
                selected
              />
            ) : (
              <div style={{ position: "relative", height: 430 }}>
                <div style={{ opacity: 1 - suspendProgress }}>
                  <ActionRow
                    title="Suspend least frequented tabs"
                    description="Free memory from all tabs in this list"
                    icon="moon"
                    count={2}
                    selected
                  />
                  <ActionRow
                    title="Close least frequented tabs"
                    description="Close all tabs in this list"
                    icon="close"
                    count={2}
                  />
                  <Section>Least frequented tabs</Section>
                  <TabRow
                    tab={{
                      title: "Weekend reading",
                      url: "medium.com / Reading list",
                      initial: "M",
                      tint: "#d6d8bb",
                    }}
                  />
                  <TabRow
                    tab={{
                      title: "Trip inspiration",
                      url: "are.na / Places to go",
                      initial: "A",
                      tint: color.blue,
                    }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    inset: "20px 8px auto",
                    padding: 32,
                    border: `1px dashed ${color.border}`,
                    borderRadius: 12,
                    textAlign: "center",
                    opacity: suspendProgress,
                    fontSize: 25,
                    color: color.muted,
                  }}
                >
                  No matching tabs.
                </div>
              </div>
            )}
          </Palette>
        </GuidePopup>
      </GuideBrowser>
      <GuideCaption
        step={suspendMode ? "04 / FREE MEMORY" : "03 / CLEAN UP"}
        title={title}
        keys={
          seconds < 0.34
            ? ["⌘ / Ctrl", "Shift", "F"]
            : clearing
              ? ["⌘ / Ctrl", "A"]
              : suspended || (merged && !suspendMode)
                ? undefined
                : ["Enter"]
        }
        active={
          (seconds >= 0.08 && seconds < 0.25) ||
          clearing ||
          (seconds >= 0.55 && seconds < 0.77) ||
          (seconds >= 1.2 && seconds < 1.5) ||
          (seconds >= 3 && seconds < 3.25) ||
          (seconds >= 3.8 && seconds < 4.08)
        }
        hint={
          seconds < 0.34
            ? "Open Hyperion2"
            : clearing
              ? "Select the query to replace it"
              : suspendMode
                ? "Suspend without closing"
                : "Type /dup, then press Enter"
        }
      />
    </GuideFrame>
  );
};
