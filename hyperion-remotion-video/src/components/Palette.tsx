import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { color, Icon, Key, Logo, WindowBar } from "./Design";
import type { IconName } from "./Design";

export type TabData = {
  title: string;
  url: string;
  initial: string;
  tint: string;
  group?: string;
  badge?: string;
};

export const tabs: TabData[] = [
  {
    title: "Design explorations",
    url: "figma.com / Hyperion",
    initial: "F",
    tint: "#c2b6f5",
    group: "Design",
    badge: "opened 24 times",
  },
  {
    title: "Launch plan",
    url: "notion.so / Product launch",
    initial: "N",
    tint: "#dfdecf",
    group: "Work",
    badge: "opened 18 times",
  },
  {
    title: "Inbox — Alex",
    url: "mail.google.com",
    initial: "M",
    tint: "#eeb8a6",
    badge: "opened 12 times",
  },
  {
    title: "Getting started with React",
    url: "react.dev / Learn",
    initial: "R",
    tint: color.blue,
    group: "Build",
    badge: "opened 9 times",
  },
];

export const matches: TabData[] = [
  {
    title: "Launch checklist",
    url: "linear.app / Launch",
    initial: "L",
    tint: color.lavender,
    group: "Work",
  },
  { ...tabs[1], badge: undefined },
  {
    title: "Launch assets",
    url: "figma.com / Launch",
    initial: "F",
    tint: color.lavender,
    group: "Design",
  },
];

export const Section = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      fontSize: 17,
      color: color.dim,
      padding: "11px 17px 14px",
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

export const TabRow = ({
  tab,
  selected = false,
  badge,
  merging = false,
  faded = false,
  style,
}: {
  tab: TabData;
  selected?: boolean;
  badge?: ReactNode;
  merging?: boolean;
  faded?: boolean;
  style?: CSSProperties;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      height: 91,
      borderRadius: 12,
      padding: "12px 17px",
      background: selected ? color.selected : "transparent",
      border: `1px solid ${selected ? "#91c2b02b" : "transparent"}`,
      opacity: faded ? 0.42 : 1,
      ...style,
    }}
  >
    <span
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: 9,
        background: `${tab.tint}18`,
        border: `1px solid ${tab.tint}40`,
        color: tab.tint,
        fontSize: 21,
        fontWeight: 600,
      }}
    >
      {tab.initial}
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {tab.group && (
          <span
            style={{
              border: `1px solid ${tab.tint}45`,
              color: tab.tint,
              background: `${tab.tint}0c`,
              borderRadius: 5,
              padding: "3px 6px",
              fontSize: 15,
            }}
          >
            {tab.group}
          </span>
        )}
        <span
          style={{
            fontSize: 25,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tab.title}
        </span>
      </div>
      <div style={{ color: color.muted, fontSize: 19, marginTop: 8 }}>
        {tab.url}
      </div>
    </div>
    {badge || tab.badge ? (
      <span
        style={{
          color: merging ? color.mint : color.muted,
          fontSize: 17,
          whiteSpace: "nowrap",
          padding: "6px 10px",
          background: "#17262e",
          borderRadius: 7,
        }}
      >
        {badge ?? tab.badge}
      </span>
    ) : null}
    {selected && !merging && <Icon name="enter" size={20} tint={color.muted} />}
  </div>
);

export const Palette = ({
  query = "",
  count = 42,
  children,
  style,
  windowed = false,
  bodyHeight,
  selectQuery = false,
  footer,
}: {
  query?: string;
  count?: number;
  children: ReactNode;
  style?: CSSProperties;
  windowed?: boolean;
  bodyHeight?: number;
  selectQuery?: boolean;
  footer?: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #40564e",
        borderRadius: 22,
        background: color.panel,
        boxShadow: "0 40px 90px #00000055, 0 1px 0 #adcbb512 inset",
        overflow: "hidden",
        ...style,
      }}
    >
      {windowed && <WindowBar />}
      <div
        style={{
          height: 89,
          padding: "0 23px",
          borderBottom: `1px solid ${color.border}`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Logo size={35} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            fontSize: query ? 27 : 24,
            letterSpacing: -0.4,
            color: query ? color.white : color.dim,
          }}
        >
          <span style={{ background: selectQuery ? "#3b6575" : undefined }}>
            {query || "Search tabs or type / for commands..."}
          </span>
          {query && !selectQuery && (
            <span
              style={{
                display: "inline-block",
                verticalAlign: "-4px",
                marginLeft: 3,
                width: 2,
                height: 28,
                background: color.mint,
                opacity: Math.floor(frame / (fps / 2)) % 2 === 0 ? 1 : 0,
              }}
            />
          )}
        </div>
        <span
          style={{ fontSize: 18, color: color.muted, whiteSpace: "nowrap" }}
        >
          {count} open tabs
        </span>
      </div>
      <div style={{ padding: "9px 12px 14px" }}>
        <div
          style={{
            height: bodyHeight,
            overflow: bodyHeight ? "hidden" : undefined,
          }}
        >
          {children}
        </div>
      </div>
      <div
        style={{
          height: 59,
          borderTop: `1px solid ${color.border}`,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 25px",
          color: color.muted,
          fontSize: 16,
        }}
      >
        {footer ?? (
          <>
            <span>
              <Key>↑</Key> <Key>↓</Key> Navigate
            </span>
            <span>
              <Key>↵</Key> Execute
            </span>
            <span>
              <Key>Tab</Key> Actions
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export const HomePalette = ({
  windowed = false,
  count = 42,
}: {
  windowed?: boolean;
  count?: number;
}) => (
  <Palette windowed={windowed} count={count} bodyHeight={430}>
    <Section>Most frequented tabs</Section>
    {tabs.map((tab, i) => (
      <TabRow key={tab.title} tab={tab} selected={i === 0} />
    ))}
  </Palette>
);

export const ActionRow = ({
  title,
  description,
  icon,
  count,
  selected = false,
}: {
  title: string;
  description: string;
  icon: IconName;
  count?: number;
  selected?: boolean;
}) => (
  <div
    style={{
      height: 91,
      display: "flex",
      alignItems: "center",
      gap: 17,
      padding: "12px 17px",
      background: selected ? color.selected : "transparent",
      borderRadius: 12,
    }}
  >
    <Icon name={icon} size={28} tint={selected ? color.mint : color.muted} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 23, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 18, marginTop: 7, color: color.muted }}>
        {description}
      </div>
    </div>
    {count !== undefined && (
      <span style={{ fontSize: 18, color: color.muted }}>{count}</span>
    )}
  </div>
);
