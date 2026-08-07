export default function StatsBar({ results, zipCode, filterNoWebsite, onToggleFilter }) {
  const noWebCount = results.filter((r) => !r.hasWebsite).length;

  return (
    <div className="stats-bar">
      <span className="stats-label">
        <strong>{results.length}</strong> facilit{results.length === 1 ? 'y' : 'ies'} near <strong>{zipCode}</strong>
      </span>

      <div className="segmented-control">
        <button
          className={`segment${!filterNoWebsite ? ' segment-active' : ''}`}
          onClick={() => filterNoWebsite && onToggleFilter()}
        >
          All <span className="seg-count">{results.length}</span>
        </button>
        <button
          className={`segment${filterNoWebsite ? ' segment-active-warning' : ''}`}
          onClick={() => !filterNoWebsite && onToggleFilter()}
          disabled={noWebCount === 0}
        >
          No Website <span className="seg-count">{noWebCount}</span>
        </button>
      </div>
    </div>
  );
}
