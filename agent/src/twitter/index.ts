import { Scraper } from 'agent-twitter-client';
import Handlebars from 'handlebars';
import { newDogeXbt } from '../mixed-2';
import shuffle from 'lodash-es/shuffle';
import { createXai } from '@ai-sdk/xai';
import dotenv from 'dotenv';
import { generateText } from 'ai';
import { writeFile } from 'node:fs/promises';
import { bill as billDbSchema, db, eq } from 'database';
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

async function main() {
  const postTemplate = Handlebars.compile(TWITTER_POST_TEMPLATE);
  // await twitter.login(
  //   TWITTER_USERNAME,
  //   TWITTER_PASSWORD,
  //   TWITTER_EMAIL,
  //   TWITTER_2FA_SECRET,
  // );

  const bill = await db.query.bill.findFirst({
    where: eq(billDbSchema.number, 9896),
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

  const r1 = await generateText({
    model: xAi('grok-2-1212'),
    messages: [
      {
        role: 'system',
        content: newDogeXbt.system,
      },
      {
        role: 'user',
        content: post,
      },
    ],
  });

  console.log('\n\nTweet:\n', r1.text);

  const reply = 'Splitting HSI from ICE - how much will it really cost us?';
  const r2 = await generateText({
    model: xAi('grok-2-1212'),
    messages: [
      {
        role: 'system',
        content: newDogeXbt.system,
      },
      {
        role: 'user',
        content: post,
      },
      {
        role: 'assistant',
        content: r1.text,
      },
      {
        role: 'user',
        content: reply,
      },
    ],
  });

  console.log('\n\nReply:\n', reply);
  console.log('\n\Respnse:\n', r2.text);
  // const twitterResult = await twitter.sendTweet(result.text);
  // if (twitterResult.ok) {
  //   console.log('Tweet sent');
  // } else {
  //   console.log('Tweet failed to send');
  // }
}

main().catch(console.error);
