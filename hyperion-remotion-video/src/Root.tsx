import { Composition, Folder } from "remotion";
import { HyperionLaunchVideo } from "./Composition";
import { CleanupScene } from "./scenes/CleanupScene";
import { ClosingScene } from "./scenes/ClosingScene";
import { OpeningScene } from "./scenes/OpeningScene";
import { SearchScene } from "./scenes/SearchScene";
import { SettingsScene } from "./scenes/SettingsScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HyperionLaunch"
        component={HyperionLaunchVideo}
        durationInFrames={480}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="OpeningScene"
          component={OpeningScene}
          durationInFrames={66}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SearchScene"
          component={SearchScene}
          durationInFrames={108}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="CleanupScene"
          component={CleanupScene}
          durationInFrames={162}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SettingsScene"
          component={SettingsScene}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ClosingScene"
          component={ClosingScene}
          durationInFrames={78}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
