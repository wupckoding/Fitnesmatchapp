
import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const chatWithGemini = async (message: string, history: { role: string, parts: { text: string }[] }[]) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: "Eres Pulse AI, un asistente de bienestar sofisticado en Costa Rica. Tu tono es profesional, motivador y moderno. Siempre hablas en español. Conoces los precios en Colones (₡) y lugares populares en San José, Escazú y Santa Ana.",
        temperature: 0.7,
      }
    });

    return response.text || "Lo siento, no pude procesar eso.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Algo salió mal. Por favor intenta de nuevo.";
  }
};
