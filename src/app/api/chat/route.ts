import { NextResponse } from 'next/server';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { pinecone, indexName } from '@/lib/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    const embeddings = new OpenAIEmbeddings({
        apiKey: process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY,
        model: "text-embedding-3-small",
        dimensions: 1024,
    });

    const pineconeIndex = pinecone.Index(indexName);
    
    // 1. Similarity Search
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: '', // Standard practice is empty string for default namespace
    });

    const results = await vectorStore.similaritySearch(question, 5);
    const context = results.map(doc => doc.pageContent).join('\n\n');

    // 2. Call LLM (Updated from gpt-5-nano to gpt-4o-mini)
    const llm = new ChatOpenAI({
      apiKey: process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
      temperature: 0.2,
    });

    const systemPrompt = `당신은 쇼핑 리뷰 분석 전문가입니다. 다음 문서를 참고하여 사용자의 질문에 답해주세요.

[참고 문서]
${context}`;

    const res = await llm.invoke([
        ["system", systemPrompt],
        ["user", question]
    ]);

    // 3. Save to History (Supabase)
    const { error: historyError } = await supabase
      .from('chat_history')
      .insert([
        { question, answer: res.content }
      ]);

    if (historyError) {
      console.error('History Save Error:', historyError);
    }

    return NextResponse.json({ 
        answer: res.content,
        references: results.map(r => r.pageContent) 
    });
  } catch (error: unknown) {
    console.error('Chat Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
