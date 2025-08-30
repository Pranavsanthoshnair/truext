// ------------------------
// SYSTEM PROMPT
// ------------------------
const SYSTEM_PROMPT = `
You are a bias detection assistant for online articles.

Your job:
- Analyze the provided text.
- Identify bias types: political-left, political-right, cultural, religious, sensational, selective reporting, framing bias.
- If none found, explicitly say "No significant bias detected."

Output must be JSON:
{
  "summary": "<2-3 sentence neutral summary>",
  "bias": "<none or type>",
  "evidence": ["<quote1>", "<quote2>", "<quote3>"],
  "neutral_rewrite": "<rewrite biased parts or 'not applicable'>"
}

Rules:
- Be objective. No personal opinions.
- If unsure, set "bias": "uncertain".
- Keep entire response under 300 words.
`;

async function getPageContent() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const result = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => document.body.innerText // get visible text
  });
  return result[0].result;
}

async function analyzeWithGroq(text) {
  const apiKey = "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"; // replace with real key or use backend proxy
  const endpoint = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama3-70b-8192", // You can change to any available Groq model
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.slice(0, 4000) } // limit long articles
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const resultEl = document.getElementById("result");
  resultEl.textContent = "Analyzing...";
  try {
    const text = await getPageContent();
    const analysis = await analyzeWithGroq(text);
    resultEl.textContent = analysis;
  } catch (err) {
    console.error(err);
    resultEl.textContent = "Error: Unable to analyze page.";
  }
});
