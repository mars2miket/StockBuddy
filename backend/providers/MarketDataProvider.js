// Every provider must implement these methods, returning data in this shape.
// This file is documentation only — not imported anywhere.

class MarketDataProvider {
  async getQuote(ticker) {
    // returns { ticker, price, changePercent, volume, avgVolume }
    throw new Error('Not implemented');
  }

  async getProfile(ticker) {
    // returns { sector, country }
    throw new Error('Not implemented');
  }
}

module.exports = MarketDataProvider;