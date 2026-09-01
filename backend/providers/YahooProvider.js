const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const MARKET_LEADERS = ['SOFI', 'INFQ', 'SMR'];

async function getScreenerTickers() {
  const result = await yahooFinance.screener({ scrIds: 'day_gainers', count: 50 });
  const sorted = result.quotes.sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent);
  return sorted.slice(0, 20).map(q => q.symbol);
}

async function getQuote(ticker) {
  const quote = await yahooFinance.quote(ticker);

  let session = 'REGULAR';
  let price = quote.regularMarketPrice;
  let changePercent = quote.regularMarketChangePercent;

  if (quote.marketState === 'PRE') {
    session = 'PRE';
    price = quote.preMarketPrice ?? price;
    changePercent = quote.preMarketChangePercent ?? changePercent;
  } else if (quote.marketState === 'POST') {
    session = 'POST';
    price = quote.postMarketPrice ?? price;
    changePercent = quote.postMarketChangePercent ?? changePercent;
  }

  const volume = quote.regularMarketVolume;
  const avgVolume = quote.averageDailyVolume3Month;
  const rvol = avgVolume ? +(volume / avgVolume).toFixed(2) : null;

  let float = null;
  try {
    const stats = await yahooFinance.quoteSummary(ticker, { modules: ['defaultKeyStatistics'] });
    float = stats.defaultKeyStatistics?.floatShares || null;
  } catch (e) {}

  return {
    ticker: quote.symbol,
    session,
    price,
    changePercent,
    volume,
    avgVolume,
    rvol,
    float,
  };
}

async function getProfile(ticker) {
  const result = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] });
  return {
    sector: result.assetProfile?.sector || 'Unknown',
    country: result.assetProfile?.country || 'Unknown',
  };
}

async function enrichWithProfile(stock) {
  const profile = await getProfile(stock.ticker);
  return { ...stock, sector: profile.sector, country: profile.country };
}

async function scanAll() {
  const tickers = await getScreenerTickers();
  const results = [];
  for (const ticker of tickers) {
    try {
      const quote = await getQuote(ticker);
      results.push(quote);
    } catch (e) {
      console.error(`Failed to fetch ${ticker}:`, e.message);
    }
  }
  return results;
}

async function getEarningsCalendar(extraTickers = []) {
  // Merge market leaders + any extras the user added, remove duplicates, cap at 40
  const cleanedExtras = (extraTickers || [])
    .map(t => String(t).trim().toUpperCase())
    .filter(Boolean);

  const combined = [...new Set([...cleanedExtras, ...MARKET_LEADERS])].slice(0, 40);
  const results = [];

  for (const ticker of combined) {
    try {
      const quote = await yahooFinance.quote(ticker);
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ['calendarEvents', 'assetProfile', 'defaultKeyStatistics'],
      });

      const earningsDate = summary.calendarEvents?.earnings?.earningsDate?.[0] || null;
      const float = summary.defaultKeyStatistics?.floatShares || null;

      results.push({
        ticker,
        companyName: quote.longName || quote.shortName || 'N/A',
        expectedDate: earningsDate ? new Date(earningsDate).toISOString().split('T')[0] : null,
        price: quote.regularMarketPrice,
        float,
        sector: summary.assetProfile?.sector || 'N/A',
      });
    } catch (e) {
      console.error(`Skipping ${ticker} for earnings calendar:`, e.message);
    }
  }

  return results;
}

module.exports = { getQuote, getProfile, scanAll, enrichWithProfile, getEarningsCalendar };

async function searchTickers(query) {
  if (!query || query.length < 1) return [];
  const result = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
  return (result.quotes || [])
    .filter(q => q.symbol && q.quoteType === 'EQUITY')
    .map(q => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || '',
    }));
}

