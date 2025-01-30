import { openai } from '@ai-sdk/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import he from 'he';
import sanitize from 'sanitize-html';

// Recommendations from ChatGPT
const CHUNK_SIZE = 2048;
const CHUNK_OVERLAP = 24;

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export function cleanText(html: string) {
  const decoded = he.decode(html); // Convert &lt; and &gt; to < and >
  const text = sanitize(decoded, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text.replace(/\s+/g, ' ').trim();
}

export const embeddingModel = openai.textEmbeddingModel(
  'text-embedding-3-small',
);
