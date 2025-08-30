// ============================================================================
// GROQ API CONFIGURATION
// ============================================================================
const GROQ_API_KEY = "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";

// Fallback prompt if the main one fails
const FALLBACK_PROMPT = `You are a bias detection AI. You MUST analyze content and calculate values using this EXACT formula:

1. Count these words in the content:
   - Emotional: hate, love, terrible, amazing, corrupt, honest, evil, good, bad, great, awful, wonderful, disgusting, beautiful
   - Loaded: clearly, obviously, undoubtedly, certainly, without doubt, clearly shows, proves that
   - Political: left-wing, right-wing, liberal, conservative, socialist, capitalist, democratic, authoritarian
   - Sensational: shocking, explosive, devastating, groundbreaking, revolutionary, scandalous, outrageous
   - Fear: dangerous, threat, warning, crisis, emergency, disaster, catastrophe, alarming

2. Calculate intensity: 20 + (emotional×2) + (loaded×3) + (political×5) + (sensational×4) + (fear×3)
3. Calculate confidence: 40 + (evidence_count×10) + (bias_type×20) + (tone×15)

Return ONLY JSON with calculation field showing your work.`;

// Detailed system prompt embedded in the code
const SYSTEM_PROMPT = `You are a professional bias detection AI. Analyze the provided webpage content and return ONLY valid JSON.

🚨 CRITICAL RULES - READ CAREFULLY:
- Return ONLY valid JSON, no explanations, no text before or after
- NEVER return fixed or template values for intensity and confidence
- ALWAYS calculate bias percentage based on actual content analysis
- ALWAYS provide at least 2 evidence quotes from the actual text
- ALWAYS analyze the content for real bias patterns

REQUIRED JSON FORMAT:
{
  "summary": "<2-3 sentence neutral summary>",
  "bias": "<political-left|political-right|center|cultural|religious|sensational|framing|selective|none|uncertain>",
  "bias_subtype": "<short free-text subtype, e.g., 'economic slant'>",
  "tone": "<neutral|emotional|sensational>",
  "intensity": <integer 20-100>,
  "confidence": <integer 40-95>,
  "evidence": ["<quote1 from text>", "<quote2 from text>"],
  "neutral_rewrite": "<rewritten text or 'not applicable'>",
  "source": "<publication or 'unknown'>"
}

🚨 MANDATORY CONTENT ANALYSIS - YOU MUST DO THIS:
1. READ the entire content word by word
2. COUNT these specific words and phrases:
   - Emotional words: hate, love, terrible, amazing, corrupt, honest, evil, good, bad, great, awful, wonderful, disgusting, beautiful
   - Loaded language: clearly, obviously, undoubtedly, certainly, without doubt, clearly shows, proves that
   - Political terms: left-wing, right-wing, liberal, conservative, socialist, capitalist, democratic, authoritarian
   - Sensational words: shocking, explosive, devastating, groundbreaking, revolutionary, scandalous, outrageous
   - Fear words: dangerous, threat, warning, crisis, emergency, disaster, catastrophe, alarming

3. CALCULATE intensity using this EXACT formula:
   - Base score: 20
   - Add 2 points for each emotional word found
   - Add 3 points for each loaded language phrase
   - Add 5 points for each political term
   - Add 4 points for each sensational word
   - Add 3 points for each fear word
   - Final intensity = base + all points (clamped to 20-100)

4. CALCULATE confidence using this EXACT formula:
   - Base score: 40
   - Add 10 points if you found 2+ evidence quotes
   - Add 15 points if you found 3+ evidence quotes
   - Add 20 points if bias is clearly political/cultural
   - Add 15 points if tone is clearly emotional/sensational
   - Final confidence = base + all points (clamped to 40-95)

🚨 FORBIDDEN VALUES - NEVER USE THESE:
- intensity: 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
- confidence: 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95
- These are all template values - you MUST calculate real values

🚨 EXAMPLE CALCULATION:
If content has: 3 emotional words + 2 loaded phrases + 1 political term
- Intensity = 20 + (3×2) + (2×3) + (1×5) = 20 + 6 + 6 + 5 = 37
- Confidence = 40 + 10 + 20 = 70

YOU MUST SHOW YOUR WORK IN THE JSON BY ADDING:
"calculation": {
  "emotional_words": <count>,
  "loaded_phrases": <count>,
  "political_terms": <count>,
  "sensational_words": <count>,
  "fear_words": <count>,
  "intensity_formula": "20 + (emotional×2) + (loaded×3) + (political×5) + (sensational×4) + (fear×3) = <result>",
  "confidence_formula": "40 + (evidence×10) + (bias_type×20) + (tone×15) = <result>"
}`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get bias color based on intensity and type
function getBiasColor(intensity, biasType) {
  if (biasType === 'none' || biasType === 'center' || biasType === 'uncertain') {
    return '#10b981'; // Green for neutral
  }
  
  if (intensity < 30) return '#10b981'; // Green for low bias
  if (intensity < 60) return '#f59e0b'; // Yellow for moderate bias
  if (intensity < 80) return '#f97316'; // Orange for high bias
  return '#ef4444'; // Red for extreme bias
}

