# Hyperion2 Chrome extension quick tour

A 16-second, 1920 × 1080 promotional walkthrough for the Chrome Web Store. A continuous browser context, enlarged extension UI, cursor clicks, keyboard cues, and short instructional captions show how to use Hyperion2. The film works with sound off; there is currently no audio track.

## Preview

```sh
bun install
bun run dev
```

Open `HyperionLaunch` in Remotion Studio. Individual scenes are also registered under `Scenes`.

## Story

| Starts | Action                                                       | Visible result                                                         |
| ------ | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 0:00   | Click Hyperion2 in the Chrome toolbar.                       | The extension popup opens beneath the toolbar.                         |
| 0:02   | Type a search, select a result, and press Enter.             | Chrome switches to the requested tab and the popup closes.             |
| 0:05.4 | Reopen Hyperion2 and use `/dup` to find duplicate tabs.      | Merging a group removes two extra tabs; the total drops from 42 to 40. |
| 0:08   | Replace the query with `/least` and select Suspend.          | The idle-tab list clears while the browser tabs stay open.             |
| 0:10.6 | Open Settings, enable Prefer detached, and reopen Hyperion2. | The next launch appears in a separate window.                          |
| 0:13.4 | Brand sign-off and Chrome Web Store call to action.          | The launch shortcut stays visible through the final frame.             |

The five scene durations total 16.8 seconds, with four 0.2-second transitions: 480 frames at 30 fps. All animation uses the Remotion frame clock. Keep standalone scene durations in `Root.tsx` aligned with the main timeline.

These are illustrative UI recreations with sample data, not a screen recording. Actions follow the parent extension implementation: fuzzy search, per-URL duplicate merging, idle-tab suspension, and the detached preference. The keyboard shortcut is `Command+Shift+F` on macOS and `Ctrl+Shift+F` elsewhere.

## Source

- `src/Composition.tsx`: main timeline and transitions.
- `src/Root.tsx`: full film and individual scene registrations.
- `src/scenes/`: toolbar launch, search, cleanup, detached window, and sign-off.
- `src/components/Walkthrough.tsx`: browser stage, page context, popup placement, pointer, and instructional captions.
- `src/components/Palette.tsx`: extension UI and sample tabs.
- `src/components/Design.tsx`: branding, colors, fonts, icons, and keyboard keys.
- `public/hyperion2.svg`: original extension logo.

## Validate and export

```sh
bun run lint
bun run build
```

Export an MP4 when ready:

```sh
bunx remotion render HyperionLaunch out/hyperion-store-intro.mp4 --codec=h264 --crf=18 --pixel-format=yuv420p
```

Export an extension-focused poster frame:

```sh
bunx remotion still HyperionLaunch out/hyperion-store-poster.png --frame=105
```

The original two review passes and their frame galleries are saved locally under `out/guide-review/`. The latest 16-second timing review is in `out/compact-review/`, covering action synchronization, visual bounds, and full playback. Generated bundles and review artifacts are ignored in `build/` and `out/`. Fonts use `@remotion/google-fonts` and require network access on first load.
