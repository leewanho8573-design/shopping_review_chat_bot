import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { pinecone, indexName } from '@/lib/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { supabase } from '@/lib/supabase';

interface Review {
  id?: string;
  rating?: string | number;
  title?: string;
  content?: string;
  author?: string;
  date?: string;
  helpful_votes?: string | number;
  verified_purchase?: string | boolean;
}

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

    const reviews = parseResult.data as Review[];

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      throw new Error('CSV 파일에 데이터가 없거나 형식이 잘못되었습니다.');
    }

    console.log(`Loaded ${reviews.length} reviews from CSV.`);

    // 1. Save to Supabase (Database sync)
    const { error: supabaseError } = await supabase
      .from('reviews')
      .upsert(reviews.map((r: Review) => ({
        id: r.id || `rev_${Math.random().toString(36).substring(2, 11)}`,
        rating: r.rating ? Number(r.rating) : 0,
        title: r.title || '',
        content: r.content || '',
        author: r.author || 'Anonymous',
        date: r.date || new Date().toISOString().split('T')[0],
        helpful_votes: r.helpful_votes ? Number(r.helpful_votes) : 0,
        verified_purchase: String(r.verified_purchase).toUpperCase() === 'TRUE'
      })));

    if (supabaseError) {
      console.error('Supabase Error:', supabaseError);
    }

    // 2. Index to Pinecone
    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small",
      dimensions: 1024,
    });

    const pineconeIndex = pinecone.Index(indexName);

    const documents = reviews.map((r: Review) => new Document({
      pageContent: `평점: ${r.rating}\n제목: ${r.title}\n내용: ${r.content}`,
      metadata: {
        id: r.id || `rev_${Math.random().toString(36).substr(2, 9)}`,
        author: r.author || 'Anonymous',
        rating: r.rating ? String(r.rating) : '0',
        date: r.date || new Date().toISOString()
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
        id: String(doc.metadata.id || `rev_${Math.random().toString(36).substring(2, 11)}`),
        values: vectors[idx],
        metadata: {
          text: doc.pageContent,
          id: String(doc.metadata.id),
          author: String(doc.metadata.author),
          rating: String(doc.metadata.rating),
          date: String(doc.metadata.date)
        },
      }));

      console.log(`Upserting ${upsertRecords.length} records to Pinecone...`);
      if (upsertRecords.length > 0) {
        // Compatibility for Pinecone SDK 5.x
        await pineconeIndex.upsert(upsertRecords);
      }
      console.log(`Indexed batch ${Math.floor(i / batchSize) + 1}`);
    }

    return NextResponse.json({ success: true, message: 'Indexing completed successfully.' });
  } catch (error: unknown) {
    console.error('Indexing Error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
