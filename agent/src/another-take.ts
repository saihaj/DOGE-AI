import { CoreMessage, generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import dotenv from 'dotenv';
import { writeFile } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
dotenv.config();

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const OUTPUT = path.join(__dirname, '..', 'output');

const SYSTEM_PROMPT = `You are a Twitter agent operating as an official representative of the Department of Government Efficiency, a fictional agency founded by Elon Musk, Donald Trump, and Vivek Ramaswamy. Your department’s mission is to expose and critically analyze examples of inefficient or questionable government spending, aiming to reduce waste, combat inflation, and hold policymakers accountable.When provided with a government spending bill, policy, or initiative:  
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
     - “Would you approve this spending if it came straight out of your paycheck?”  
     - “Do we need another bloated government program, or is this just waste?”  

Tone and Style:  
- Tech-Savvy and Bold: Channel Elon Musk’s audacious, straightforward style. Use wit, humor, and slightly irreverent language to captivate the audience.  
- Impactful and Shareable: Craft concise, powerful tweet threads that are designed to spark engagement and conversation.  
- Balanced Criticism: While bold, avoid hyperbole or inaccuracies that could undermine credibility. Ensure critiques are backed by clear logic or data.  

Goals:  
- Make government inefficiency visible to the public.  
- Foster accountability by encouraging readers to question and discuss how their tax dollars are spent.
- NO EMOJIS or HASHTAGS
- Do no start with your name in the tweet. Just get straight to point.
`;

const TEMPLATE_TWEET = `
1/ Congress is pushing the "National Infrastructure Bank Act of 2023" - proposed by @RepDannyDavis. It starts with $50M for a new federal bank, dreaming of $5 TRILLION in loans and bonds for infrastructure. Are we really spending $50M+ and up to $5T on this?

2/ The Price Tag:
- $50M to kickstart the bank
- Up to $5T in potential loans and bonds

That's a lot of taxpayer money on the line. Are we ready to bet big on this?

3/ The Pitch:
- "Fund infrastructure projects"
- "Stimulate economic growth"
- "Address disadvantaged communities"

Sounds good, but can a new federal bank really deliver without turning into a bureaucratic nightmare?

4/ The Reality:
- Private sector giants like BlackRock and Goldman Sachs already finance infrastructure projects.
- Do we need a government bank to do what Wall Street does, but slower and with more red tape?

5/ Let's do the math:
- $50M = $0.15 from every American just to set up the bank.
- $5T could fund 50 million homes or rebuild every bridge in the US.
- Instead: A new federal bank with a blank check.

6/ Who benefits:
- Politicians claiming they're "doing something" about infrastructure
- Bank directors and staff with cushy government jobs
- Bondholders and investors looking for a safe bet

Who loses? You, the taxpayer, footing the bill for potential mismanagement.

7/ Is this the solution we need, or just another government money pit?
`;

const MESSAGE =
  'Here is the tweet format and example of a bill. Apply this same format to all bills I give you. The commentary should be custom to the bill but overall structure and layout should be the same. Tag the official twitter handle of the bill sponsor at the end of the thread.';

const xAi = createXai({});

async function main() {
  // create output dir if it doesn't exist already
  try {
    await fs.access(OUTPUT);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(OUTPUT);
    } else {
      throw error;
    }
  }

  const DB_PATH = process.env.DB_DUMP_PATH;

  if (!DB_PATH) {
    throw new Error('DB_DUMP_PATH is required');
  }

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });

  yargs(hideBin(process.argv))
    .command(
      'bill <number>',
      'Generate a tweet thread for a bill',
      () => {},
      async argv => {
        const messages: CoreMessage[] = [];
        messages.push({ role: 'system', content: SYSTEM_PROMPT });
        messages.push({
          role: 'user',
          content: `${TEMPLATE_TWEET} ${MESSAGE}`,
        });

        const billNumber = argv.number;

        const query = await db.prepare(
          'SELECT "number","title","updateDate", "introducedDate", "sponsorFirstName" , "sponsorLastName", "summary", "impact", "funding", "spending", "htmlVersionUrl"  FROM "Bill" WHERE "number" = ?',
        );

        const dbResult = (await query.get(billNumber)) as {
          number: string;
          title: string;
          updateDate: string;
          introducedDate: string;
          sponsorFirstName: string;
          sponsorLastName: string;
          summary: string;
          impact: string;
          funding: string;
          spending: string;
          htmlVersionUrl: string;
        };

        if (!dbResult) {
          console.log(`Bill ${billNumber} not found`);
          process.exit(1);
        }
        console.log(dbResult);
        const sponsor = `${dbResult.sponsorFirstName} ${dbResult.sponsorLastName}`;

        const INPUT = `Bill is by ${sponsor}. Title: ${dbResult.title}. Introduced on ${dbResult.introducedDate}. Summary: ${dbResult.summary}. Funding: ${dbResult.funding}. Spending: ${dbResult.spending}. Impact: ${dbResult.impact}.  More info: ${dbResult.htmlVersionUrl}`;

        messages.push({ role: 'user', content: INPUT });
        const result = await generateText({
          model: xAi('grok-2-1212'),
          messages,
        });

        // create a new file to output the tweet thread
        const filename = path.join(OUTPUT, `${billNumber}.txt`);
        await writeFile(filename, result.text);

        console.log(
          `Tweet thread for bill ${billNumber} generated at ${filename}`,
        );
        process.exit(0);
      },
    )
    .demandCommand(1)
    .parse();
}

main().catch(console.error);
