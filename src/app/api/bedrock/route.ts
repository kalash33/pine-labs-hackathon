import { NextResponse } from 'next/server';

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Initialize the Bedrock client. 
// Note: This relies on the system having AWS credentials configured 
// (e.g. via AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars).
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  } : {})
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, errorCode, cartTotal, userProfile } = body;
    
    // We will attempt to call the real AWS Bedrock API
    try {
      if (action === 'recover') {
        const prompt = `Human: You are an autonomous AI Payment Recovery Agent operating as middleware for Pine Labs. A transaction just failed. 
        Context:
        - Cart Total: ${cartTotal || '₹4,500'}
        - Error Code: ${errorCode || '504_BANK_TIMEOUT'}
        - User Context: ${JSON.stringify(userProfile || { loyalty_points: 500, saved_methods: ["HDFC CC", "Google Pay UPI"], risk_level: "low" })}
        
        Your goal is to recover this checkout autonomously without losing the sale. 
        Analyze the failure code, determine the root cause, check user context for fallbacks, and output a JSON response with EXACTLY THREE keys:
        1. "thought_process" (a 1-sentence step-by-step logic detailing why you are routing to the fallback)
        2. "suggestion" (a 1-3 word payment method, e.g. "Google Pay UPI", "3-Month EMI")
        3. "rationale" (a final status message to show the user on the UI)
        
        Assistant: Here is the JSON: {`;

        const command = new InvokeModelCommand({
          modelId: "anthropic.claude-3-haiku-20240307-v1:0",
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 300,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          }),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const aiText = responseBody.content[0].text;
        
        // Ensure valid JSON is parsed from Claude's response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return NextResponse.json(JSON.parse(jsonMatch[0]));
        } else {
            return NextResponse.json({ 
                thought_process: "Analyzed failure and selected best fallback.",
                suggestion: "UPI", 
                rationale: aiText 
            });
        }
      }
      
      if (action === 'smart_tender') {
          const tenderPrompt = `Human: You are an autonomous AI Payment Router for an e-commerce platform via Pine Labs. A user is on the checkout page. 
          Context:
          - Cart Total: ${cartTotal || '₹4,500'}
          - User Profile: ${JSON.stringify(userProfile || { loyalty_points_value: 500, saved_methods: ["HDFC Credit Card", "Google Pay UPI"] })}
          
          Your goal is to increase conversion by suggesting the optimal upfront payment mix (Smart Tender) before they even click pay. 
          Analyze the cart value against the user's available assets (like points) and output a JSON response with EXACTLY THREE keys:
          1. "thought_process" (a 1-sentence logic detailing why you are sorting these methods)
          2. "top_suggestion" (a 1-4 word payment method, e.g. "Points + Credit Card", "3-Month EMI", "Google Pay UPI")
          3. "rationale" (a persuasive 1 sentence pitch to show the user on why this is the best deal for them)
          
          Assistant: Here is the JSON: {`;

          const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
              anthropic_version: "bedrock-2023-05-31",
              max_tokens: 300,
              messages: [{ role: "user", content: tenderPrompt }]
            }),
          });

          const response = await client.send(command);
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          const aiText = responseBody.content[0].text;
          
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              return NextResponse.json(JSON.parse(jsonMatch[0]));
          } else {
              return NextResponse.json({ 
                  thought_process: "Analyzed user wallet to minimize drop-off.",
                  top_suggestion: "Points + Card", 
                  rationale: aiText 
              });
          }
      }
    } catch (bedrockError) {
      console.warn("⚠️ AWS Bedrock execution failed (Likely missing AWS credentials). Falling back to mock data.", bedrockError);
      
      // Fallback for demo purposes if AWS keys are not set up locally
      if (action === 'recover') {
        let llmResponse = {
          thought_process: "Error 504 implies HDFC Credit Card issuing bank is down. User history shows active UPI profile. Initiating autonomous switch.",
          suggestion: "UPI",
          rationale: "Network timeout detected on Card. Switching to UPI avoids issuing bank hop and has a 99% success rate right now."
        };
  
        if (errorCode === 'INSUFFICIENT_FUNDS') {
          llmResponse = {
            thought_process: "User card declined for insufficient funds. Analyzing cart value. Cart qualifies for 3-month EMI. Initiating BNPL flow.",
            suggestion: "EMI",
            rationale: "User card declined for funds. Offering 3-month EMI via Pine Labs to split the cost and save the cart."
          };
        }
        return NextResponse.json(llmResponse);
      }

      if (action === 'smart_tender') {
        return NextResponse.json({
          thought_process: "Cart is ₹4,500. User has ₹500 in expiring loyalty points. Suggesting a split tender optimizes conversion by reducing out of pocket cost.",
          top_suggestion: "Split: Points + Card",
          rationale: "Apply your ₹500 Loyalty points to reduce this order to ₹4,000 via your HDFC Card."
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
