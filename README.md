# Project Name: Autonomous Payment Recovery Agent & AI Checkout Optimizer

*A Pine Labs Playground AI Hackathon Submission*

---

## 💡 Hackathon Submission Details

**What problem are you trying to solve?**
Payment failures are common in online and POS transactions due to bank downtime, authentication errors, insufficient balance, or network issues. When a payment fails, users often abandon the purchase instead of retrying with another method. This leads to lost revenue for merchants and a poor checkout experience. Currently, there is no intelligent system that automatically recovers failed transactions.

**Proposed solution of the problem**
We propose an Autonomous Payment Recovery Agent that detects failed transactions and automatically attempts recovery. The system analyzes the failure reason and intelligently retries the payment using better options such as switching to UPI, suggesting BNPL/EMI, retrying after a delay, or selecting a more reliable payment rail. The goal is to convert failed payments into successful transactions without requiring manual user retries.

**How will AI or automation be used in your solution?**
AI will analyze transaction context, failure codes, and historical payment success rates to determine the best recovery strategy. The agent can decide whether to retry the payment, switch payment methods, or offer alternatives such as BNPL. Over time, the system learns which strategies work best and improves recovery rates automatically.

**How will your solution interact with Pine Labs payments?**
The system integrates with Pine Labs payment flows and monitors transaction responses in real time. When a payment fails, the agent uses Pine Labs supported payment options (cards, UPI, BNPL, EMI) to retry the transaction through an optimized path. This acts as an intelligent recovery layer within the Pine Labs checkout and POS ecosystem.

**What technologies or tools do you plan to use?**
* **Backend:** Node.js (Next.js API Routes) / Python
* **AI/Intelligence:** AWS Bedrock LLMs (for decision intelligence)
* **Payments:** Pine Labs Online Payment APIs (for transaction handling)
* **Frontend:** React / Next.js (Dashboard and interface)
* **Databases:** Prisma with SQLite (for mock transactions) / PostgreSQL
* **Cloud:** AWS Infrastructure

**Business impact and what makes your idea unique**
Even recovering a small percentage of failed payments can significantly increase merchant revenue. Our solution introduces an AI agent that actively recovers failed transactions instead of simply reporting them. By intelligently retrying payments and selecting optimal methods, it improves payment success rates, merchant revenue, and overall customer experience.

**Team Members:**
* Kalash Poddar
* [Team Member Name]
* [Team Member Name]

---

## 🚀 How to Run and Test the Demo

This repository contains a working prototype of the Autonomous Payment Recovery Agent built with Next.js, Tailwind CSS, and a real AWS Bedrock SDK integration.

### Prerequisites
* Node.js (v18+)
* npm
* **AWS Credentials:** You must have `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables configured with access to Amazon Bedrock (`anthropic.claude-3-haiku-20240307-v1:0`). *(Note: The app has a mock fallback if you skip this step!)*

### Running Locally
1. Clone the repository and navigate to the project directory:
   ```bash
   cd ai-checkout-optimizer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the Prisma SQLite database:
   ```bash
   npx prisma db push
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 🧪 How to Test the AI Recovery Flow
The demo showcases two main components: The intelligent checkout experience (consumer side) and the analytics hub (merchant side).

#### 1. Testing the Checkout & Recovery Agent
1. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.
2. You will see a mock e-commerce checkout page powered by "AI Smart-Tender" which suggests the best payment method based on loyalty points and bank success rates.
3. Click the **"Pay Securely"** button.
4. **The Failure Simulation:** For the purpose of the demo, the frontend will intentionally simulate a Pine Labs network failure.
5. **The AI Intercept:** Watch as the checkout does *not* decline the user. Instead, the **Autonomous Recovery Agent** console intercepts the failure. The Next.js backend securely calls **AWS Bedrock (Claude 3)**. The LLM analyzes the error logic and instantly routes a 1-click fallback to a highly successful rail (like Google Pay UPI) to save the sale autonomously.
6. The terminal console will display Claude's reasoning (e.g., *"Match found: Saved Google Pay UPI has 99.8% success rate right now."*) before showing the Transaction Success state.

#### 2. Viewing the Merchant Dashboard
1. Navigate to **[http://localhost:3000/merchant](http://localhost:3000/merchant)**.
2. Here, you can view the Pine Labs AI Optimization Analytics. 
3. This dashboard visually breaks down the business impact, showing the hypothetical revenue recovered, failures intercepted, and an analysis of which AI models (EMI offset, UPI split) are saving the most carts.
