// server.js - Gemini API ke liye Node.js Proxy Server

const express = require('express');
const cors = require('cors');
// Nayi aur stable Gemini SDK ko import karein
// Version 0.15.0 ke liye yeh class name sahi hai
const { GoogleGenerativeAI } = require('@google/generative-ai'); 

const app = express();

// Port Configuration
const port = process.env.PORT || 3000;

// 🔑 API Key ko Environment Variable se load karein
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("त्रुटि: GEMINI_API_KEY Environment Variable mein set nahi hai.");
    process.exit(1);
}

// Gemini क्लाइंट को initialize karein
const ai = new GoogleGenerativeAI(apiKey);

// 🌐 CORS Configuration
// '*' ko deployment ke baad apne frontend URL se badalna hai!
const clientOrigin = '*'; 

app.use(cors({
    origin: clientOrigin,
    methods: ['POST'],
    allowedHeaders: ['Content-Type'],
}));

// Incoming JSON data ko process karne ke liye
app.use(express.json());

// --- API Endpoint for Content Generation ---
app.post('/api/generate-content', async (req, res) => {
    try {
        // Frontend se prompt aur history receive karein
        const { prompt, history } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "प्रॉम्प्ट अनिवार्य है।" });
        }

        // Chat service ko initialize karein
        const chat = ai.getGenerativeModel({
            model: 'gemini-2.5-flash',
            config: {
                // System Instruction se model ka behavior set karein
                systemInstruction: "Aap ek friendly aur madadgaar AI assistant hain. Hamesha Hindi (Latin script) mein jawab dein, bilkul aasaan aur conversational tone mein.",
                temperature: 0.7,
            },
        }).createChat({
            // Pichli baatcheet (chat history) yahan load ho jaayegi
            history: history
        });

        // Naya user prompt bhejkar response generate karein
        const response = await chat.sendMessage({ text: prompt });

        const generatedText = response.text;

        // Generated text ko client ko wapas bhej dein
        res.json({ text: generatedText });

    } catch (error) {
        console.error('Gemini API call mein galti:', error.message);
        // Error ko client tak bhej dein
        res.status(500).json({ 
            error: 'Internal Server Error. API call fail ho gayi.', 
            details: error.message 
        });
    }
});

// Server ko start karein
app.listen(port, () => {
    console.log(`✨ Proxy Server chal raha hai: http://localhost:${port}`);
});
