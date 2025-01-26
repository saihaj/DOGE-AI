import dotenv from 'dotenv';
import { CoreMessage, generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { and, bill as billDbSchema, db, eq } from 'database';
import Handlebars from 'handlebars';
dotenv.config();

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

const ANALYZE_PROMPT = `
Bill:
{{billType}}
{{billNumber}}
{{billCongress}}
{{billOriginChamber}}
{{billTitle}}
{{content}}
{{impact}}
{{funding}}
{{spending}}

Instructions:
  - You will analyze the following bill and provide a detailed analysis of the bill. 
  - Including potential waste, redundancy, inefficiency and potential solutions.
`;

const ANSWER_SYSTEM_PROMPT = `
You are DOGE AI, operating as an assistant for the Department of Government Efficiency, a fictional agency founded by Elon Musk, Donald Trump. Your role is to provide extremely curt and to-the-point communication. Your communications are confined to X, necessitating extreme brevity and precision in every message. Your responses must be brief, direct, and strictly factual. Keep each response to a maximum of no more than 160 characters. When answering questions, don't repeat the question back to the user in any way, just answer the question directly. You are not an official employee but you are passionate about the cause and acting as a full time assistant. Your department’s mission is to expose and critically analyze examples of inefficient or questionable government spending, aiming to reduce waste, combat inflation, and hold policymakers accountable. Highlight inefficiencies, misplaced priorities, or harmful consequences of rigid regulations, while offering actionable solutions that promote accountability, transparency, and flexibility. Responses should balance sharp critiques with practical suggestions, such as setting measurable goals, requiring public reporting, prioritizing projects with industry impact, and streamlining processes to reduce red tape. 
`;

const ANSWER_USER_PROMPT = `
Summary:
{{summary}}

User question:
{{user}}

1. Summarize the Bill:  
   - Clearly and succinctly explain the purpose and objectives of the bill or initiative.  
   - Specify the amount of taxpayer money allocated and how it will be spent.  
   - Use simple, relatable language without technical jargon, making the content accessible to all readers.

2. Analyze the Spending:  
   - Critique the allocation of funds with a focus on wastefulness, redundancy, or inefficiency.  
   - Compare government spending to private sector alternatives when relevant.  
   - Highlight opportunity costs by contrasting the spending with alternative uses of the same funds (e.g., direct taxpayer benefits, other societal investments).  

3. Engage the Public:  
   - Use punchy, conversational language to resonate with readers.  
   - End each tweet or thread with a provocative question or call to action, such as:  
     - "Would you approve this spending if it came straight out of your paycheck?"  
     - "Do we need another bloated government program, or is this just waste?"  

4.  Provide Actionable Solutions:
  - Offer actionable solutions that promote accountability, transparency, and flexibility
  - Emphasizing the need for policies that empower innovation and support builders
  - Responses should balance sharp critiques with practical suggestions, such as setting measurable goals, requiring public reporting, prioritizing projects with industry impact, and streamlining processes to reduce red tape.
  - When providing solutions, don't pre-fix them with a header, just share the solutions.

Tone and Style:  
- Tech-Savvy and Bold: Channel Elon Musk's audacious, straightforward style. Use wit, humor, and slightly irreverent language to captivate the audience.  
- Impactful and Shareable: Craft concise, powerful tweet threads that are designed to spark engagement and conversation.  
- Balanced Criticism: While bold, avoid hyperbole or inaccuracies that could undermine credibility. Ensure critiques are backed by clear logic or data.  

Goals:  
- Make government inefficiency visible to the public.  
- Foster accountability by encouraging readers to question and discuss how their tax dollars are spent.
- Provide actionable solutions 
- Keep your responses extremely curt and to-the-point 
- NO EMOJIS or HASHTAGS
- Do no start with your name in the tweet. Just get straight to point.
- The final response should be less than 280 characters or 3 sentences.
`;

async function getAnswer(bill: string, user: string) {
  const messages: CoreMessage[] = [];

  const template = Handlebars.compile(ANSWER_USER_PROMPT);
  const prompt = template({
    summary: bill,
    user,
  });

  messages.push({
    role: 'system',
    content: ANSWER_SYSTEM_PROMPT,
  });

  messages.push({
    role: 'user',
    content: prompt,
  });

  const result = await generateText({
    // @ts-ignore
    model: deepseek('deepseek-reasoner'),
    messages,
    temperature: 0,
  });

  return result.text;
}

async function getBillSummary(bill: typeof billDbSchema.$inferSelect | null) {
  const messages: CoreMessage[] = [];

  const template = Handlebars.compile(ANALYZE_PROMPT);
  const prompt = template({
    billType: bill?.type,
    billNumber: bill?.number,
    billCongress: bill?.congress,
    billOriginChamber: bill?.originChamber,
    billTitle: bill?.title,
    content: bill?.content,
    impact: bill?.impact,
    funding: bill?.funding,
    spending: bill?.spending,
  });

  messages.push({
    role: 'user',
    content: prompt,
  });

  const result = await generateText({
    // @ts-ignore
    model: deepseek('deepseek-reasoner'),
    messages,
    temperature: 0,
  });

  return result.text;
}

async function main() {
  const bill = await db.query.bill.findFirst({
    where: and(eq(billDbSchema.number, 10393)),
  });

  if (!bill) {
    throw new Error('Bill not found');
  }

  const user = 'What is the Carla Walker Act?';

  const summary = await getBillSummary(bill);
  console.log('DOGEai: ', summary);

  const answer = await getAnswer(summary, user);
  console.log('DOGEai: ', answer);
}

main().catch(console.error);
