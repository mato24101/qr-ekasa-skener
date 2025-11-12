// netlify/functions/gemini-proxy.js
// Tento kód NESMIE byť volaný priamo, ale len cez Netlify.

import { GoogleGenAI } from '@google/genai';

// API kľúč sa NAČÍTAVA BEZPEČNE Z ENVIRONMENTÁLNYCH PREMENNÝCH Netlify.
// NEBUDE SÚČASŤOU VEREJNÉHO KÓDU!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const modelName = "gemini-2.5-flash-preview-09-2025";

/**
 * Netlify Function handler pre bezpečné volanie Gemini API.
 */
export async function handler(event, context) {
    
    // Zabezpečenie: Ak to nie je POST, odmietneme
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Zabezpečenie: Ak neexistuje kľúč, chyba servera
    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: API Key is missing.' }) };
    }

    try {
        // Parsujeme dáta odoslané z qr-scanner.html
        const { systemPrompt, userQuery, responseSchema } = JSON.parse(event.body);
        
        // Overenie potrebných dát
        if (!userQuery || !responseSchema) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing userQuery or responseSchema in request body.' }) };
        }

        // Vytvorenie konfigurácie pre Gemini volanie (vrátane štruktúry JSON)
        const config = {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        };
        
        // Ak existuje systemPrompt, pridáme ho
        if (systemPrompt) {
            config.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        // Volanie Google Gemini API
        const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: userQuery }] }],
            config: config,
        });

        // Extrahovanie čistého JSON textu z odpovede
        const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonText) {
            return { statusCode: 500, body: JSON.stringify({ error: 'AI did not return valid JSON text.' }) };
        }

        // Vrátime čistý JSON späť do klientskeho kódu (qr-scanner.html)
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: jsonText,
        };

    } catch (error) {
        console.error('Gemini Proxy Runtime Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Internal server error: ${error.message}` }),
        };
    }
}