async function getNews(ticker) {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;

  const res = await fetch(url);
  const articles = await res.json();

  if (!Array.isArray(articles) || articles.length === 0) {
    return { headline: null, publishedAt: null, articleUrl: null };
  }

  const latest = articles[0];
  return {
    headline: latest.headline,
    publishedAt: new Date(latest.datetime * 1000).toISOString(),
    articleUrl: latest.url,
  };
}

module.exports = { getNews };