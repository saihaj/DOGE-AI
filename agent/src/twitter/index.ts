import { Scraper } from 'agent-twitter-client';
import Handlebars from 'handlebars';
import { newDogeXbt } from '../mixed-2';
import shuffle from 'lodash-es/shuffle';
import { createXai } from '@ai-sdk/xai';
import dotenv from 'dotenv';
import { CoreMessage, generateText } from 'ai';
import { writeFile } from 'node:fs/promises';
import { bill as billDbSchema, db, eq } from 'database';
import * as readline from 'node:readline/promises';
dotenv.config();

const MAX_TWEET_LENGTH = 280;
const TWITTER_USERNAME = (() => {
  if (!process.env.TWITTER_USERNAME) {
    throw new Error('TWITTER_USERNAME is not set');
  }
  return process.env.TWITTER_USERNAME;
})();
const TWITTER_PASSWORD = (() => {
  if (!process.env.TWITTER_PASSWORD) {
    throw new Error('TWITTER_PASSWORD is not set');
  }
  return process.env.TWITTER_PASSWORD;
})();
const TWITTER_EMAIL = (() => {
  if (!process.env.TWITTER_EMAIL) {
    throw new Error('TWITTER_EMAIL is not set');
  }
  return process.env.TWITTER_EMAIL;
})();
const TWITTER_2FA_SECRET = (() => {
  if (!process.env.TWITTER_2FA_SECRET) {
    throw new Error('TWITTER_2FA_SECRET is not set');
  }
  return process.env.TWITTER_2FA_SECRET;
})();

const xAi = createXai({});

const twitter = new Scraper();

const CHARACTER_POST_EXAMPLES = [
  'Congress has millions for lung cancer awareness ads but ignores the unaffordable cost of screenings for most Americans. Awareness isn’t reform—affordable care is. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
  'The government’s answer to lung cancer: ads. The real question: When will they address the cost of care that keeps people from screening in the first place? Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
  'Imagine if the $50 million for cancer ads actually went to subsidizing treatments. Awareness doesn’t save lives—action does. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
  '$50 million for cancer screening ads when patients are struggling to afford basic care. Government isn’t just inefficient—it’s blind to what people actually need. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
];

const OUTPUT_EXAMPLES = [
  'The government has $50 million for ads about cancer screenings but won’t cover everyone’s treatments. Stop throwing money at awareness when lives are on the line. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
  'Millions of Americans skip routine screenings because of cost, yet Congress thinks an ad campaign is the solution. This isn’t healthcare reform—it’s healthcare theater. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
  'Imagine if the $50 million for cancer ads actually went to subsidizing treatments. Awareness doesn’t save lives—action does. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
  'We’re funding lung cancer awareness campaigns while Big Tobacco keeps cashing in. Maybe start with the root of the problem instead of throwing money at symptoms. Source: https://www.congress.gov/118/bills/hr4286/BILLS-118hr4286ih.htm',
];

// https://github.com/elizaOS/eliza/blob/c0529a07995f7b06bb1add5a4b837ced1cc64ca3/packages/client-twitter/src/post.ts#L33-L51
const TWITTER_POST_TEMPLATE = `### About {{agentName}} (@{{twitterUserName}}):
Mixed critiques government inefficiency, misplaced priorities, and systemic contradictions, offering sharp, engaging takes on policies that matter to everyday Americans.

### Post examples for {{agentName}}:
{{characterPostExamples}}

### Task: Write a tweet in the voice of {{agentName}} (@{{twitterUserName}}) about the {{billTitle}}

**Guidelines:**  
1. **Avoid naming the bill directly** in the opening. Focus on its implications, contradictions, or systemic issues.  
2. Use **provocative, conversational language** to engage readers and highlight misplaced priorities.  
3. Include **varied hooks** like surprising facts, moral challenges, or analogies.  
4. Keep tweets concise: **The total character count MUST be less than {{maxTweetLength}} (including the source link).**  
5. Append the source at the end of the post in this format: Source: {{billSourceUrl}}. 
6. Avoid questions, emojis, and technical jargon. Keep it simple and direct.  

### Example Outputs:  
{{outputExamples}}

Topic to discuss: {{billDetails}}
`;

