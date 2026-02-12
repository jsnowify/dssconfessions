import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // Update state so the next render will show the fallback UI
  static getDerivedStateFromError(error) {
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
        <div className="p-10 border-2 border-dashed border-black rounded-2xl bg-zinc-50 text-center animate-fade-in">
          <h2 className="text-2xl font-bold uppercase mb-4 tracking-tighter">
            Something went wrong.
          </h2>
          <p className="text-zinc-500 mb-6 text-sm">
            We couldn't load this section. Try refreshing or going back.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-transform"
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
