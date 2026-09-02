import { useEffect, useState, useRef } from 'react';

const BACKEND_URL = 'http://localhost:3001';

const sessions = [
  { key: 'PRE', label: 'Pre-Market' },
  { key: 'REGULAR', label: 'Regular Hours' },
  { key: 'POST', label: 'After Hours' },
  { key: 'CALENDAR', label: 'Calendar' },
  { key: 'WATCHLIST', label: 'Watchlist' },
];

const columns = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'price', label: 'Price' },
  { key: 'changePercent', label: '%Chg' },
  { key: 'rvol', label: 'RVOL' },
  { key: 'float', label: 'Float' },
  { key: 'sector', label: 'Sector' },
  { key: 'country', label: 'Country' },
];

const earningsColumns = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'companyName', label: 'Company' },
  { key: 'expectedDate', label: 'Expected Date' },
  { key: 'price', label: 'Price' },
  { key: 'float', label: 'Float' },
  { key: 'sector', label: 'Sector' },
];

const CUSTOM_TICKERS_KEY = 'stockbuddy_custom_earnings_tickers';
const MAX_CUSTOM_TICKERS = 30;

const MAX_FLOAT_KEY = 'stockbuddy_max_float_filter';
const FLOAT_MIN = 500_000;
const FLOAT_MAX = 500_000_000;
const FLOAT_STEP = 100_000;
const FLOAT_DEFAULT = 20_000_000;

const FLOAT_TRACK_HEIGHT = 160;
const FLOAT_TRACK_WIDTH = 6;
const FLOAT_BALL_SIZE = 14;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatFloat(n) {
  if (n == null) return 'N/A';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (n / 1_000).toFixed(0) + 'K';
}

/**
 * Earnings calendar. Fetch/state is owned by the parent (App) and passed down
 * as props so switching tabs away and back does NOT trigger a refetch.
 * Adding/removing a ticker updates local state directly (no full-list refetch).
 */
