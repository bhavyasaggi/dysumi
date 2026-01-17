import React from "react";

export default class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: Record<string, unknown>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
