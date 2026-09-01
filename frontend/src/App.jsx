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

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Earnings calendar. Fetch is owned by the parent (App) and passed down as props
 * so switching tabs away and back does NOT trigger a refetch - earnings dates
 * barely move intraday, so there's no need to reload every time this tab is opened.
 */
function EarningsCalendar({ earnings, loadingCal, onAddTicker, onRemoveTicker }) {
  const [sortKey, setSortKey] = useState('expectedDate');
  const [sortDir, setSortDir] = useState('asc');
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addError, setAddError] = useState('');
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const searchBoxRef = useRef(null);
  const debounceRef = useRef(null);

  // Close the search dropdown if you click anywhere outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearch(false);
        setQuery('');
        setSearchResults([]);
        setAddError('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search-as-you-type, debounced so we don't fire a request on every keystroke
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

  async function handleSelectResult(symbol) {
    if (earnings.some(e => e.ticker === symbol)) {
      setAddError('Ticker already in the list');
      return;
    }
    const currentCustomCount = JSON.parse(localStorage.getItem(CUSTOM_TICKERS_KEY) || '[]').length;
    if (currentCustomCount >= MAX_CUSTOM_TICKERS) {
      setAddError(`Maximum of ${MAX_CUSTOM_TICKERS} custom tickers reached`);
      return;
    }
    await onAddTicker(symbol);
    setShowSearch(false);
    setQuery('');
    setSearchResults([]);
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
                  position: col.key === 'ticker' ? 'relative' : undefined,
                }}
              >
                {col.key === 'ticker' ? (
                  <span
                    ref={searchBoxRef}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', position: 'relative' }}
                  >
                    <span>
                      {col.label}{' '}
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        showSearch ? setShowSearch(false) : openSearch();
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

                    {showSearch && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '28px',
                          right: 0,
                          width: '260px',
                          background: '#1f1f1f',
                          border: '1px solid #444',
                          borderRadius: '10px',
                          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                          zIndex: 50,
                          textTransform: 'none',
                          letterSpacing: 'normal',
                          fontWeight: 'normal',
                          cursor: 'default',
                        }}
                      >
                        <input
                          type="text"
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="Search ticker or company..."
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '14px',
                            background: '#121212',
                            border: 'none',
                            borderBottom: '1px solid #333',
                            borderRadius: '10px 10px 0 0',
                            color: '#e0e0e0',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />

                        {addError && (
                          <p style={{ color: '#f87171', fontSize: '12px', margin: '8px 12px 0 12px' }}>
                            {addError}
                          </p>
                        )}

                        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                          {searching ? (
                            <p style={{ padding: '10px 12px', color: '#888', fontSize: '13px', margin: 0 }}>
                              Searching...
                            </p>
                          ) : query && searchResults.length === 0 ? (
                            <p style={{ padding: '10px 12px', color: '#888', fontSize: '13px', margin: 0 }}>
                              No matches
                            </p>
                          ) : (
                            searchResults.map(r => (
                              <div
                                key={r.symbol}
                                onClick={() => handleSelectResult(r.symbol)}
                                style={{
                                  padding: '9px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #2a2a2a',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>
                                  {r.symbol}
                                  {r.exchange && (
                                    <span style={{ color: '#666', fontWeight: 400 }}> · {r.exchange}</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.name}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
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
              <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                No earnings data available right now.
              </td>
            </tr>
          ) : (
            sorted.map((e, i) => {
              const days = daysUntil(e.expectedDate);
              const isSoon = days !== null && days >= 0 && days <= 90;
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
  );
}

function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REGULAR');
  const [sortKey, setSortKey] = useState('changePercent');
  const [sortDir, setSortDir] = useState('desc');

  // Earnings state now lives here in App, not inside EarningsCalendar, so it
  // persists across tab switches instead of refetching every time you open the tab.
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

  // Fetch earnings ONCE on app load, and again only when customTickers changes
  // (i.e. the user actually added/removed one) - not on every tab switch.
  useEffect(() => {
    localStorage.setItem(CUSTOM_TICKERS_KEY, JSON.stringify(customTickers));
    setLoadingCal(true);
    const extras = customTickers.length ? `?extras=${customTickers.join(',')}` : '';
    fetch(`${BACKEND_URL}/api/earnings${extras}`)
      .then(res => res.json())
      .then(data => {
        setEarnings(data.earnings || []);
        setLoadingCal(false);
      })
      .catch(() => setLoadingCal(false));
  }, [customTickers]);

  async function handleAddTicker(symbol) {
    if (customTickers.includes(symbol)) return;
    setCustomTickers(prev => [...prev, symbol]);
  }

  function handleRemoveTicker(symbol) {
    // Only remove from customTickers if it was a custom addition - default
    // MARKET_LEADERS tickers aren't in customTickers and can't be removed this way.
    setCustomTickers(prev => prev.filter(t => t !== symbol));
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function renderTable(sessionKey) {
    const rows = stocks
      .filter(s => s.session === sessionKey)
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      })
      .slice(0, 20);

    if (rows.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          No qualifying stocks right now.
        </div>
      );
    }

    return (
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #333', minHeight: '900px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', background: '#242424', color: '#e0e0e0' }}>
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '32%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#161616' }}>
              {columns.map(col => (
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
              ))}
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
            {rows.map((s, i) => (
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
                <td style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap', borderRight: '1px solid #333' }}>
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
            ))}
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
          transform: 'translateZ(0)',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px 0' }}>
          StockBuddy
        </h1>

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
        <div style={{ padding: '60px 32px', textAlign: 'center', color: '#888' }}>
          Placeholder
        </div>
      ) : (
        <div style={{ padding: '0 32px' }}>{renderTable(activeTab)}</div>
      )}
    </div>
  );
}

export default App;
