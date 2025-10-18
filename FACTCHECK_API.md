# 🔍 FactCheck API Documentation

## Overview

The `/api/factCheck` endpoint provides comprehensive fact-checking for event descriptions by:
1. Searching multiple news APIs (NewsAPI, GDELT, Mediastack)
2. Using OpenAI to analyze and verify claims
3. Calculating a credibility score based on multiple factors
4. Enforcing minimum quality thresholds

---

## Endpoint

```
POST /api/factCheck
```

### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "eventDescription": "The James Webb Space Telescope discovered the oldest known galaxy",
  "searchQuery": "James Webb oldest galaxy discovery" // optional
}
```

**Parameters:**
- `eventDescription` (required, string): The claim or event to fact-check
- `searchQuery` (optional, string): Custom search query; defaults to first 10 words of description

---

## Response Format

### Success Response (HTTP 200)

```json
{
  "success": true,
  "accepted": true,
  "result": {
    "title": "James Webb Telescope Discovers Oldest Known Galaxy",
    "summary": "NASA's James Webb Space Telescope identified galaxy JADES-GS-z14-0, dated to 290 million years after the Big Bang, making it the oldest confirmed galaxy discovered.",
    "sources": [
      {
        "name": "NASA",
        "url": "https://nasa.gov/article/...",
        "publishedAt": "2024-03-15T10:30:00Z",
        "source": "NewsAPI"
      }
    ],
    "credibilityScore": 0.85,
    "verificationSummary": "The claim is strongly supported by 8 independent sources including NASA, Nature, and major science publications. All sources agree on the discovery timeline and significance.",
    "isVerified": true,
    "metadata": {
      "sourceCount": 12,
      "independentSourceCount": 8,
      "agreementRatio": 0.92,
      "recencyDays": 2,
      "contradictions": [],
      "keyFindings": [
        "Confirmed by NASA official press release",
        "Peer-reviewed paper published in Nature",
        "Multiple independent observations"
      ],
      "validationPassed": {
        "credibilityThreshold": true,
        "sourceThreshold": true
      },
      "minimumRequirements": {
        "credibilityScore": 0.6,
        "independentSources": 2
      },
      "timestamp": "2024-03-17T14:30:00Z",
      "processingTimeMs": 4523
    }
  }
}
```

### Rejection Response (HTTP 422)

```json
{
  "success": false,
  "accepted": false,
  "error": "Event does not meet verification requirements",
  "reasons": [
    "Credibility score 0.45 is below minimum 0.6",
    "Only 1 independent source(s) found, need at least 2"
  ],
  "result": {
    "title": "Unverified Claim",
    "summary": "Insufficient evidence to verify this claim.",
    "credibilityScore": 0.45,
    "independentSourceCount": 1,
    "minimumRequirements": {
      "credibilityScore": 0.6,
      "independentSources": 2
    },
    "verificationSummary": "Limited sources found and conflicting information present.",
    "metadata": {
      "sourceCount": 3,
      "uniqueSourceCount": 1,
      "agreementRatio": 0.33,
      "recencyDays": 45,
      "timestamp": "2024-03-17T14:30:00Z"
    }
  }
}
```

### Error Response (HTTP 400/500)

```json
{
  "success": false,
  "error": "eventDescription is required and must be a string",
  "timestamp": "2024-03-17T14:30:00Z",
  "durationSeconds": 0.12
}
```

---

## Validation Rules

### ✅ Acceptance Criteria

An event is **accepted** only if ALL of the following are met:

1. **Credibility Score ≥ 0.6** (60%)
2. **Independent Sources ≥ 2** (from different domains)

### ❌ Rejection Criteria

An event is **rejected** if ANY of the following are true:

1. Credibility score < 0.6
2. Fewer than 2 independent sources
3. High agreement ratio indicating potential misinformation

---

## Credibility Score Calculation

The credibility score is calculated using:

```javascript
function calculateCredibilityScore(sourceCount, agreementRatio, recency) {
  const sourceWeight = Math.min(sourceCount / 5, 1);
  const agreementWeight = Math.min(agreementRatio, 1);
  const recencyWeight = recency > 7 ? 0.9 : 1; // older than 7 days lowers score
  return ((sourceWeight + agreementWeight + recencyWeight) / 3).toFixed(2);
}
```

### Factors:

1. **Source Weight** (0-1): Based on number of sources (5+ sources = 1.0)
2. **Agreement Weight** (0-1): How much sources agree with each other
3. **Recency Weight** (0.9-1.0): Recent events (≤7 days) score higher

---

## Data Sources

### 1. NewsAPI
- **Coverage:** 80,000+ news sources worldwide
- **Features:** Real-time breaking news
- **API Key:** Required (`NEWS_API_KEY`)

### 2. GDELT
- **Coverage:** Global news database
- **Features:** Historical and real-time news
- **API Key:** Not required (public API)

### 3. Mediastack (Optional)
- **Coverage:** 75+ countries, 50+ languages
- **Features:** News aggregation
- **API Key:** Optional (`MEDIASTACK_API_KEY`)

---

## AI Analysis

Uses **OpenAI GPT-4-mini** to:
- Summarize the event neutrally
- Analyze source agreement
- Identify contradictions
- Extract key findings
- Provide verification summary

---

## Example Usage

### cURL

```bash
curl -X POST http://localhost:3000/api/factCheck \
  -H "Content-Type: application/json" \
  -d '{
    "eventDescription": "The James Webb Space Telescope discovered the oldest known galaxy",
    "searchQuery": "James Webb oldest galaxy"
  }'
