const axios = require('axios');
const cheerio = require('cheerio');

const fetchPage = async (url, timeout = 10000) => {
  const response = await axios.get(url, {
    timeout,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarqAdl/1.0; Legal Research Bot)' },
    maxRedirects: 3,
  });
  return response.data;
};

const extractText = (html) => {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, .sidebar, .cookie-banner, .advertisement').remove();
  const text = $('main, article, .content, body').text()
    .replace(/\s+/g, ' ')
    .trim();
  return text.substring(0, 8000);
};

const searchDuckDuckGo = async (query) => {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const results = [];
    $('.result__a').each((i, el) => {
      if (i < 5) {
        results.push({
          title: $(el).text().trim(),
          url: $(el).attr('href'),
        });
      }
    });
    return results;
  } catch {
    return [];
  }
};

module.exports = { fetchPage, extractText, searchDuckDuckGo };
