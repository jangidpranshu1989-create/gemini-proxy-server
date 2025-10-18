// server.js - Electron App के लिए API प्रॉक्सी

// यह सर्वर आपकी API Key को सुरक्षित रूप से रखता है और Node.js के साथ Express का उपयोग करता है।

const express = require('express');

const cors = require('cors');

// Gemini SDK

const { GoogleGenAI } = require('@google/genai'); 



const app = express();

// पोर्ट को पर्यावरण चर (Environment Variable) से लें, 3000 डिफ़ॉल्ट है (क्लाउड होस्टिंग के लिए ज़रूरी)

const port = process.env.PORT || 3000;



// IMPORTANT: API Key को Environment Variable से लोड करें (सबसे सुरक्षित तरीका)

const apiKey = process.env.GEMINI_API_KEY;



if (!apiKey) {

    // अगर Key नहीं मिली, तो एक त्रुटि दिखाएँ और सर्वर बंद कर दें।

    console.error("त्रुटि: GEMINI_API_KEY Environment Variable में सेट नहीं है। सर्वर शुरू नहीं हो सकता।");

    process.exit(1);

}



// Gemini क्लाइंट को Key के साथ इनिशियलाइज़ करें

const ai = new GoogleGenAI(apiKey);



// 🚨 MANDATE 1: CORS SECURITY UPDATE 🚨

// सुरक्षा के लिए, '*' को बदलकर अपनी क्लाइंट वेबसाइट का URL डालें।

// उदाहरण: const clientOrigin = 'https://mera-chat-app.netlify.app';

const clientOrigin = '*'; // <--- ⚠️ प्रोडक्शन में इसे **ज़रूर** बदलें!



// CORS: यह आपके क्लाइंट (HTML/Electron) को सर्वर से बात करने की अनुमति देता है।

app.use(cors({

    origin: clientOrigin,

    methods: ['POST'],

    allowedHeaders: ['Content-Type'],

}));



// आने वाले JSON डेटा को प्रोसेस करने के लिए

app.use(express.json());



/**

 * Gemini API प्रॉक्सी Endpoint: /api/generate-content

 */

app.post('/api/generate-content', async (req, res) => {

    try {

        const { prompt, history } = req.body;

        

        if (!prompt) {

            return res.status(400).json({ error: "प्रॉम्प्ट अनिवार्य है।" });

        }



        // चैट हिस्ट्री को Gemini API के अनुरूप भागों (contents) में बदलें

        const contents = history.map(msg => ({

            role: msg.role,

            parts: [{ text: msg.text }]

        }));



        console.log(`नया अनुरोध प्राप्त हुआ। प्रॉम्प्ट: ${prompt.substring(0, 50)}...`);



        // सुरक्षित Gemini API कॉल

        const response = await ai.models.generateContent({

            model: 'gemini-2.5-flash',

            contents: contents,

        });



        const generatedText = response.text;



        // क्लाइंट को जवाब भेजें

        res.json({ text: generatedText });



    } catch (error) {

        console.error('Gemini API कॉल में त्रुटि:', error.message);

        res.status(500).json({ error: 'इंटरनल सर्वर त्रुटि। API कॉल विफल रहा।' });

    }

});



// सर्वर को शुरू करें

app.listen(port, () => {

    console.log(`✨ प्रॉक्सी सर्वर http://localhost:${port} पर चल रहा है`);

    console.log(`(Production में पोर्ट ${port} पर चल रहा है)`);

});