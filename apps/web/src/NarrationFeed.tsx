// The agent thinking out loud. Lines arrive on the timing the gateway recorded,
// typed a character at a time, so a viewer watches a decision being made rather
// than a log being dumped.
//
// Proportional font, never mono: this is speech, not a record. At most four lines
// are visible; older ones slide up under a gradient and there is never a
// scrollbar. Reduced motion shows every line at once with no caret.

import { useEffect, useState } from "react";
import type { NarrationLine } from "./types";

/** From the design tokens: 21ms a character, 220ms between lines. */
const PER_CHAR_MS = 21;
const STAGGER_MS = 220;
/**
 * The package allows four. Three is what fits the 104px strip at our line
 * height, and a fourth line clipped through the middle of its glyphs reads as a
 * broken layout rather than as history scrolling away.
 */
const VISIBLE_LINES = 3;

interface Props {
  lines: NarrationLine[];
  /** Static captions instead of a replay, for reduced motion and for stills. */
  instant?: boolean;
}

interface Progress {
  /** Index of the line currently being typed; equals lines.length when done. */
  line: number;
  chars: number;
}

export function NarrationFeed({ lines, instant = false }: Props) {
  const [progress, setProgress] = useState<Progress>({ line: 0, chars: 0 });

  useEffect(() => {
    if (instant || lines.length === 0) {
      setProgress({ line: lines.length, chars: 0 });
      return;
    }

    setProgress({ line: 0, chars: 0 });
    let cancelled = false;
    let timer = 0;
    let line = 0;
    let chars = 0;

    const tick = () => {
      if (cancelled) return;
      const text = lines[line]?.line ?? "";

      if (chars < text.length) {
        chars += 1;
        setProgress({ line, chars });
        timer = window.setTimeout(tick, PER_CHAR_MS);
        return;
      }
      if (line + 1 < lines.length) {
        line += 1;
        chars = 0;
        setProgress({ line, chars });
        timer = window.setTimeout(tick, STAGGER_MS);
        return;
      }
      setProgress({ line: lines.length, chars: 0 });
    };

    timer = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lines, instant]);

  if (lines.length === 0) {
    return (
      <p className="feed__idle">
        waiting for the desk
        <span className="feed__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </p>
    );
  }

  const typing = progress.line < lines.length;
  const rendered = lines.slice(0, typing ? progress.line + 1 : lines.length);
  const visible = rendered.slice(-VISIBLE_LINES);
  const firstVisible = rendered.length - visible.length;

  return (
    <ol className="feed">
      {visible.map((entry, i) => {
        const index = firstVisible + i;
        const live = typing && index === progress.line;
        const text = live ? entry.line.slice(0, progress.chars) : entry.line;

        return (
          <li key={`${entry.t}-${index}`} className="feed__line">
            <span className="feed__bullet" aria-hidden="true">
              ▸
            </span>
            <span className="speech">{text}</span>
            {live ? <span className="feed__caret" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
