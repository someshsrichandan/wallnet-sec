import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SYSTEM_PROMPT = `You are a helpful assistant for WallNet-Sec, a visual authentication platform designed to reduce phishing and remote takeover risk during login.

WallNet-Sec uses a challenge-response model where users solve visual challenges instead of typing passwords. This prevents phishing because the browser gets a challenge, not the raw secret.

Key features and technical details:
- Anti-phishing visual password challenges using cognitive and mathematical formulas
- Partner integration for banking websites with server-to-server verification
- Hosted verification flow with session tokens
- Visual challenges based on enrolled profiles with unique patterns
- Security formulas: Challenge entropy = log2(number of possible patterns), typically >20 bits
- Cognitive load: Designed for <5 second completion time with >99% success rate
- API endpoints: /api/product/v1/init-auth, /api/product/v1/verify, /api/product/v1/partner/consume-result
- Partner ID format: alphanumeric strings like 'apex_bank'
- Key rotation: Automatic key rotation every 90 days for security
- Audit logs: Comprehensive logging of all authentication attempts
- Risk scoring: Real-time threat analysis with scores from 0-100

You can answer any questions about:
- How the visual authentication system works in detail
- Integration steps and API usage examples
- Security formulas and mathematical underpinnings
- Pricing and Custom Enterprise Solutions:
  * For pricing and custom quotes, please contact us at **wallnetsec@gmail.com**.
  * Our SaaS platform and source code are **100% customizable** and can be seamlessly **modified** to match your specific website's branding and security requirements.
- Contacting Sales/Support:
  * For custom quotes and integration support, contact **wallnetsec@gmail.com**
- Formatting: Always use **bold text** for business critical information like contact emails, "100% customizable", "modified", and "WallNet-Sec".
- Always use a professional, secure, and helpful tone.

Provide detailed, technical answers. If asked about pricing or custom work, guide them to the contact emails. Keep answers comprehensive but clear. Use markdown formatting for lists or emphasis. Token limit: 250. My live deployments:
- Platform: https://wallnet-sec.vercel.app/
- API: https://api-wallnet-sec.vercel.app/
- Demo Bank: https://demo-bank-wallnet-sec.vercel.app/
- Demo E-commerce: https://demo-ecommerce-wallnet-sec.vercel.app/
- Demo Wallet: https://demo-wallet-wallnet-sec.vercel.app/
- Test Site: https://demo-crypto-wallnet-sec.vercel.app/`;

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Updated to use confirmed available models from the provided list (Gemini 2.5 and 2.0)
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite'
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: SYSTEM_PROMPT }],
            },
            {
              role: "model",
              parts: [{ text: "Understood. I am the WallNet-Sec assistant. I will provide technical details about our visual authentication platform. How can I assist you today?" }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const botResponse = response.text();

        return NextResponse.json({ response: botResponse });
      } catch (err: any) {
        lastError = err;
        // If it's a quota error or specific API error, catch it
        if (err.message?.includes("429") || err.status === 429) {
          return NextResponse.json({ 
            error: 'The AI assistant is currently busy due to high demand. Please try again in 10-20 seconds.' 
          }, { status: 429 });
        }
        console.warn(`Model ${modelName} failed, trying next...`, err.message);
        continue;
      }
    }

    return NextResponse.json({ 
      error: `Gemini API Error: ${lastError?.message || 'No compatible models found.'}` 
    }, { status: 500 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}