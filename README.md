# TruSight - Bias Detection Extension

A powerful browser extension that uses AI to detect bias in news articles and provides integrated website summaries to help users navigate the digital information landscape more effectively.

## Features

### 🎯 Bias Detection
- **Political Bias Analysis**: Identifies left-leaning, right-leaning, or center political bias
- **Bias Subtypes**: Detects framing bias, loaded language, selective reporting, cherry-picking, and emotional manipulation
- **Tone Analysis**: Analyzes emotional tone (fear, anger, sympathy, optimism, neutral)
- **Bias Intensity**: Quantifies bias on a 0-100 scale with confidence metrics
- **Evidence Extraction**: Provides specific quotes as evidence for bias detection
- **Neutral Rewrites**: Suggests neutral alternatives to biased language

### 📝 Integrated Website Summary
- **Website Overview**: Brief description of what the webpage is about
- **Content Summary**: Neutral summary of the actual content and arguments presented
- **Smart Content Extraction**: Prioritizes main article content over navigation/ads

## Installation

### Chrome/Edge/Brave
1. Download or clone this repository
2. Open your browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The TruSight extension icon should appear in your toolbar

### Firefox
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" tab
4. Click "Load Temporary Add-on" and select the `manifest.json` file

## Usage

1. **Navigate to any website** you want to analyze
2. **Click the TruSight extension icon** in your browser toolbar
3. **Click "Analyze Page for Bias"** to start the analysis
4. **View comprehensive results** including:
   - Website overview and content summary
   - Bias classification and intensity
   - Tone analysis and evidence
   - Neutral rewrite suggestions

## Technical Details

- **AI Model**: Uses Groq's Llama3-70B model for analysis
- **Content Extraction**: Intelligently prioritizes main content over navigation/ads
- **API Integration**: RESTful API calls to Groq for real-time analysis
- **Response Format**: Structured JSON responses for consistent data handling
- **Error Handling**: Graceful fallbacks and user-friendly error messages

## API Configuration

The extension uses the Groq API for AI analysis. To use your own API key:

1. Sign up at [Groq](https://groq.com/)
2. Get your API key from the dashboard
3. Replace the `apiKey` variable in `popup.js` with your key

## Privacy & Security

- **Local Processing**: All content analysis happens on Groq's servers
- **No Data Storage**: No user data is stored locally or transmitted
- **Secure API**: Uses HTTPS for all external communications
- **Minimal Permissions**: Only requests access to active tabs when needed

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave 1.20+
- ✅ Firefox 85+ (with limitations)

## Development

### File Structure
```
├── manifest.json      # Extension configuration
├── popup.html        # Main UI interface
├── popup.js          # Core functionality
├── icon128.png       # Extension icon
└── README.md         # This file
```

### Key Components
- **Content Extraction**: Smart content prioritization for better analysis
- **Result Rendering**: Organized, visually appealing result display
- **Error Handling**: Comprehensive error management and user feedback
- **Integrated Summary**: Website overview and content summary in one analysis

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension.

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the GitHub repository or create an issue.

---

**TruSight** - Making digital information more transparent and accessible.
