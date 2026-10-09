import { AbsoluteFill } from "remotion";
import {
  ChromeIcon,
  color,
  fontFamily,
  Key,
  Logo,
  Reveal,
} from "../components/Design";

export const ClosingScene = () => (
  <AbsoluteFill
    className="hyperion-film"
    style={{
      background: color.ink,
      color: color.white,
      fontFamily,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <style>{`.hyperion-film, .hyperion-film * { box-sizing: border-box; }`}</style>
    <Reveal style={{ display: "flex", gap: 22, alignItems: "center" }}>
      <Logo size={110} />
      <span style={{ fontSize: 82, fontWeight: 600, letterSpacing: -3 }}>
        Hyperion2
      </span>
    </Reveal>
    <Reveal delay={0.08} style={{ marginTop: 25 }}>
      <h1
        style={{
          fontSize: 46,
          fontWeight: 500,
          letterSpacing: -1.5,
          margin: 0,
        }}
      >
        Find. Clean up. Keep moving.
      </h1>
    </Reveal>
    <Reveal
      delay={0.16}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginTop: 53,
        fontSize: 28,
        color: color.mint,
      }}
    >
      <ChromeIcon size={29} />
      Get Hyperion2 on the Chrome Web Store
    </Reveal>
    <Reveal
      delay={0.24}
      style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 42 }}
    >
      <Key large>⌘ / Ctrl</Key>
      <Key large>Shift</Key>
      <Key large>F</Key>
      <span style={{ fontSize: 22, color: color.muted, marginLeft: 12 }}>
        One shortcut to your tabs.
      </span>
    </Reveal>
  </AbsoluteFill>
);
