import os
import chromadb
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.messages import HumanMessage
from typing import List, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file (if it exists)
load_dotenv()

@dataclass
class Chunk:
    id: str
    content: str
    metadata: Dict[str, Any]

def store_chunks(chunks: List[Chunk]):
    """
    Stores chunks of text into a ChromaDB collection with OpenAI embeddings.
    
    Args:
        chunks: A list of Chunk objects containing id, content, and metadata.
    """
    # Initialize Chroma Persistent Client (data will be stored in ./chroma_db)
    # Using PersistentClient ensures data is saved to disk
    client = chromadb.PersistentClient(path="./chroma_db")
    
    # Initialize OpenAI Embeddings
    # This will automatically use the OPENAI_API_KEY environment variable
    embeddings_model = OpenAIEmbeddings()

    # Create or get the collection named "my-docs"
    collection = client.get_or_create_collection(name="my-docs")

    # Extract contents, IDs, and metadata for storage
    documents = [c.content for c in chunks]
    ids = [c.id for c in chunks]
    metadatas = [c.metadata for c in chunks]

    # Generate embeddings and store in Chroma
    # The TS code explicitly generates embeddings, so we follow the same pattern here
    vectors = embeddings_model.embed_documents(documents)

    collection.add(
        ids=ids,
        embeddings=vectors,
        documents=documents,
        metadatas=metadatas
    )
    
    print(f"Successfully stored {len(chunks)} chunks in collection 'my-docs'.")

def query_rag(question: str) -> str:
    """
    Retrieves relevant documents from ChromaDB and answers the question using an LLM.
    """
    # Initialize Chroma client and embeddings
    client = chromadb.PersistentClient(path="./chroma_db")
    embeddings_model = OpenAIEmbeddings()
    
    # Get the collection
    try:
        collection = client.get_collection(name="my-docs")
    except Exception as e:
        return f"Error: Could not retrieve collection 'my-docs'. {str(e)}"
    
    # Embed the question
    question_vector = embeddings_model.embed_query(question)
    
    # Query collection for similar documents
    results = collection.query(
        query_embeddings=[question_vector],
        n_results=5
    )
    
    # Extract documents and build context
    retrieved_docs = results.get('documents', [[]])[0]
    context = "\n\n".join(retrieved_docs)
    
    # Construct the prompt
    prompt = f"""
다음 문서를 참고하여 질문에 답해주세요.

[참고 문서]
{context}

[질문]
{question}
[답변]
"""

    # Call LLM (using LangChain ChatOpenAI)
    # The 'gpt-4o-mini' model is a fast and cost-effective choice.
    llm = ChatOpenAI(model="gpt-4o-mini")
    response = llm.invoke([HumanMessage(content=prompt)])
    
    return response.content

if __name__ == "__main__":
    # Example usage for testing the storage
    sample_chunks = [
        Chunk(
            id="chunk_1", 
            content="This product exceeded my expectations. The quality is top-notch.", 
            metadata={"source": "review_site", "sentiment": "positive"}
        ),
        Chunk(
            id="chunk_2", 
            content="The delivery was late and the packaging was damaged.", 
            metadata={"source": "review_site", "sentiment": "negative"}
        )
    ]
    
    # store_chunks(sample_chunks)
    
    # Example usage for querying (uncomment to test)
    # answer = query_rag("What are the reviews saying about the quality?")
    # print(f"AI: {answer}")
