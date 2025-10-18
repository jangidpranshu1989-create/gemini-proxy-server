// server.cjs - CommonJS Module
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai'); // Use require

// .env फ़ाइल का उपयोग करने के लिए अगर आप लोकल पर चला रहे हैं।
// Render पर, यह ज़रूरी नहीं है क्योंकि आप environment variables का उपयोग कर रहे हैं।
// if (process.env.NODE_ENV !== 'production') {
//   require('dotenv').config();
// }

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;

// API Key चेक करना
if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables.");
    // अगर API Key नहीं है तो ऐप को बंद कर दें या डिप्लॉयमेंट फेल कर दें
    process.exit(1); 
}

const ai = new GoogleGenAI(apiKey);
const model = "gemini-2.5-flash"; // आप इस मॉडल का उपयोग कर रहे हैं

// 1. CORS सेटअप: केवल आपके frontend URL को एक्सेस की अनुमति दें
// अपने Live frontend URL से बदलें
const allowedOrigins = ['YOUR_FRONTEND_URL']; 

const corsOptions = {
    origin: (origin, callback) => {
        // Render पर 'origin' null हो सकता है, इसलिए हम इसकी अनुमति देते हैं
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

// 2. Rate Limiting सेटअप (सुरक्षा के लिए)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 मिनट
    max: 100, // प्रत्येक IP को 15 मिनट में 100 अनुरोधों तक सीमित करें
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

// 3. Health Check Route
app.get('/', (req, res) => {
    res.send({ status: "Server is running (CJS Mode)" });
});

// 4. Gemini API Proxy Route
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        res.json({ text: response.text });
    } catch (error) {
        console.error('Gemini API Error:', error.message);
        // उपयोगकर्ता को सीधे API कुंजी त्रुटियाँ न दिखाएँ
        res.status(500).json({ 
            error: 'An internal server error occurred.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 5. सर्वर शुरू करना
app.listen(port, () => {
    console.log(`Server listening on port ${port} (CJS Mode)`);
});