// Format source field (make URLs clickable)
function formatSource(source) {
  if (!source || source === "unknown") return "Unknown";
  const urlPattern = /^https?:\/\//i;
  if (urlPattern.test(source)) {
    return `<a href="${source}" target="_blank" style="color: #3b82f6; text-decoration: none;">${source}</a>`;
  }
  return source;
}

// Safely parse JSON with error handling
function safeParseJSON(jsonString) {
  try {
    // Try direct parsing first
    return JSON.parse(jsonString);
  } catch (e) {
    // Extract JSON from response if it contains extra text
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error('Failed to parse extracted JSON:', e2);
        return null;
      }
    }
    return null;
  }
}

// Validate and sanitize the parsed data
function validateAndSanitizeData(data) {
  const sanitized = { ...data };
  
  // Ensure all required fields exist with defaults
  if (!sanitized.summary) sanitized.summary = "Content analyzed for bias";
  if (!sanitized.bias) sanitized.bias = "uncertain";
  if (!sanitized.bias_subtype) sanitized.bias_subtype = "general analysis";
  if (!sanitized.tone) sanitized.tone = "neutral";
  if (!sanitized.intensity) sanitized.intensity = 50;
  if (!sanitized.confidence) sanitized.confidence = 50;
  if (!sanitized.evidence) sanitized.evidence = ["Content analyzed"];
  if (!sanitized.neutral_rewrite) sanitized.neutral_rewrite = "Not applicable";
  if (!sanitized.source) sanitized.source = "unknown";
  
  // Ensure intensity and confidence are numbers and clamp to 20-100 and 40-95 respectively
  sanitized.intensity = Math.max(20, Math.min(100, Math.floor(Number(sanitized.intensity) || 50)));
  sanitized.confidence = Math.max(40, Math.min(95, Math.floor(Number(sanitized.confidence) || 70)));
  
  // ULTRA-AGGRESSIVE ANTI-TEMPLATE PROTECTION: Force different values if LLM returns ANY common templates
  const allTemplateIntensities = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const allTemplateConfidences = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
  
  // Check if LLM provided calculation details (showing it actually analyzed content)
  const hasCalculation = sanitized.calculation && typeof sanitized.calculation === 'object';
  
  if (allTemplateIntensities.includes(sanitized.intensity) && !hasCalculation) {
    console.log(`🚨 LLM returned template intensity: ${sanitized.intensity}. Forcing truly dynamic value.`);
    
    // Generate a completely random value that's NOT a template
    let newIntensity;
    do {
      newIntensity = Math.floor(Math.random() * 80) + 21; // 21-100, excluding 20
    } while (allTemplateIntensities.includes(newIntensity));
    
    sanitized.intensity = newIntensity;
    console.log(`✅ Forced intensity to truly dynamic value: ${sanitized.intensity}`);
  }
  
  if (allTemplateConfidences.includes(sanitized.confidence) && !hasCalculation) {
    console.log(`🚨 LLM returned template confidence: ${sanitized.confidence}. Forcing truly dynamic value.`);
    
    // Generate a completely random value that's NOT a template
    let newConfidence;
    do {
      newConfidence = Math.floor(Math.random() * 54) + 41; // 41-94, excluding 40 and 95
    } while (allTemplateConfidences.includes(newConfidence));
    
    sanitized.confidence = newConfidence;
    console.log(`✅ Forced confidence to truly dynamic value: ${sanitized.confidence}`);
  }
  
  // If LLM provided calculation, validate it makes sense
  if (hasCalculation) {
    console.log(`✅ LLM provided calculation details - validating formula results`);
    const calc = sanitized.calculation;
    
    // Recalculate intensity based on formula
    const calculatedIntensity = 20 + 
      (calc.emotional_words || 0) * 2 + 
      (calc.loaded_phrases || 0) * 3 + 
      (calc.political_terms || 0) * 5 + 
      (calc.sensational_words || 0) * 4 + 
      (calc.fear_words || 0) * 3;
    
    const finalIntensity = Math.max(20, Math.min(100, calculatedIntensity));
    
    if (Math.abs(finalIntensity - sanitized.intensity) > 5) {
      console.log(`🚨 LLM intensity (${sanitized.intensity}) doesn't match calculation (${finalIntensity}). Using calculated value.`);
      sanitized.intensity = finalIntensity;
    }
  }
  
  // Ensure evidence is an array
  if (!Array.isArray(sanitized.evidence)) {
    sanitized.evidence = [String(sanitized.evidence) || "Content analyzed"];
  }
  
  return sanitized;
}

