import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // Update state so the next render will show the fallback UI
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // You can log the error to an error reporting service here
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Custom Fallback UI for dssconfessions
      return (
        <div className="sleeve-panel p-8 text-center">
          <h2 className="text-2xl font-bold uppercase mb-4 tracking-tighter">
            Something went wrong.
          </h2>
          <p className="text-(--ink-soft) mb-6 text-sm">
            We couldn't load this section. Try refreshing or going back.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-paper px-6 py-3 font-bold text-button uppercase tracking-widest"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
