const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { scrapeAll } = require("./scrape");

const db = admin.firestore();

async function callAIExtract(article) {
  const endpoint = process.env.EXTRACTION_ENDPOINT;
  const apiKey = process.env.EXTRACTION_API_KEY;
  if (!endpoint || !apiKey) {
    // fallback: basic mapping
    return {
      date: new Date().toISOString().slice(0, 10),
      title: article.title,
      description: article.text.slice(0, 2000),
      sources: [article.link],
    };
  }
  const prompt = {
    instruction: "Extract JSON with fields: date(YYYY-MM-DD), title, description (2-5 sentences), sources[], and disputedClaims[] where each disputed claim has { claimText, source, timestamp }. disputedClaims should list notable counter-claims that deny or contradict the reported event.",
    article: { title: article.title, url: article.link, text: article.text },
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(prompt),
  });
  const json = await res.json();
  return json;
}

function crossCheck(results) {
  const keyByTitle = new Map();
  for (const r of results) {
    const key = r.title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 140);
    if (!keyByTitle.has(key)) keyByTitle.set(key, []);
    keyByTitle.get(key).push(r);
  }
  for (const [key, list] of keyByTitle.entries()) {
    const uniqueSources = new Set(list.flatMap((x) => x.sources || []));
    let status = uniqueSources.size >= 2 ? "verified" : list.length >= 2 ? "verified" : "pending";
    // If any extracted item contains disputedClaims, mark as disputed
    if (list.some((x) => Array.isArray(x.disputedClaims) && x.disputedClaims.length > 0)) {
      status = "disputed";
    }
    list.forEach((x) => (x.status = status));
  }
  return results;
}

async function runScrapeAndModerate() {
  const articles = await scrapeAll();
  const extracted = [];
  for (const a of articles) {
    try {
      const e = await callAIExtract(a);
      if (e && e.title && e.description && e.date) {
        e.sources = Array.isArray(e.sources) ? e.sources : [a.link];
        extracted.push(e);
      }
    } catch (err) {
      console.error("extract failed", err);
    }
  }
  const labeled = crossCheck(extracted);

  for (const item of labeled) {
    const pendingRef = db.collection("pendingEvents");
    await pendingRef.add({
      date: item.date,
      title: item.title,
      description: item.description,
      sources: item.sources,
      disputedClaims: Array.isArray(item.disputedClaims) ? item.disputedClaims : [],
      author: "scraper@system",
      status: item.status, // verified or pending
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (item.status === "verified") {
      await db.collection("events").add({
        date: item.date,
        title: item.title,
        description: item.description,
        sources: item.sources,
        disputedClaims: Array.isArray(item.disputedClaims) ? item.disputedClaims : [],
        author: "scraper@system",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

module.exports = { runScrapeAndModerate };


