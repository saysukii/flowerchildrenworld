import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[Garden whiteboard]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-light text-foreground/70">The whiteboard could not load.</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-light text-background"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
