const axios = require("axios");
const cheerio = require("cheerio");

async function fetchHTML(url) {
  const res = await axios.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
  return res.data;
}

async function scrapeBBC() {
  const url = "https://www.bbc.com/news";
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const items = [];
  $("a[href^='/news']").slice(0, 20).each((_, el) => {
    const link = new URL($(el).attr("href"), url).toString();
    const title = $(el).text().trim();
    if (title && link) items.push({ title, link, source: "BBC" });
  });
  return items;
}

async function scrapeReuters() {
  const url = "https://www.reuters.com/world/";
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const items = [];
  $("a[href^='/world']").slice(0, 20).each((_, el) => {
    const link = new URL($(el).attr("href"), url).toString();
    const title = $(el).text().trim();
    if (title && link) items.push({ title, link, source: "Reuters" });
  });
  return items;
}

async function scrapeAlJazeera() {
  const url = "https://www.aljazeera.com/";
  const html = await fetchHTML(url);
  const $ = cheerio.load(html);
  const items = [];
  $("a.u-clickable-card__link").slice(0, 20).each((_, el) => {
    const link = new URL($(el).attr("href"), url).toString();
    const title = $(el).find("h3").text().trim() || $(el).text().trim();
    if (title && link) items.push({ title, link, source: "Al Jazeera" });
  });
  return items;
}

async function fetchArticleText(url) {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    const text = $("p").map((_, p) => $(p).text()).get().join("\n").replace(/\s+/g, " ").trim();
    return text.slice(0, 40000);
  } catch (e) {
    return "";
  }
}

async function scrapeAll() {
  const [bbc, reuters, aj] = await Promise.all([
    scrapeBBC(),
    scrapeReuters(),
    scrapeAlJazeera(),
  ]);
  const dedup = new Map();
  [...bbc, ...reuters, ...aj].forEach((i) => {
    if (!dedup.has(i.link)) dedup.set(i.link, i);
  });
  const items = Array.from(dedup.values());
  for (const item of items) {
    item.text = await fetchArticleText(item.link);
  }
  return items.filter((i) => i.text && i.text.length > 200);
}

module.exports = { scrapeAll };


