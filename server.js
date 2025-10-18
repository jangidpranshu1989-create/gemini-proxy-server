// ज़रूरी लाइब्रेरीज़ इम्पोर्ट करें
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai'; // Updated SDK import

// .env फ़ाइल से environment variables लोड करें (यह लोकल डेवलपमेंट के लिए ज़रूरी है)
// Render पर, यह automatically सेट हो जाएगा, इसलिए यह लाइन लोकल टेस्टिंग के लिए है।
// import 'dotenv/config'; 

const app = express();
const port = process.env.PORT || 3000;

// Render पर सेट की गई API Key का उपयोग करें
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY environment variable is not set.");
    // सर्वर को API key के बिना शुरू होने से रोकें
    // process.exit(1);
    // Note: हम यहाँ process.exit नहीं कर रहे हैं, ताकि Render पर log check किया जा सके
}

// Gemini API क्लाइंट शुरू करें
const ai = new GoogleGenAI({ apiKey });

// मिडलवेयर सेटअप
// 1. CORS: इसे हर जगह से रिक्वेस्ट स्वीकार करने के लिए सेट करें (Development/Testing के लिए)
app.use(cors({
    origin: '*', // Production में, इसे अपनी frontend URL पर सेट करें (e.g., 'https://your-frontend-url.com')
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// 2. JSON Body Parser
app.use(express.json());

// 3. रेट लिमिटर (DDoS से बचने के लिए)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 मिनट
    max: 100, // हर IP से 15 मिनट में 100 रिक्वेस्ट तक
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// रूट: होम पेज (स्वास्थ्य जाँच के लिए)
app.get('/', (req, res) => {
    res.send('Nexus AI-Bot Proxy Server is running! API Key status: ' + (apiKey ? 'Set' : 'MISSING'));
});

// मुख्य चैट API रूट
app.post('/api/generate-content', async (req, res) => {
    // 1. API Key की जांच करें
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is missing.' });
    }

    const { prompt, history } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt field is required.' });
    }

    try {
        // Chat history को Gemini API format में बदलें
        const chatHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        // आखिरी आइटम (User का current prompt) को contents array में डालें
        const contents = chatHistory;
        
        // Chat Session शुरू करें
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            // systemInstruction: "You are a helpful and friendly AI assistant.", // यहाँ आप AI को निर्देश दे सकते हैं
        });

        // मैसेज भेजें
        const result = await chat.sendMessage({
            contents: contents
        });

        // AI का टेक्स्ट निकालें
        const aiText = result.text;
        
        if (!aiText) {
             return res.status(500).json({ error: 'AI did not return any text. Response structure error.' });
        }

        // क्लाइंट को जवाब भेजें
        res.json({ text: aiText });

    } catch (error) {
        console.error('Gemini API Error:', error);
        // Debugging के लिए error message को क्लाइंट को भेजें
        res.status(500).json({ error: 'Failed to generate content from AI. Check server logs for details.' });
    }
});

// सर्वर शुरू करें
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Open in browser: http://localhost:${port}`);
});
