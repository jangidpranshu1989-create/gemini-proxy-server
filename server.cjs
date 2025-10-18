// Express setup
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 10000; // Use PORT from environment or default to 10000

// Initialize Google GenAI
// NOTE: Ensure the GEMINI_API_KEY environment variable is set on Render!
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-flash-preview-09-2025";

// --- CORS Configuration ---
// यह सुनिश्चित करता है कि आपका लोकल क्लाइंट (index.html) Render सर्वर से बात कर सके।
// हमने यहाँ 'origin: *' सेट कर दिया है, जिसका मतलब है कि यह किसी भी डोमेन से आने वाले
// रिक्वेस्ट्स को स्वीकार करेगा। यह लोकल डेवलपमेंट के लिए सुरक्षित और आसान है।
app.use(cors({
    origin: '*', // Allow all origins for simplicity in this project setup
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));
// --- End CORS Configuration ---


// Middleware for JSON parsing and rate limiting
app.use(express.json());

// Simple rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);


// Basic health check endpoint
app.get('/', (req, res) => {
    res.status(200).send({ message: "Gemini Proxy Server is running and healthy!" });
});


// Main endpoint to generate content
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).send({ error: "Prompt is required in the request body." });
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            // Optional: You can add system instructions or tools here if needed
        });

        // The response structure from the SDK
        const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            console.error("Gemini API returned no text:", response);
            return res.status(500).send({ error: "Gemini API failed to return text." });
        }

        // Send the generated text back to the client
        res.status(200).send({ text: generatedText });

    } catch (error) {
        console.error("Error during Gemini content generation:", error.message);
        res.status(500).send({ error: "Internal Server Error during AI generation.", details: error.message });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
