// ------------------------
// SYSTEM PROMPT (STRICT JSON)
// ------------------------
const SYSTEM_PROMPT = `
You are a bias detection assistant for online articles.

Tasks:
1. Analyze the given text for bias.
2. Classify bias as exactly one of:
   - "left-leaning"
   - "right-leaning"
   - "center"
   - "cultural"
   - "religious"
   - "sensational"
   - "selective reporting"
   - "framing bias"
   - "none"
3. Provide a confidence score (0 to 100).
4. Provide the source if visible in the text (or "unknown").

Output MUST be valid JSON in this exact format:
{
  "summary": "<2 sentence neutral summary>",
  "bias": "<one of the categories>",
  "confidence": <number 0-100>,
  "evidence": ["<quote1>", "<quote2>"],
  "neutral_rewrite": "<rewrite biased parts or 'not applicable'>",
  "source": "<website or publication if found, else 'unknown'>"
}

Rules:
- No explanations outside JSON.
- If no bias detected, use "bias": "none" and confidence ~70.
- If no evidence, evidence = [].
- Response must strictly be JSON only, under 300 words.
`;

// ------------------------
// Content extraction
// ------------------------
async function getPageContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText
  });
  return result[0].result;
}

// ------------------------
// API request to OpenAI (instead of Groq)
// ------------------------
async function analyzeWithOpenAI(text) {
  const apiKey = "YOUR_OPENAI_API_KEY"; // <-- Replace with your OpenAI key or backend proxy
  const endpoint = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // fast lightweight model
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 4000) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ------------------------
// Badge color logic
// ------------------------
function getBiasBadgeClass(bias) {
  if (bias.includes("left")) return "badge-left";
  if (bias.includes("right")) return "badge-right";
  if (bias.includes("center")) return "badge-center";
  return "badge-other";
}

// ------------------------
// Render results
// ------------------------
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const resultEl = document.getElementById("result");
  resultEl.textContent = "Analyzing...";
  try {
    const text = await getPageContent();
    const analysis = await analyzeWithOpenAI(text);

    let parsed;
    try {
      parsed = JSON.parse(analysis); // Strict JSON
    } catch {
      resultEl.textContent = "Error: Model response was not valid JSON.";
      return;
    }

    const badgeClass = getBiasBadgeClass(parsed.bias.toLowerCase());
    const evidenceHtml = parsed.evidence.length
      ? `<ul>${parsed.evidence.map(e => `<li>${e}</li>`).join('')}</ul>`
      : "<i>No direct quotes found.</i>";

    resultEl.innerHTML = `
      <div class="badge ${badgeClass}">${parsed.bias.toUpperCase()}</div><br>
      <b>Confidence:</b> ${parsed.confidence}%<br><br>
      <b>Summary:</b> ${parsed.summary}<br><br>
      <b>Evidence:</b> ${evidenceHtml}
      <b>Neutral Rewrite:</b> ${parsed.neutral_rewrite}<br><br>
      <b>Source:</b> ${parsed.source}
    `;
  } catch (err) {
    console.error(err);
    resultEl.textContent = "Error: Unable to analyze page.";
  }
});
