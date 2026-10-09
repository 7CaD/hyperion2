import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { color, fontFamily, Icon, Key, Logo, smooth } from "./Design";

// Coordinates share one browser stage so the pointer, toolbar and popup agree.
export const browserBox = { left: 84, top: 70, width: 1752, height: 808 };
export const toolbarTarget = { x: 1680, y: 151 };
export const popupBox = { left: 520, top: 120, width: 1200 };

export const GuideFrame = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill
    className="hyperion-film"
    style={{
      background: color.ink,
      color: color.white,
      fontFamily,
      overflow: "hidden",
      WebkitFontSmoothing: "antialiased",
    }}
  >
    <style>{`.hyperion-film, .hyperion-film * { box-sizing: border-box; }`}</style>
    <div
      style={{
        position: "absolute",
        left: 88,
        top: 25,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: color.muted,
        fontSize: 18,
      }}
    >
      <Logo size={25} />
      <span style={{ color: color.white, fontWeight: 600 }}>Hyperion2</span>
      <span style={{ margin: "0 6px", color: color.dim }}>/</span>Chrome
      extension · Quick tour
    </div>
    {children}
  </AbsoluteFill>
);

export const GuideCaption = ({
  step,
  title,
  keys,
  active = false,
  hint,
}: {
  step: string;
  title: string;
  keys?: string[];
  active?: boolean | string[];
  hint?: string;
}) => (
  <div
    data-guide-caption
    style={{
      position: "absolute",
      left: 92,
      right: 92,
      top: 917,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 34,
    }}
  >
    <div style={{ borderLeft: `3px solid ${color.mint}`, paddingLeft: 23 }}>
      <div
        style={{
          fontSize: 17,
          letterSpacing: 2.4,
          color: color.mint,
          fontWeight: 600,
          marginBottom: 13,
        }}
      >
        {step}
      </div>
      <h1
        style={{
          fontSize: 39,
          lineHeight: 1.14,
          letterSpacing: -1.2,
          fontWeight: 500,
          margin: 0,
        }}
      >
        {title}
      </h1>
    </div>
    {keys && (
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {keys.map((key) => (
            <Key
              key={key}
              large
              active={Array.isArray(active) ? active.includes(key) : active}
            >
              {key}
            </Key>
          ))}
        </div>
        {hint && (
          <div style={{ color: color.muted, fontSize: 18, marginTop: 10 }}>
            {hint}
          </div>
        )}
      </div>
    )}
  </div>
);

const browserTabs = [
  { title: "Inbox", initial: "M", tint: "#eeb8a6" },
  { title: "Design explorations", initial: "F", tint: color.lavender },
  { title: "Launch plan", initial: "N", tint: "#cdd4c2" },
  {
    title: "Design explorations",
    initial: "F",
    tint: color.lavender,
    extra: true,
  },
  { title: "React docs", initial: "R", tint: color.blue },
  { title: "Launch checklist", initial: "L", tint: color.lavender },
  {
    title: "Design explorations",
    initial: "F",
    tint: color.lavender,
    extra: true,
  },
  { title: "Weekend reading", initial: "M", tint: "#d6d8bb" },
  { title: "Trip inspiration", initial: "A", tint: color.blue },
];

