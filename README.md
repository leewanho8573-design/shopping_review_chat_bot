# 🛍️ Shopping Review Chatbot (RAG-powered)

A sophisticated AI-driven shopping review analysis system built with **Next.js**, **LangChain**, **Pinecone**, and **Supabase**.

## 🚀 Key Features

- **Semantic Search**: Powered by Pinecone vector database for high-accuracy review retrieval.
- **AI Analysis**: Uses GPT-4o-mini to analyze reviews and provide contextual answers.
- **Review Indexing**: Automatic indexing pipeline for CSV review data.
- **Database Sync**: Persistent storage of reviews and chat history in Supabase.
- **Premium UI**: Modern, responsive interface for seamless user interaction.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI/LLM**: LangChain, OpenAI (GPT-4o-mini, Text-embedding-3-small)
- **Vector DB**: Pinecone
- **Database**: Supabase (PostgreSQL)
- **Styling**: Vanilla CSS

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 20+
- OpenAI API Key
- Pinecone API Key & Index
- Supabase Project & URL

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_key
PINECONE_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
```

### 3. Installation
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Indexing Data
Send a POST request to `/api/indexing` to load and index the sample reviews from `samples/review.csv`.

## 📂 Project Structure

- `/src/app/api`: API Routes (Chat, Indexing)
- `/src/lib`: Library configurations (Pinecone, Supabase)
- `/supabase/migrations`: Database schema definitions
- `/samples`: Sample data for indexing
