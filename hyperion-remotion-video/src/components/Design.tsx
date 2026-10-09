import { loadFont } from "@remotion/google-fonts/Inter";
import type { CSSProperties, ReactNode } from "react";
import {
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const { fontFamily } = loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "500", "600", "700", "800"],
});

export const color = {
  ink: "#080f13",
  panel: "#101b24",
  selected: "#20313d",
  border: "#2a3b44",
  white: "#f4f6f2",
  muted: "#a8b8bb",
  dim: "#71888e",
  mint: "#01ecb8",
  blue: "#8ccaff",
  lavender: "#c2b6f5",
};

export const smooth = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

export const Logo = ({ size = 44 }: { size?: number }) => (
  <Img
    src={staticFile("hyperion2.svg")}
    style={{ width: size, height: size, flexShrink: 0 }}
  />
);

export type IconName =
  | "search"
  | "arrow"
  | "enter"
  | "check"
  | "copy"
  | "moon"
  | "window"
  | "close"
  | "plus";

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15M13 5l7 7-7 7" />
    </>
  ),
  enter: (
    <>
      <path d="M20 5v8H5m5-5-5 5 5 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M15 8V4H4v11h4" />
    </>
  ),
  moon: <path d="M20 15.5A9 9 0 0 1 8.5 4a9 9 0 1 0 11.5 11.5Z" />,
  window: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18m-13-3h.1m3 0h.1" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export const Icon = ({
  name,
  size = 26,
  tint = "currentColor",
}: {
  name: IconName;
  size?: number;
  tint?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={tint}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {paths[name]}
  </svg>
);

export const ChromeIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M12 8h9M8.5 14 4 6M14 15.5 9.5 22"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

export const Reveal = ({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        opacity: interpolate(
          frame,
          [delay * fps, (delay + 0.28) * fps],
          [0, 1],
          smooth,
        ),
        translate: `0 ${interpolate(frame, [delay * fps, (delay + 0.42) * fps], [24, 0], smooth)}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Key = ({
  children,
  active = false,
  large = false,
}: {
  children: ReactNode;
  active?: boolean;
  large?: boolean;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: large ? 55 : 27,
      height: large ? 56 : 27,
      padding: large ? "0 16px" : "0 7px",
      borderRadius: large ? 10 : 5,
      background: active ? color.mint : "#17242b",
      color: active ? color.ink : color.muted,
      border: `1px solid ${active ? color.mint : "#34464f"}`,
      boxShadow: active ? "none" : "0 3px 0 #070d11",
      fontSize: large ? 25 : 17,
      fontWeight: 500,
    }}
  >
    {children}
  </span>
);

export const WindowBar = ({
  title = "Hyperion2",
  light = false,
}: {
  title?: string;
  light?: boolean;
}) => (
  <div
    style={{
      height: 49,
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "0 20px",
      borderBottom: `1px solid ${light ? "#dfe3dc" : color.border}`,
      background: light ? "#e5e9e2" : "#14212a",
      color: light ? "#5b6860" : color.dim,
      fontSize: 16,
    }}
  >
    {["#e98e85", "#e3c278", "#86b898"].map((c) => (
      <span
        key={c}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: c,
          opacity: 0.85,
        }}
      />
    ))}
    <span style={{ flex: 1, textAlign: "center", marginRight: 50 }}>
      {title}
    </span>
  </div>
);
