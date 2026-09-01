require('dotenv').config();
console.log('Finnhub key loaded:', process.env.FINNHUB_API_KEY ? 'yes' : 'NO - missing');

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());

const yahooProvider = require('./providers/YahooProvider');
const finnhubProvider = require('./providers/FinnhubProvider');
const { meetsConditions } = require('./providers/scanFilters');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const quote = await yahooProvider.getQuote(req.params.ticker);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile/:ticker', async (req, res) => {
  try {
    const profile = await yahooProvider.getProfile(req.params.ticker);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scan', async (req, res) => {
  try {
    const allQuotes = await yahooProvider.scanAll();
    const qualifying = allQuotes.filter(meetsConditions);

    const enriched = [];
    for (const stock of qualifying) {
      try {
        const withProfile = await yahooProvider.enrichWithProfile(stock);
        const news = await finnhubProvider.getNews(stock.ticker);
        enriched.push({ ...withProfile, ...news });
      } catch (e) {
        console.log(`Error enriching ${stock.ticker}:`, e.message);
        enriched.push({ ...stock, sector: 'Unknown', country: 'Unknown', headline: null, publishedAt: null });
      }
    }

    res.json({ total: allQuotes.length, qualifying: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scan/debug', async (req, res) => {
  try {
    const allQuotes = await yahooProvider.scanAll();
    res.json(allQuotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/earnings?extras=AAPL,TSLA,MSFT
// Merges MARKET_LEADERS (defined in YahooProvider.js) with any extra tickers
// the frontend's "Add symbol" modal has added.
app.get('/api/earnings', async (req, res) => {
  try {
    const extrasParam = req.query.extras || '';
    const extraTickers = extrasParam
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    const earnings = await yahooProvider.getEarningsCalendar(extraTickers);
    res.json({ earnings });
  } catch (err) {
    console.error('Earnings error:', err);
    res.status(500).json({ earnings: [], error: 'Failed to load earnings' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

app.get('/api/search', async (req, res) => {
  try {
    const results = await yahooProvider.searchTickers(req.query.q || '');
    res.json({ results });
  } catch (err) {
    res.status(500).json({ results: [], error: err.message });
  }
});