const WorkspacePage = ({ page }: { page: "design" | "launch" }) => (
  <div
    style={{
      position: "absolute",
      inset: "114px 0 0",
      background: "#ecede7",
      color: "#314037",
      display: "flex",
    }}
  >
    <div
      style={{
        width: 235,
        background: "#e1e5dc",
        padding: "39px 28px",
        borderRight: "1px solid #ccd4c7",
      }}
    >
      <div style={{ fontSize: 23, fontWeight: 600, marginBottom: 44 }}>
        Alex’s workspace
      </div>
      {["Overview", "Projects", "Team notes", "Archive"].map((label, i) => (
        <div
          key={label}
          style={{
            fontSize: 21,
            color: i === 1 ? "#2e5844" : "#7b877b",
            margin: "26px 0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon name={i === 1 ? "window" : "copy"} size={18} />
          {label}
        </div>
      ))}
    </div>
    <div style={{ flex: 1, padding: "44px 66px" }}>
      <div style={{ fontSize: 19, color: "#7b897c", marginBottom: 25 }}>
        Projects <span style={{ margin: "0 10px" }}>/</span>{" "}
        {page === "launch" ? "Product launch" : "Design"}
      </div>
      <h2
        style={{
          fontSize: 53,
          letterSpacing: -2,
          fontWeight: 600,
          margin: "0 0 15px",
        }}
      >
        {page === "launch" ? "Launch plan" : "Design explorations"}
      </h2>
      <div style={{ fontSize: 24, color: "#728370", marginBottom: 38 }}>
        {page === "launch"
          ? "Everything we need to get this out into the world."
          : "Ideas, references, and the next thing to build."}
      </div>
      {page === "launch" ? (
        <div style={{ maxWidth: 1100 }}>
          {[
            "Polish the final details",
            "Get the team on the same page",
            "Make something worth sharing",
          ].map((item, i) => (
            <div
              key={item}
              style={{
                display: "flex",
                gap: 20,
                alignItems: "center",
                borderTop: "1px solid #cdd6c7",
                padding: "24px 0",
                fontSize: 28,
              }}
            >
              <span
                style={{
                  width: 27,
                  height: 27,
                  border: "1px solid #99ad94",
                  borderRadius: 5,
                  background: i === 0 ? "#305c45" : "transparent",
                }}
              >
                {i === 0 && <Icon name="check" size={25} tint="#edf0e8" />}
              </span>
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 25, marginTop: 46 }}>
          {["References", "In progress", "Ready for review"].map((label, i) => (
            <div
              key={label}
              style={{
                width: 337,
                height: 273,
                padding: 25,
                border: "1px solid #cdd4c9",
                borderRadius: 12,
                background: "#f5f5f0",
              }}
            >
              <div style={{ fontSize: 21, fontWeight: 500 }}>{label}</div>
              <div
                style={{
                  height: 115,
                  marginTop: 22,
                  borderRadius: 6,
                  background: ["#d7e4d9", "#dcd9ec", "#d8e4e9"][i],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="window" size={39} tint="#85958b" />
              </div>
              <div
                style={{
                  height: 8,
                  width: "75%",
                  background: "#dce1d7",
                  borderRadius: 4,
                  marginTop: 22,
                }}
              />
              <div
                style={{
                  height: 7,
                  width: "48%",
                  background: "#e4e7e0",
                  borderRadius: 4,
                  marginTop: 11,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const GuideBrowser = ({
  children,
  page = "design",
  merged = 0,
  shade = 0,
  highlightToolbar = false,
}: {
  children?: ReactNode;
  page?: "design" | "launch";
  merged?: number;
  shade?: number;
  highlightToolbar?: boolean;
}) => (
  <div
    data-guide-browser
    style={{
      position: "absolute",
      ...browserBox,
      border: "1px solid #40504b",
      borderRadius: 15,
      overflow: "hidden",
      background: "#20302f",
      boxShadow: "0 16px 60px #0005",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto",
        height: 50,
        display: "flex",
        alignItems: "stretch",
        paddingTop: 8,
        paddingLeft: 92,
        gap: 2,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 21,
          top: 21,
          display: "flex",
          gap: 7,
        }}
      >
        {["#dc8c84", "#d8bb78", "#8bb495"].map((c) => (
          <span
            key={c}
            style={{ width: 9, height: 9, background: c, borderRadius: "50%" }}
          />
        ))}
      </div>
      {browserTabs.map((tab, index) => (
        <div
          key={index}
          style={{
            width: tab.extra ? 170 * (1 - merged) : 170,
            opacity: tab.extra ? 1 - merged : 1,
            flexShrink: 0,
            overflow: "hidden",
            borderRadius: "8px 8px 0 0",
            background: (page === "launch" ? index === 2 : index === 1)
              ? "#3e504c"
              : "#283a36",
          }}
        >
          <div
            style={{
              width: 170,
              height: "100%",
              padding: "0 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 14,
              color: color.muted,
            }}
          >
            <span style={{ color: tab.tint, fontWeight: 600 }}>
              {tab.initial}
            </span>
            <span
              style={{
                minWidth: 0,
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {tab.title}
            </span>
            <Icon name="close" size={11} />
          </div>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          color: color.muted,
          padding: "0 14px",
        }}
      >
        <Icon name="plus" size={19} />
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        height: 64,
        background: "#3e504c",
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 21px",
        color: "#b5c6be",
      }}
    >
      <span style={{ fontSize: 26 }}>←</span>
      <span style={{ fontSize: 26 }}>→</span>
      <span style={{ fontSize: 28 }}>↻</span>
      <div
        style={{
          position: "absolute",
          left: 144,
          right: 227,
          height: 38,
          borderRadius: 23,
          background: "#263b34",
          display: "flex",
          alignItems: "center",
          paddingLeft: 20,
          gap: 15,
          fontSize: 17,
        }}
      >
        <Icon name="window" size={17} />
        {page === "launch"
          ? "notion.so / Launch plan"
          : "figma.com / Design explorations"}
      </div>
      <div
        data-guide-toolbar-target
        style={{
          position: "absolute",
          right: 136,
          top: 12,
          width: 40,
          height: 40,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: highlightToolbar ? "#01ecb826" : "transparent",
          outline: highlightToolbar ? `2px solid ${color.mint}` : "none",
        }}
      >
        <Logo size={31} />
      </div>
      <div style={{ position: "absolute", right: 92, top: 20 }}>
        <Icon name="copy" size={24} />
      </div>
      <div
        style={{
          position: "absolute",
          right: 47,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#829b88",
          color: "#213a2b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
        }}
      >
        A
      </div>
      <div style={{ position: "absolute", right: 18, fontSize: 28 }}>⋮</div>
    </div>
    <WorkspacePage page={page} />
    <div
      style={{
        position: "absolute",
        inset: "114px 0 0",
        background: "#08130f",
        opacity: shade,
      }}
    />
    {children}
  </div>
);

export const GuidePopup = ({
  children,
  appear = 0,
  disappear,
  detached = false,
  style,
}: {
  children: ReactNode;
  appear?: number;
  disappear?: number;
  detached?: boolean;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      data-guide-popup
      style={{
        position: "absolute",
        ...popupBox,
        ...(detached ? { left: 276, top: 138 } : {}),
        opacity: Math.min(
          interpolate(
            frame,
            [appear * fps, (appear + 0.18) * fps],
            [0, 1],
            smooth,
          ),
          disappear === undefined
            ? 1
            : interpolate(
                frame,
                [disappear * fps, (disappear + 0.16) * fps],
                [1, 0],
                smooth,
              ),
        ),
        translate: `0 ${interpolate(frame, [appear * fps, (appear + 0.22) * fps], [-9, 0], smooth)}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

type PointerPoint = { at: number; x: number; y: number };
export const Pointer = ({
  points,
  clicks = [],
  hideAt,
}: {
  points: PointerPoint[];
  clicks?: number[];
  hideAt?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const click = clicks.find(
    (at) => frame >= at * fps && frame < (at + 0.35) * fps,
  );
  return (
    <div
      data-guide-pointer
      style={{
        position: "absolute",
        left: interpolate(
          frame,
          points.map((p) => p.at * fps),
          points.map((p) => p.x),
          smooth,
        ),
        top: interpolate(
          frame,
          points.map((p) => p.at * fps),
          points.map((p) => p.y),
          smooth,
        ),
        opacity:
          hideAt === undefined
            ? 1
            : interpolate(
                frame,
                [hideAt * fps, (hideAt + 0.12) * fps],
                [1, 0],
                smooth,
              ),
        pointerEvents: "none",
      }}
    >
      {click !== undefined && (
        <div
          style={{
            position: "absolute",
            left: -24,
            top: -24,
            width: 48,
            height: 48,
            border: `3px solid ${color.mint}`,
            borderRadius: "50%",
            scale: interpolate(
              frame,
              [click * fps, (click + 0.35) * fps],
              [0.25, 1.4],
              smooth,
            ),
            opacity: interpolate(
              frame,
              [click * fps, (click + 0.35) * fps],
              [1, 0],
              smooth,
            ),
          }}
        />
      )}
      <svg
        width="35"
        height="42"
        viewBox="0 0 35 42"
        style={{ filter: "drop-shadow(0 2px 3px #0007)" }}
      >
        <path
          d="M2 2 29 24 17 25 11 37Z"
          fill="#fff"
          stroke="#142b24"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const FocusRing = ({
  top,
  left,
  width,
  height,
  from,
  until,
}: {
  top: number;
  left: number;
  width: number;
  height: number;
  from: number;
  until: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        border: `2px solid ${color.mint}`,
        borderRadius: 12,
        pointerEvents: "none",
        opacity: interpolate(
          frame,
          [from * fps, (from + 0.12) * fps, until * fps, (until + 0.12) * fps],
          [0, 0.85, 0.85, 0],
          smooth,
        ),
      }}
    />
  );
};