```

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:3000/api/factCheck', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    eventDescription: 'The James Webb Space Telescope discovered the oldest known galaxy',
    searchQuery: 'James Webb oldest galaxy'
  })
});

const data = await response.json();

if (data.accepted) {
  console.log('✅ Event verified!');
  console.log(`Credibility: ${data.result.credibilityScore}`);
  console.log(`Sources: ${data.result.metadata.independentSourceCount}`);
} else {
  console.log('❌ Event rejected:', data.reasons);
}
```

### Node.js Test Script

```bash
node test-factcheck.js
```

---

## Environment Variables

Required:
```env
OPENAI_API_KEY=sk-...
NEWS_API_KEY=...
```

Optional:
```env
MEDIASTACK_API_KEY=...
```

---

## Rate Limits

- **OpenAI:** Subject to your OpenAI API rate limits
- **NewsAPI:** 100 requests/day (free tier)
- **GDELT:** No rate limits (public API)
- **Mediastack:** 500 requests/month (free tier)

**Recommendation:** Implement caching for frequently fact-checked claims.

---

## Performance

- **Average Response Time:** 3-6 seconds
- **Timeout:** 60 seconds maximum
- **Processing Steps:**
  1. Search NewsAPI (~1s)
  2. Search GDELT (~1s)
  3. Search Mediastack (~1s)
  4. AI Analysis (~2-3s)
  5. Scoring & validation (~100ms)

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success - Event accepted |
| 400 | Bad Request - Invalid input |
| 422 | Unprocessable Entity - Event rejected (doesn't meet minimum requirements) |
| 500 | Server Error - Processing failed |

---

## Best Practices

### 1. **Be Specific**
```javascript
// ❌ Too vague
"Something happened in space"

// ✅ Specific
"NASA's James Webb Telescope discovered galaxy JADES-GS-z14-0 in March 2024"
```

### 2. **Include Key Details**
- What happened
- When it happened
- Who was involved
- Where it occurred

### 3. **Use Custom Search Queries**
For better results, provide a focused search query:
```javascript
{
  "eventDescription": "Long detailed description...",
  "searchQuery": "key terms only"  // Extracts essential keywords
}
```

### 4. **Cache Results**
Store fact-check results to avoid re-processing:
```javascript
const cacheKey = hashEventDescription(description);
let result = cache.get(cacheKey);

if (!result) {
  result = await factCheck(description);
  cache.set(cacheKey, result, '24h');
}
```

---

## Limitations

1. **Language:** Currently optimized for English-language sources
2. **Recency:** Very recent events (<1 hour) may have limited sources
3. **Obscure Topics:** Lesser-known events may not meet source threshold
4. **API Dependencies:** Requires active API keys for best results
5. **Cost:** OpenAI API calls incur costs (~$0.002 per request)

---

## Error Handling

```javascript
try {
  const response = await fetch('/api/factCheck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventDescription })
  });

  const data = await response.json();

  if (response.ok && data.accepted) {
    // Event verified and accepted
    saveToDatabase(data.result);
  } else if (response.status === 422) {
    // Event rejected - doesn't meet minimum requirements
    console.warn('Event rejected:', data.reasons);
  } else {
    // Other error
    console.error('Fact-check failed:', data.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

---

## Security Considerations

1. **Rate Limiting:** Implement rate limiting to prevent abuse
2. **Input Validation:** The API validates input format and length
3. **API Key Protection:** Store API keys in environment variables
4. **CORS:** Configure CORS headers for production use
5. **Authentication:** Consider adding authentication for production

---

## Roadmap

- [ ] Support for multiple languages
- [ ] Image/video verification
- [ ] Bias detection in sources
- [ ] Historical claim tracking
- [ ] Webhook notifications
- [ ] Bulk fact-checking
- [ ] Custom credibility thresholds
- [ ] Source reliability scoring

---

## Support

- **Documentation:** `/api/factCheck` (GET request)
- **Test Script:** `node test-factcheck.js`
- **Health Check:** `/api/health`

---

## Changelog

### v1.0.0 (2024-03-17)
- ✅ Initial release
- ✅ Multi-source verification (NewsAPI, GDELT, Mediastack)
- ✅ OpenAI GPT-4 analysis
- ✅ Credibility scoring
- ✅ Minimum threshold validation
- ✅ Independent source counting

