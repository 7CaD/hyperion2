import { useCurrentFrame, useVideoConfig } from "remotion";
import { color, Icon, Logo } from "../components/Design";
import { ActionRow, HomePalette, Palette } from "../components/Palette";
import {
  GuideBrowser,
  GuideCaption,
  GuideFrame,
  GuidePopup,
  Pointer,
} from "../components/Walkthrough";

export const SettingsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const enabled = seconds >= 0.9;
  const detached = seconds >= 1.6;
  return (
    <GuideFrame>
      <GuideBrowser page="launch" merged={1} shade={0.18}>
        <GuidePopup appear={-0.2} disappear={1.25}>
          {seconds < 0.45 ? (
            <Palette query="/settings" count={40} bodyHeight={430}>
              <ActionRow
                title="Settings"
                description="Configure Hyperion2 preferences"
                icon="window"
                selected
              />
            </Palette>
          ) : (
            <div
              style={{
                width: "100%",
                height: 603,
                background: color.panel,
                border: `1px solid ${color.border}`,
                borderRadius: 22,
                overflow: "hidden",
                boxShadow: "0 20px 70px #0005",
              }}
            >
              <div
                style={{
                  height: 88,
                  borderBottom: `1px solid ${color.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "0 26px",
                }}
              >
                <Logo size={37} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 600 }}>Settings</div>
                  <div
                    style={{ color: color.muted, fontSize: 18, marginTop: 4 }}
                  >
                    Configure Hyperion2 preferences
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    border: `1px solid ${color.border}`,
                    borderRadius: 8,
                    padding: "9px 16px",
                    fontSize: 19,
                  }}
                >
                  ← Back
                </div>
              </div>
              <div
                style={{
                  margin: 24,
                  height: 112,
                  border: `1px solid ${color.border}`,
                  borderRadius: 12,
                  padding: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 27, fontWeight: 500 }}>
                    Prefer detached
                  </div>
                  <div
                    style={{ marginTop: 10, fontSize: 22, color: color.muted }}
                  >
                    Open future launches in a separate window.
                  </div>
                </div>
                <div
                  data-guide-checkbox
                  style={{
                    width: 32,
                    height: 32,
                    border: `2px solid ${enabled ? color.mint : color.dim}`,
                    borderRadius: 5,
                    background: enabled ? color.mint : "transparent",
                  }}
                >
                  {enabled && <Icon name="check" size={28} tint={color.ink} />}
                </div>
              </div>
            </div>
          )}
        </GuidePopup>
        <GuidePopup appear={1.6} detached>
          <HomePalette windowed count={40} />
        </GuidePopup>
      </GuideBrowser>
      <Pointer
        points={[
          { at: 0, x: 1560, y: 580 },
          { at: 0.5, x: 1560, y: 580 },
          { at: 0.78, x: 1743, y: 358 },
          { at: 1.2, x: 1743, y: 358 },
        ]}
        clicks={[0.9]}
        hideAt={1.18}
      />
      <GuideCaption
        step="05 / MAKE IT YOURS"
        title={
          detached
            ? "Reopen in a separate window."
            : seconds >= 1.25
              ? "Reopen in a separate window."
              : seconds >= 0.45
                ? "Enable Prefer detached."
                : "Open Settings."
        }
        keys={
          seconds >= 1.25
            ? ["⌘ / Ctrl", "Shift", "F"]
            : seconds < 0.45
              ? ["Enter"]
              : undefined
        }
        active={
          (seconds >= 0.3 && seconds < 0.5) ||
          (seconds >= 1.45 && seconds < 1.7)
        }
        hint={
          seconds >= 1.25 ? "Your next launch uses this preference" : undefined
        }
      />
    </GuideFrame>
  );
};