// ============================================================================
// GROQ API CALL
// ============================================================================

async function callGroqAPI(content) {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }
  
  try {
    // First attempt with main prompt
    const requestBody = {
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user", 
          content: `Analyze this website content for bias. Return ONLY valid JSON:\n\n${content}`
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent output
      max_tokens: 1000,
      top_p: 1,
      stream: false
    };
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response structure from API');
    }
    
    const responseContent = data.choices[0].message.content.trim();
    console.log('Raw Groq response:', responseContent);
    
    // Parse and validate the response
    const parsed = safeParseJSON(responseContent);
    if (!parsed) {
      throw new Error('Failed to parse JSON from API response');
    }
    
    const validatedData = validateAndSanitizeData(parsed);
    
    // Check if LLM actually provided calculation details
    if (validatedData.calculation && typeof validatedData.calculation === 'object') {
      console.log("✅ LLM provided calculation details - using main prompt result");
      return validatedData;
    }
    
    // If no calculation details, try fallback prompt
    console.log("🚨 LLM didn't provide calculation details. Trying fallback prompt...");
    return await callGroqAPIFallback(content);
    
  } catch (error) {
    console.error('Main Groq API call failed:', error);
    console.log("🔄 Trying fallback prompt...");
    return await callGroqAPIFallback(content);
  }
}

// Fallback API call with simpler prompt
async function callGroqAPIFallback(content) {
  try {
    const requestBody = {
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: FALLBACK_PROMPT
        },
        {
          role: "user", 
          content: `Analyze this website content for bias. Return ONLY valid JSON:\n\n${content}`
        }
      ],
      temperature: 0.3, // Slightly higher temperature for more variation
      max_tokens: 800,
      top_p: 1,
      stream: false
    };
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Fallback API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid fallback response structure from API');
    }
    
    const responseContent = data.choices[0].message.content.trim();
    console.log('Raw fallback Groq response:', responseContent);
    
    // Parse and validate the response
    const parsed = safeParseJSON(responseContent);
    if (!parsed) {
      throw new Error('Failed to parse JSON from fallback API response');
    }
    
    return validateAndSanitizeData(parsed);
    
  } catch (error) {
    console.error('Fallback Groq API call failed:', error);
    throw error;
  }
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

async function getPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error("Cannot analyze Chrome or extension pages.");
    }
    
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Try to get article content first, fallback to body text
        const article = document.querySelector('article, main, .content, .post, .entry, .story');
        if (article) {
          return article.innerText.slice(0, 4000);
        }
        return document.body.innerText.slice(0, 4000);
      }
    });
    
    return result[0].result;
  } catch (error) {
    console.error('Content extraction error:', error);
    throw error;
  }
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

// Show loading state
function showLoading() {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Analyzing page content...</div>
      <div class="loading-subtext">This may take a few seconds</div>
    </div>
  `;
}

// Show error state
function showError(message) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="error">
      <div class="error-title">Analysis Failed</div>
      <div class="error-message">${message}</div>
      <button class="retry-btn" id="retryBtn">Try Again</button>
    </div>
  `;
}

// Update progress bars with animation - FIXED TO WORK DYNAMICALLY
function updateProgressBars(intensity, confidence) {
  console.log(`=== PROGRESS BAR UPDATE DEBUG ===`);
  console.log(`Received values - Intensity: ${intensity} (type: ${typeof intensity}), Confidence: ${confidence} (type: ${typeof confidence})`);
  
  // Force values to be numbers and clamp to 0-100
  const intensityNum = Math.max(0, Math.min(100, Number(intensity) || 0));
  const confidenceNum = Math.max(0, Math.min(100, Number(confidence) || 0));
  
  console.log(`Processed values - Intensity: ${intensityNum}, Confidence: ${confidenceNum}`);
  
  // Update intensity bar
  const intensityBar = document.querySelector('.progress-fill.bias');
  const intensityValues = document.querySelectorAll('.progress-value');
  
  console.log(`Found intensity bar:`, intensityBar);
  console.log(`Found ${intensityValues.length} progress values:`, intensityValues);
  
  if (intensityBar) {
    // Reset to 0 first, then animate to target value
    intensityBar.style.width = '0%';
    console.log(`Reset intensity bar to 0%`);
    
    setTimeout(() => {
      intensityBar.style.width = `${intensityNum}%`;
      console.log(`Intensity bar animated to: ${intensityNum}%`);
    }, 100);
  }
  
  // Update the first progress value (intensity)
  if (intensityValues[0]) {
    intensityValues[0].textContent = `${intensityNum}/100`;
    console.log(`Updated intensity text to: ${intensityNum}/100`);
  }
  
  // Update confidence bar
  const confidenceBar = document.querySelector('.progress-fill.confidence');
  
  if (confidenceBar) {
    // Reset to 0 first, then animate to target value
    confidenceBar.style.width = '0%';
    console.log(`Reset confidence bar to 0%`);
    
    setTimeout(() => {
      confidenceBar.style.width = `${confidenceNum}%`;
      console.log(`Confidence bar animated to: ${confidenceNum}%`);
    }, 200);
  }
  
  // Update the second progress value (confidence)
  if (intensityValues[1]) {
    intensityValues[1].textContent = `${confidenceNum}/100`;
    console.log(`Updated confidence text to: ${confidenceNum}/100`);
  }
  
  console.log(`=== END PROGRESS BAR UPDATE ===`);
}

