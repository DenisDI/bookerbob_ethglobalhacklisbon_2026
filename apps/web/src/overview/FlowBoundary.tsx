// A step that fails must not take the booking down with it.
//
// This is not defensive decoration. The personhood step renders a third-party
// widget through a component this session does not own, and it has already thrown
// on mount once and blanked the whole page. A flow whose other five steps still
// work is worth more than a stack trace, and "this one step is unavailable" is a
// state the brief asks every surface to have anyway.
//
// A class component because that is still the only way to catch a render error in
// React 18. It is small and it is the only one in the app.

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** What the reader loses, in their words, so the gap explains itself. */
  fallback: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class FlowBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged in full, shown as one sentence: the reader gets the consequence,
    // whoever is debugging gets the trace.
    console.error("step failed to render", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return <p className="step__down reason">{this.props.fallback}</p>;
    }
    return this.props.children;
  }
}
