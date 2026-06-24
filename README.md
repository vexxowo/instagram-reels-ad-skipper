# Instagram Reels Ad Skipper

A userscript that detects sponsored/ad content in the Instagram Reels feed — video or image — and instantly skips past it.

## Features

- **Catches both ad formats.** Video ads ("Sponsored") and image/carousel ads ("Ad") are both detected — detection doesn't depend on a `<video>` element existing.
- **Multi-locale label matching.** Checks for the ad badge in several languages, since Instagram renders it in the account's UI language rather than the viewer's content language.
- **Instant skip, not animated.** Fires a keyboard `ArrowDown` event, clicks a "Next" control if rendered, and falls back to a direct `scrollTop` jump — all in the same tick, no smooth-scroll animation delay.
- **Lightweight by design.** Detection is driven by scroll/wheel/arrow-key events plus a light poll as a backstop, scoped to `<main>` rather than the whole document — no subtree-wide `MutationObserver`, which would otherwise fire constantly just from Instagram's own playback UI updating timestamps and counters.
- **No data collection.** Runs entirely client-side. No network requests, no analytics, no tracking.

## Installation

1. Install a userscript manager — [Violentmonkey](https://violentmonkey.github.io/) is recommended. [Tampermonkey](https://www.tampermonkey.net/) also works.
2. Click to install:

   [![Install Userscript](https://img.shields.io/badge/Install-Userscript-success?style=for-the-badge)](https://raw.githubusercontent.com/vexxowo/instagram-reels-ad-skipper/main/instagram-reels-ad-skipper.user.js)

   Your userscript manager should pick this up automatically and prompt to install. Also available on [GreasyFork](https://greasyfork.org).
3. Visit `instagram.com/reels` — the script runs automatically on page load.

## How it works

1. **Detection** — scans short leaf text nodes inside `<main>` for a visible ad/sponsored badge. Short labels (e.g. `Ad`) require an exact match to avoid false positives on words like "Add"; longer labels (e.g. `Sponsored`) are matched as a substring.
2. **Trigger timing** — checks run on `scroll`, `wheel`, and `ArrowDown`/`ArrowUp` keyup events (since that's when a reel transition actually happens), coalesced to one check per animation frame, plus a 250ms poll as a safety net for transitions that don't fire those events.
3. **Skip** — once an ad badge is confirmed visible, three skip strategies fire simultaneously: a synthetic `ArrowDown` keydown, a click on any rendered "Next" button, and a direct scroll-position jump on the nearest scrollable ancestor. A 1-second cooldown prevents re-triggering mid-skip.

## Configuration

All config lives at the top of the script:

| Constant | Purpose |
|---|---|
| `DEBUG` | Set to `true` to log detection/skip events to the console |
| `POLL_INTERVAL_MS` | Backstop poll frequency (default `250`) |
| `SKIP_COOLDOWN_MS` | Minimum gap between skips (default `1000`) |
| `EXACT_LABELS` | Short ad-label strings requiring an exact match |
| `CONTAINS_LABELS` | Longer ad-label strings matched as a substring |

If Instagram ships an ad label in a language not already covered, add it to the appropriate array.

## Known limitations

- Relies on Instagram's current DOM structure and ad-labeling text. Instagram changes both periodically without notice — if skipping stops working, the label arrays and the `<main>` scoping are the first places to check.
- Detection is text-based, not ID-based. If Instagram ever ships an ad with no visible "Ad"/"Sponsored" badge, this script won't catch it.

## Contributing

Issues and PRs welcome — especially additional ad-label translations or reports of Instagram DOM changes breaking detection.

## License

MIT — see [LICENSE](./LICENSE).

## Disclaimer

Not affiliated with Instagram or Meta. This script only modifies what your own browser renders on the page you're already viewing — it doesn't intercept network requests, bypass authentication, or access anyone else's data. Use at your own risk; Instagram's Terms of Service may not permit this kind of client-side modification.