function EarningsCalendar({ earnings, loadingCal, onAddTicker, onRemoveTicker }) {
  const [sortKey, setSortKey] = useState('expectedDate');
  const [sortDir, setSortDir] = useState('asc');
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') closeSearch();
    }
    if (showSearch) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query.trim())}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data.results || []);
          setSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearching(false);
        });
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function openSearch() {
    setShowSearch(true);
    setQuery('');
    setSearchResults([]);
    setAddError('');
  }

  function closeSearch() {
    setShowSearch(false);
    setQuery('');
    setSearchResults([]);
    setAddError('');
  }

  async function handleSelectResult(symbol) {
    if (earnings.some(e => e.ticker === symbol)) {
      setAddError('Ticker already in the list');
      return;
    }
    if (earnings.length >= MAX_CUSTOM_TICKERS) {
      setAddError(`Maximum of ${MAX_CUSTOM_TICKERS} tickers reached`);
      return;
    }
    setAdding(true);
    setAddError('');
    const ok = await onAddTicker(symbol);
    setAdding(false);
    if (ok) {
      setQuery('');
      setSearchResults([]);
      inputRef.current?.focus();
    } else {
      setAddError(`Couldn't load data for ${symbol}`);
    }
  }

  if (loadingCal) return <p style={{ color: '#888' }}>Loading earnings...</p>;

  const sorted = [...earnings].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <>
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            tableLayout: 'fixed',
            background: '#242424',
            color: '#e0e0e0',
          }}
        >
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#161616' }}>
              {earningsColumns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '10px 10px',
                    fontSize: '13px',
                    textAlign: 'left',
                    color: '#4ade80',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    borderRight: col.key !== 'sector' ? '1px solid #333' : 'none',
                  }}
                >
                  {col.key === 'ticker' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span>
                        {col.label}{' '}
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openSearch();
                        }}
                        title="Add symbol"
                        style={{
                          background: 'transparent',
                          border: '1px solid #4ade80',
                          color: '#4ade80',
                          borderRadius: '4px',
                          width: '22px',
                          height: '22px',
                          fontSize: '16px',
                          lineHeight: '1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        +
                      </button>
                    </span>
                  ) : (
                    <>
                      {col.label}{' '}
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
                  Click + to add a ticker
                </td>
              </tr>
            ) : (
              sorted.map((e, i) => {
                const days = daysUntil(e.expectedDate);
                const isSoon = days !== null && days >= 0 && days <= 7;
                const isHovered = hoveredTicker === e.ticker;
                return (
                  <tr
                    key={e.ticker}
                    onMouseEnter={() => setHoveredTicker(e.ticker)}
                    onMouseLeave={() => setHoveredTicker(null)}
                    style={{
                      background: i % 2 === 0 ? '#242424' : '#1f1f1f',
                      borderTop: '1px solid #333',
                    }}
                  >
                    <td style={{ padding: '6px 10px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <span>{e.ticker}</span>
                        {isHovered && (
                          <button
                            onClick={() => onRemoveTicker(e.ticker)}
                            title={`Remove ${e.ticker}`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '2px 4px',
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderRight: '1px solid #333' }}>
                      {e.companyName}
                    </td>
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        borderRight: '1px solid #333',
                        color: isSoon ? '#f87171' : '#e0e0e0',
                        fontWeight: isSoon ? 'bold' : 'normal',
                      }}
                    >
                      {e.expectedDate || 'N/A'}
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                      ${e.price}
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                      {e.float?.toLocaleString() || 'N/A'}
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {e.sector}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showSearch && (
        <div
          onClick={closeSearch}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '360px',
              maxWidth: '90vw',
              background: '#1f1f1f',
              border: '1px solid #444',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid #333',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#e0e0e0' }}>Add symbol</span>
              <button
                onClick={closeSearch}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#999',
                  fontSize: '18px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search ticker or company..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                background: '#121212',
                border: 'none',
                borderBottom: '1px solid #333',
                color: '#e0e0e0',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {addError && (
              <p style={{ color: '#f87171', fontSize: '12px', margin: '10px 16px 0 16px' }}>{addError}</p>
            )}

            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {adding ? (
                <p style={{ padding: '14px 16px', color: '#888', fontSize: '13px', margin: 0 }}>Adding...</p>
              ) : searching ? (
                <p style={{ padding: '14px 16px', color: '#888', fontSize: '13px', margin: 0 }}>Searching...</p>
              ) : query && searchResults.length === 0 ? (
                <p style={{ padding: '14px 16px', color: '#888', fontSize: '13px', margin: 0 }}>No matches</p>
              ) : (
                searchResults.map(r => (
                  <div
                    key={r.symbol}
                    onClick={() => handleSelectResult(r.symbol)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #2a2a2a',
                    }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#2a2a2a')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>
                      {r.symbol}
                      {r.exchange && <span style={{ color: '#666', fontWeight: 400 }}> · {r.exchange}</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Collapsible vertical float-cap slider. At rest it's just a small ball sitting
 * in a fixed spot (does not move to reflect the current value). Pressing down
 * on the ball expands a floating vertical track (position: fixed, so it
 * overlaps everything else including table headers/rows) anchored at the
 * ball's screen position. Dragging up/down moves a thumb along that track;
 * releasing commits the value and the track collapses back to just the ball.
 * Top of the track = FLOAT_MAX, bottom = FLOAT_MIN.
 */
function FloatBallSlider({ value, onCommit }) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const ballRef = useRef(null);
  const geometryRef = useRef({ top: 0, left: 0 });
  const dragValueRef = useRef(value);

  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const rect = ballRef.current.getBoundingClientRect();
    const ballCenterX = rect.left + rect.width / 2;
    const ballCenterY = rect.top + rect.height / 2;
    geometryRef.current = {
      top: ballCenterY - FLOAT_TRACK_HEIGHT / 2,
      left: ballCenterX,
    };
    dragValueRef.current = value;
    setDragValue(value);
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;

    function valueFromClientY(clientY) {
      const { top } = geometryRef.current;
      const clampedY = Math.min(Math.max(clientY, top), top + FLOAT_TRACK_HEIGHT);
      const fractionFromTop = (clampedY - top) / FLOAT_TRACK_HEIGHT; // 0 at top, 1 at bottom
      const fractionOfMax = 1 - fractionFromTop; // 1 at top (=max), 0 at bottom (=min)
      const raw = FLOAT_MIN + fractionOfMax * (FLOAT_MAX - FLOAT_MIN);
      const stepped = Math.round(raw / FLOAT_STEP) * FLOAT_STEP;
      return Math.min(Math.max(stepped, FLOAT_MIN), FLOAT_MAX);
    }

    function handleMove(e) {
      const next = valueFromClientY(e.clientY);
      dragValueRef.current = next;
      setDragValue(next);
    }

    function handleUp() {
      setDragging(false);
      onCommit(dragValueRef.current);
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', e => handleMove(e.touches[0]), { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchend', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const fillFraction = (dragValue - FLOAT_MIN) / (FLOAT_MAX - FLOAT_MIN);

  return (
    <>
      <div
        ref={ballRef}
        onMouseDown={startDrag}
        onTouchStart={e => startDrag(e.touches[0])}
        title="Drag to set max float"
        style={{
          width: `${FLOAT_BALL_SIZE}px`,
          height: `${FLOAT_BALL_SIZE}px`,
          borderRadius: '50%',
          background: '#4ade80',
          margin: '2px auto 0 auto',
          cursor: 'ns-resize',
          boxShadow: dragging ? '0 0 0 4px rgba(74,222,128,0.25)' : 'none',
        }}
      />

      {dragging && (
        <div
          style={{
            position: 'fixed',
            top: `${geometryRef.current.top}px`,
            left: `${geometryRef.current.left}px`,
            transform: 'translateX(-50%)',
            width: `${FLOAT_TRACK_WIDTH}px`,
            height: `${FLOAT_TRACK_HEIGHT}px`,
            background: '#333',
            borderRadius: `${FLOAT_TRACK_WIDTH}px`,
            zIndex: 500,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: `${fillFraction * 100}%`,
              background: '#4ade80',
              borderRadius: `${FLOAT_TRACK_WIDTH}px`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: `${fillFraction * 100}%`,
              transform: 'translate(-50%, 50%)',
              width: `${FLOAT_BALL_SIZE}px`,
              height: `${FLOAT_BALL_SIZE}px`,
              borderRadius: '50%',
              background: '#4ade80',
              border: '2px solid #1a1a1a',
            }}
          />
        </div>
      )}
    </>
  );
}

function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REGULAR');
  const [sortKey, setSortKey] = useState('changePercent');
  const [sortDir, setSortDir] = useState('desc');

  // Max-float filter: shared across all 3 scanner tabs, persisted, defaults to 20M.
  const [maxFloatFilter, setMaxFloatFilter] = useState(() => {
    try {
      const saved = localStorage.getItem(MAX_FLOAT_KEY);
      return saved ? Number(saved) : FLOAT_DEFAULT;
    } catch {
      return FLOAT_DEFAULT;
    }
  });

  function commitFloatFilter(value) {
    setMaxFloatFilter(value);
    localStorage.setItem(MAX_FLOAT_KEY, String(value));
  }

  const [earnings, setEarnings] = useState([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [customTickers, setCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TICKERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchData = () => {
      fetch(`${BACKEND_URL}/api/scan`)
        .then(res => res.json())
        .then(data => {
          setStocks(data.qualifying);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (customTickers.length === 0) {
      setLoadingCal(false);
      return;
    }
    fetch(`${BACKEND_URL}/api/earnings?extras=${customTickers.join(',')}`)
      .then(res => res.json())
      .then(data => {
        setEarnings(data.earnings || []);
        setLoadingCal(false);
      })
      .catch(() => setLoadingCal(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistCustomTickers(next) {
    setCustomTickers(next);
    localStorage.setItem(CUSTOM_TICKERS_KEY, JSON.stringify(next));
  }

  async function handleAddTicker(symbol) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/earnings?extras=${symbol}`);
      const data = await res.json();
      const match = (data.earnings || [])[0];
      if (!match) return false;

      setEarnings(prev => [...prev, match]);
      persistCustomTickers([...customTickers, symbol]);
      return true;
    } catch {
      return false;
    }
  }

  function handleRemoveTicker(symbol) {
    setEarnings(prev => prev.filter(e => e.ticker !== symbol));
    persistCustomTickers(customTickers.filter(t => t !== symbol));
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // The full table structure (colgroup + thead, including the Float ball
  // slider) ALWAYS renders, regardless of row count - only the tbody content
  // switches to an empty-state message. This keeps headers/controls usable
  // even when a filter produces zero matching rows.
  function renderTable(sessionKey) {
    const rows = stocks
      .filter(s => s.session === sessionKey && (s.float == null || s.float <= maxFloatFilter))
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      })
      .slice(0, 20);

    return (
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', minHeight: '900px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', background: '#242424', color: '#e0e0e0' }}>
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '32%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#161616' }}>
              {columns.map(col => {
                if (col.key === 'float') {
                  return (
                    <th
                      key={col.key}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        color: '#4ade80',
                        fontSize: '13px',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        userSelect: 'none',
                        borderRight: '1px solid #333',
                        verticalAlign: 'top',
                      }}
                    >
                      <div
                        onClick={() => handleSort('float')}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span>Float {sortKey === 'float' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                        <span style={{ color: '#999', fontWeight: 400, fontSize: '11px' }}>
                          ≤ {formatFloat(maxFloatFilter)}
                        </span>
                      </div>
                      <FloatBallSlider value={maxFloatFilter} onCommit={commitFloatFilter} />
                    </th>
                  );
                }
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: '10px 10px',
                      textAlign: 'left',
                      color: '#4ade80',
                      fontSize: '13px',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      borderRight: '1px solid #333',
                    }}
                  >
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                );
              })}
              <th
                style={{
                  padding: '10px 10px',
                  color: '#4ade80',
                  fontSize: '13px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                News
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
                  No qualifying stocks right now.
                </td>
              </tr>
            ) : (
              rows.map((s, i) => (
                <tr
                  key={s.ticker}
                  style={{
                    background: i % 2 === 0 ? '#242424' : '#1f1f1f',
                    borderTop: '1px solid #333',
                  }}
                >
                  <td style={{ padding: '6px 10px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                    {s.ticker}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                    ${s.price}
                  </td>
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      color: s.changePercent >= 0 ? '#4ade80' : '#f87171',
                      borderRight: '1px solid #333',
                    }}
                  >
                    {s.changePercent?.toFixed(2)}%
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                    {s.rvol}x
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                    {s.float?.toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderRight: '1px solid #333' }}>
                    {s.sector}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
                    {s.country}
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: '13px' }}>
                    {s.headline ? (
                      <span>
                        <a
                          href={s.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={s.headline}
                          style={{ color: '#60a5fa', textDecoration: 'none' }}
                        >
                          {s.headline.length > 40 ? s.headline.slice(0, 40) + '...' : s.headline}
                        </a>
                        <br />
                        <small style={{ color: '#f87171' }}>
                          {s.publishedAt ? new Date(s.publishedAt).toLocaleString() : ''}
                        </small>
                      </span>
                    ) : (
                      <span style={{ color: '#666' }}>No recent news</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const activeIndex = sessions.findIndex(s => s.key === activeTab);
  const tabWidthPercent = 100 / sessions.length;

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: '#1a1a1a',
        minHeight: '100vh',
        color: '#e0e0e0',
        padding: '0 0 32px 0',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#1a1a1a',
          padding: '12px 32px 0 32px',
          borderBottom: '1px solid #333',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>StockBuddy</h1>

        <div style={{ position: 'relative', display: 'flex' }}>
          {sessions.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontWeight: 600,
                fontSize: '14px',
                background: 'transparent',
                color: activeTab === s.key ? '#f87171' : '#999',
                border: 'none',
                borderBottom: '3px solid #333',
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: `${tabWidthPercent}%`,
              height: '3px',
              background: '#f87171',
              transform: `translateX(${activeIndex * 100}%)`,
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      <div style={{ height: 110 }} />

      {loading ? (
        <p style={{ color: '#888', padding: '0 32px' }}>Loading...</p>
      ) : activeTab === 'CALENDAR' ? (
        <div style={{ padding: '0 32px' }}>
          <EarningsCalendar
            earnings={earnings}
            loadingCal={loadingCal}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
          />
        </div>
      ) : activeTab === 'WATCHLIST' ? (
        <div style={{ padding: '60px 32px', textAlign: 'center', color: '#888' }}>Placeholder</div>
      ) : (
        <div style={{ padding: '0 32px' }}>{renderTable(activeTab)}</div>
      )}
    </div>
  );
}

export default App;
