import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import { CleanupScene } from "./scenes/CleanupScene";
import { ClosingScene } from "./scenes/ClosingScene";
import { OpeningScene } from "./scenes/OpeningScene";
import { SearchScene } from "./scenes/SearchScene";
import { SettingsScene } from "./scenes/SettingsScene";

export const HyperionLaunchVideo = () => {
  const { fps } = useVideoConfig();
  // 16.8 seconds of scenes, with four 0.2-second overlaps: 16 seconds total.
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence
        name="Open from the Chrome toolbar"
        durationInFrames={2.2 * fps}
        premountFor={fps}
      >
        <OpeningScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 0.2 * fps })}
      />
      <TransitionSeries.Sequence
        name="Find and switch tabs"
        durationInFrames={3.6 * fps}
        premountFor={fps}
      >
        <SearchScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 0.2 * fps })}
      />
      <TransitionSeries.Sequence
        name="Merge and suspend"
        durationInFrames={5.4 * fps}
        premountFor={fps}
      >
        <CleanupScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 0.2 * fps })}
      />
      <TransitionSeries.Sequence
        name="Open a detached launcher"
        durationInFrames={3 * fps}
        premountFor={fps}
      >
        <SettingsScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 0.2 * fps })}
      />
      <TransitionSeries.Sequence
        name="Hyperion2 on the Chrome Web Store"
        durationInFrames={2.6 * fps}
        premountFor={fps}
      >
        <ClosingScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
