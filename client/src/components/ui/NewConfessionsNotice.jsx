export default function NewConfessionsNotice({ onRefresh, onLater }) {
  return (
    <aside className="new-confessions" aria-label="New confessions">
      <span className="new-confessions__record" aria-hidden="true">
        <span />
      </span>
      <div className="new-confessions__copy">
        <p role="status">New confessions just dropped.</p>
        <span>A fresh track for your mixtape.</span>
        <div className="new-confessions__actions">
          <button type="button" className="btn btn-ink" onClick={onRefresh}>
            Refresh
          </button>
          <button type="button" className="btn btn-paper" onClick={onLater}>
            Later
          </button>
        </div>
      </div>
    </aside>
  );
}
