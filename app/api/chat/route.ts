import { NextResponse } from 'next/server';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { PineconeEmbeddings, PineconeStore } from '@langchain/pinecone';
import { supabase } from '@/lib/supabase';
import { pinecone, indexName } from '@/lib/pinecone';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPEN_API_KEY,
        modelName: "text-embedding-3-small",
        dimensions: 1024,
    });

    const pineconeIndex = pinecone.Index(indexName);
    
    // 1. Similarity Search
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: 'default',
    });

    const results = await vectorStore.similaritySearch(question, 5);
    const context = results.map(doc => doc.pageContent).join('\n\n');

    // 2. Call LLM
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    const prompt = `
당신은 쇼핑 리뷰 분석 전문가입니다. 다음 문서를 참고하여 사용자의 질문에 답해주세요.

[참고 문서]
${context}

[질문]
${question}

[답변]
`;

    const response = await llm.invoke(prompt);
    const answer = response.content;

    // 3. Save to Chat History (Supabase)
    await supabase.from('chat_history').insert({
      question,
      answer
    });

    return NextResponse.json({ 
        answer, 
        context: results.map(doc => ({ 
            content: doc.pageContent, 
            metadata: doc.metadata 
        })) 
    });
  } catch (error: any) {
    console.error('Chat Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
