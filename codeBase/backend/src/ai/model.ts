import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { config } from "dotenv";

export const geminiModel = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    temperature: 0,
    apiKey: config.GOOGLE_API_KEY;
})

export default geminiModel;