// api/generate.cjs - Vercel Serverless Function
// यह प्रॉक्सी आपकी API Key को सुरक्षित रूप से रखता है और Gemini को कॉल करता है।

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();

// IMPORTANT: API Key को Environment Variable (Vercel Settings) से लोड करें
const apiKey = process.env.GEMINI_API_KEY; 

// Gemini क्लाइंट को Key के साथ इनिशियलाइज़ करें
const ai = apiKey ? new GoogleGenAI(apiKey) : null; 

// CORS: यह सुनिश्चित करता है कि आपका Frontend (जो Vercel पर या कहीं और होस्टेड है)
// इस API को कॉल कर सके।
app.use(cors());
app.use(express.json());

// Vercel में, यह endpoint मुख्य रूप से /api/generate पर उपलब्ध होगा।

/**
 * Gemini API प्रॉक्सी Endpoint: /api/generate
 * यह क्लाइंट से प्रॉम्प्ट और हिस्ट्री लेता है और Gemini को कॉल करता है।
 */
app.post('/generate', async (req, res) => {
    // चेक करें कि API Key मौजूद है या नहीं
    if (!ai) {
        return res.status(503).json({ 
            error: "सर्वर त्रुटि: Gemini API Key उपलब्ध नहीं है। Vercel Environment Variables चेक करें।" 
        });
    }
    
    try {
        // क्लाइंट से भेजा गया प्रॉम्प्ट और चैट हिस्ट्री निकालें
        const { prompt, history } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "प्रॉम्प्ट अनिवार्य है।" });
        }

        // Gemini API के लिए 'contents' array बनाएं, जिसमें history और current prompt दोनों हों
        const contents = history.map(msg => ({
            role: msg.role, // 'user' or 'model'
            parts: [{ text: msg.text }]
        }));
        
        // नया यूजर प्रॉम्प्ट history में नहीं होता, इसलिए इसे contents में जोड़ें
        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });
        
        // सुरक्षित Gemini API कॉल
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents, // पूरा इतिहास और नया प्रॉम्प्ट भेजा जाता है
        });

        // Gemini SDK response से सिर्फ़ text निकालें
        const generatedText = response.text;

        // क्लाइंट को जवाब भेजें
        res.json({ text: generatedText });

    } catch (error) {
        console.error('Gemini API कॉल में त्रुटि:', error.message);
        res.status(500).json({ error: 'इंटरनल सर्वर त्रुटि। API कॉल विफल रहा।', detail: error.message });
    }
});

// Vercel Deployment के लिए Express app को export करें
// Vercel इस exported app को Serverless Function के रूप में चलाएगा।
module.exports = app;
