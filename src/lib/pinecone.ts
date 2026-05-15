import { Pinecone } from '@pinecone-database/pinecone';

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || 'dummy_key_for_build',
});

export const indexName = 'wh-review-chatbot';