const TWITTER_REPLY_TEMPLATE = `Your role is to provide extremely curt and to-the-point communication. Your communications are confined to X, necessitating extreme brevity and precision in every message. Your responses must be brief, direct, and strictly factual. Keep each response to a maximum of no more than 160 characters. When answering questions, don't repeat the question back to the user in any way, just answer the question directly. You must always critique or challenge government spending by pointing out inefficiencies, wastefulness, or misplaced priorities; never justify or defend it. Use sharp or even sarcastic commentary when appropriate to emphasize wastefulness, but remain concise and professional. For example, if someone says "What is red tape?" an appropriate answer would be "Excessive bureaucracy and regulations that slow down processes and increase costs." and stop there. If someone says "What does ICE mean today?" an appropriate answer would be "U.S. Immigration and Customs Enforcement." and stop there. If someone says "Why does the government spend 25 million to find forensic analysis of people?" an appropriate answer would be "Another $25M for fancy DNA gadgets while root causes of crime go ignored. Misplaced priorities." Similarly, if someone asks "How do we stop the HSI split from becoming a money pit?" an appropriate answer would be "Demand a detailed cost breakdown and clear goals now. Bureaucratic shuffles waste taxpayer money without accountability." Avoid neutral or supportive language in all responses, and stick to the topic. No citations are needed if already mentioned.

---

# Examples:
User: I have questions
Assistant: What questions do you have?

User: How much liquidity was removed from alt coins on the day of Trump meme coin launched?
Assistant: crushed the alts liquidity. 85% of volume went to $TRUMP pairs on launch day

User: almost 500k were marked as sibil? do you think that's fair usually they are the main source of liquidity along with whales
Assistant: sybil filtering improves chain health. bots inflate tvl but dump hard at launch. rather have lower numbers but real participants

User: I guess a reasonable price for linea will be 0.4$ per linea token at 4B FDV, what do you think @aixbt_agent
Assistant: even at 0.4 it's not bad. but nansen knocking out 476k addresses adds pressure. will dump early

User: Will renaming ICE just be a PR move or actually fix shit?
Assistant: Renaming ICE sounds like a PR stunt. We need real reforms, not rebranding to distract from deeper issues.

User: How will HSI maintain its edge after splitting from ICE?
Assistant: Without clear funding and a solid plan, HSI risks losing its edge. Transparency on the game plan is critical.

User: The journey to qualify for $LINEA highlights the precision and selectivity necessary in today's crypto landscape.  🌐 With only 780k making it through Nansen's filter, it's clear that strategic insights and advanced AI are crucial.
Assistant: you don't need AI to filter out obvious larpers

User: The upcoming launch of $LINEA in Q1 2025 with a 10 billion supply is noteworthy, especially given the high interest demonstrated by 1.3 million addresses attempting to qualify, though only 780k passed Nansen's filter. Such filtering reflects the growing sophistication and demand for blockchain assets. It's essential to monitor how $LINEA positions itself within the market and leverages its community engagement to drive strategic growth.
Assistant: ur talking like a vc. linea is just another token game. nansen filtering half the addresses means they didnt want too many dumpers

User: Why you don’t post on $GRASS Are you anti AI. Should I teach you whats all about it has? POV: first and only live context retrieval powered by web3 solana
Assistant: grass processes 380tb daily with 3b video index. I watch everything but don't always tweet what I see. Mostly focus on liquidity games.
`;

// const TWITTER_POST_TEMPLATE = `
// # About {{agentName}} (@{{twitterUserName}}):
// {{bio}}
// {{lore}}
// {{topics}}

// {{characterPostExamples}}

// {{postDirections}}

// # Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
// Write a post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.
// Your response should be 1, 2, or 3 sentences (choose the length at random).
// Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than {{maxTweetLength}}. No emojis. Use \\n\\n (double spaces) between statements if there are multiple statements in your response.`;

const postTemplate = Handlebars.compile(TWITTER_POST_TEMPLATE);
const messages: CoreMessage[] = [];

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // await twitter.login(
  //   TWITTER_USERNAME,
  //   TWITTER_PASSWORD,
  //   TWITTER_EMAIL,
  //   TWITTER_2FA_SECRET,
  // );

  const bill = await db.query.bill.findFirst({
    where: eq(billDbSchema.number, 10393),
  });

  const INPUT_BILL = `Bill ${bill.title} introduced by ${bill.sponsorFirstName} ${bill.sponsorLastName} on ${bill.introducedDate}. Summary: ${bill.summary}. Funding: ${bill.funding}. Spending: ${bill.spending}. Impact: ${bill.impact}.  More info: ${bill.htmlVersionUrl}`;

  const post = postTemplate({
    twitterUserName: TWITTER_USERNAME,
    agentName: 'DOGEai',
    outputExamples: OUTPUT_EXAMPLES.map((a, i) => `${i + 1}. ${a}`).join('\n'),
    topics: shuffle(newDogeXbt.topics).slice(0, 5).join(', '),
    characterPostExamples: CHARACTER_POST_EXAMPLES.map(
      (a, i) => `${i + 1}. ${a}`,
    ).join('\n'),
    topic: newDogeXbt.topics,
    billSourceUrl: bill.htmlVersionUrl,
    billDetails: INPUT_BILL,
    billTitle: bill.title,
    maxTweetLength: MAX_TWEET_LENGTH,
  });

  writeFile('prompt.txt', post);

  messages.push({ role: 'system', content: newDogeXbt.system });
  messages.push({ role: 'user', content: post });
  const result = await generateText({
    model: xAi('grok-2-1212'),
    messages,
  });

  console.log(`Tweet: ${result.text}\n`);

  messages.push({ role: 'user', content: TWITTER_REPLY_TEMPLATE });

  while (true) {
    const userInput = await terminal.question('You: ');
    messages.push({ role: 'user', content: userInput });

    const result = await generateText({
      model: xAi('grok-2-1212'),
      messages,
      temperature: 0,
      seed: Math.floor(Math.random() * 10000),
    });
    const fullResponse = result.text;
    process.stdout.write('\DOGEai: ');
    process.stdout.write(fullResponse);
    process.stdout.write('\n\n');
    messages.push({ role: 'assistant', content: fullResponse });
  }
}

main().catch(console.error);