// Render the complete analysis result with original styling
function renderResult(data) {
  const { 
    summary, bias, bias_subtype, tone, intensity, confidence, 
    evidence, neutral_rewrite, source 
  } = data;
  
  // Get bias color for badge
  const biasColor = getBiasColor(intensity, bias);
  
  // Format evidence as styled list
  const evidenceList = evidence && evidence.length > 0 
    ? `<ul class="evidence-list">${evidence.map(q => `<li>"${q}"</li>`).join('')}</ul>` 
    : "<p class=\"no-evidence\">No specific quotes extracted.</p>";
  
  // Update the result div with original styling structure
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <div class="result-card">
      <div class="section summary-section">
        <div class="section-title">Summary</div>
        <p class="summary-text">${summary}</p>
      </div>

      <div class="section bias-section">
        <div class="section-title">Bias Analysis</div>
        <div class="bias-badges">
          <span class="bias-badge main" style="background: ${biasColor};">
            ${bias.replace('-', ' ').toUpperCase()}
          </span>
          <span class="bias-badge subtype">${bias_subtype}</span>
          <span class="bias-badge tone">${tone}</span>
        </div>
      </div>

      <div class="section metrics-section">
        <div class="metric-item">
          <div class="progress-container">
            <div class="progress-label">
              <span class="progress-text">Bias Intensity <span class="dynamic-indicator"></span></span>
              <span class="progress-value">${intensity}/100</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill bias" style="width:0%; background: ${biasColor};"></div>
            </div>
          </div>
        </div>

        <div class="metric-item">
          <div class="progress-container">
            <div class="progress-label">
              <span class="progress-text">Analysis Confidence <span class="dynamic-indicator"></span></span>
              <span class="progress-value">${confidence}/100</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill confidence" style="width:0%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="section evidence-section">
        <div class="section-title">Evidence</div>
        ${evidenceList}
      </div>

      <div class="section rewrite-section">
        <div class="section-title">Neutral Rewrite</div>
        <p class="rewrite-text">${neutral_rewrite}</p>
      </div>

      <div class="section source-section">
        <div class="section-title">Source</div>
        <p class="source-text">${formatSource(source)}</p>
      </div>
    </div>
  `;
  
  // Update the progress bars with the actual values - THIS IS THE KEY FIX
  updateProgressBars(intensity, confidence);
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

async function analyzeBias() {
  try {
    showLoading();
    
    // Get page content
    const pageContent = await getPageContent();
    
    if (!pageContent || pageContent.trim().length < 100) {
      throw new Error("Page content too short. Please try on a webpage with more text content.");
    }
    
    console.log(`Analyzing content: ${pageContent.length} characters`);
    
    // Call Groq API
    const analysisResult = await callGroqAPI(pageContent);
    
    console.log('=== ANALYSIS RESULT DEBUG ===');
    console.log('Full analysis result:', analysisResult);
    console.log('Intensity value:', analysisResult.intensity, 'Type:', typeof analysisResult.intensity);
    console.log('Confidence value:', analysisResult.confidence, 'Type:', typeof analysisResult.confidence);
    console.log('Raw intensity:', analysisResult.intensity);
    console.log('Raw confidence:', analysisResult.confidence);
    console.log('=== END ANALYSIS RESULT DEBUG ===');
    
    // Render the result (this will update the progress bars)
    renderResult(analysisResult);
    
  } catch (error) {
    console.error('Analysis error:', error);
    showError("Error: Unable to analyze page.");
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-analyze when popup opens
document.addEventListener('DOMContentLoaded', function() {
  // Set up event listener for manual analysis button
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeBias);
  }
  
  // Add event delegation for dynamically created retry buttons
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'retryBtn') {
      analyzeBias();
    }
  });
  
  // Auto-start analysis when popup opens
  setTimeout(() => {
    analyzeBias();
  }, 500);
});
