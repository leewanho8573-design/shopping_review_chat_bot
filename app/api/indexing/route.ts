import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { pinecone, indexName } from '@/lib/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const csvPath = path.join(process.cwd(), 'samples', 'review.csv');

    // 파일 존재 여부 확인
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV 파일을 찾을 수 없습니다: ' + csvPath);
    }

    const csvFile = fs.readFileSync(csvPath, 'utf8');

    // Papa.parse 결과 확인
    const parseResult = Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
    });

    const reviews = parseResult.data as any[];

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      throw new Error('CSV 파일에 데이터가 없거나 형식이 잘못되었습니다.');
    }

    console.log(`Loaded ${reviews.length} reviews from CSV.`);

    // 1. Save to Supabase (Database sync)
    const { error: supabaseError } = await supabase
      .from('reviews')
      .upsert(reviews.map((r: any) => ({
        id: r.id || `rev_${Math.random().toString(36).substr(2, 9)}`,
        rating: r.rating ? parseInt(r.rating) : 0,
        title: r.title || '',
        content: r.content || '',
        author: r.author || 'Anonymous',
        date: r.date || new Date().toISOString().split('T')[0],
        helpful_votes: r.helpful_votes ? parseInt(r.helpful_votes) : 0,
        verified_purchase: String(r.verified_purchase).toUpperCase() === 'TRUE'
      })));

    if (supabaseError) {
      console.error('Supabase Error:', supabaseError);
    }

    // 2. Index to Pinecone
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
      dimensions: 1024,
    });

    const pineconeIndex = pinecone.Index(indexName);

    const documents = reviews.map((r: any) => new Document({
      pageContent: `평점: ${r.rating}\n제목: ${r.title}\n내용: ${r.content}`,
      metadata: {
        id: r.id,
        author: r.author,
        rating: r.rating,
        date: r.date
      }
    }));

    console.log(`Total documents created: ${documents.length}`);
    if (documents.length === 0) {
      throw new Error('No documents to index.');
    }

    // Batch upload
    const batchSize = 50;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`Indexing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} docs...`);
      
      const contents = batch.map(d => d.pageContent);
      const vectors = await embeddings.embedDocuments(contents);
      
      const upsertRecords = batch.map((doc, idx) => ({
        id: String(doc.metadata.id || `rev_${Math.random().toString(36).substr(2, 9)}`),
        values: vectors[idx],
        metadata: {
          ...doc.metadata,
          text: doc.pageContent // Store text in metadata for retrieval
        },
      }));

      console.log(`Upserting ${upsertRecords.length} records to Pinecone (namespace: default)...`);
      if (upsertRecords.length > 0) {
        await pineconeIndex.namespace('default').upsert(upsertRecords);
      }
      console.log(`Indexed batch ${Math.floor(i / batchSize) + 1}`);
    }

    return NextResponse.json({ success: true, message: 'Indexing completed successfully.' });
  } catch (error: any) {
    console.error('Indexing Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
