// The agent thinking out loud. Lines arrive on the timing the gateway recorded,
// so the feed replays the decision as it happened instead of dumping a log.

import { useEffect, useState } from "react";
import type { NarrationLine } from "./types";

interface Props {
  lines: NarrationLine[];
  /** Static captions instead of a replay, for reduced motion and for stills. */
  instant?: boolean;
}

export function NarrationFeed({ lines, instant = false }: Props) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (instant) {
      setShown(lines.length);
      return;
    }
    setShown(0);
    const timers = lines.map((_, i) =>
      window.setTimeout(() => setShown(i + 1), 220 * i),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [lines, instant]);

  if (lines.length === 0) {
    return <p className="feed__idle">waiting for the desk</p>;
  }

  return (
    <ol className="feed">
      {lines.slice(0, shown).map((line, i) => (
        <li key={`${line.t}-${i}`} className="feed__line">
          {line.line}
        </li>
      ))}
    </ol>
  );
}
