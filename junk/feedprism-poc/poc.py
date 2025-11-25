"""
FeedPrism PoC: Validate core pipeline
- Fetch email via Gmail API
- Extract event using LLM
- Embed and store in Qdrant
- Search and retrieve
"""

import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import openai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv() 

# 1. Fetch 1 email from Gmail
def fetch_sample_email():
    print("📧 Fetching email from Gmail...")
    try:
        creds = Credentials.from_authorized_user_file('token.json')
        service = build('gmail', 'v1', credentials=creds)
        results = service.users().messages().list(userId='me', maxResults=1).execute()
        messages = results.get('messages', [])
        
        if not messages:
            print("⚠️ No emails found in inbox.")
            return None

        msg_id = messages[0]['id']
        msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        snippet = msg.get('snippet', '')
        print(f"✅ Fetched email snippet: {snippet[:100]}...")
        return snippet # For PoC, snippet is enough to test LLM. In prod, we parse full body.
    except Exception as e:
        print(f"❌ Gmail API Error: {e}")
        return None

# 2. Extract event using LLM
def extract_event(email_text):
    print("🤖 Extracting event with LLM...")
    if not email_text:
        # Fallback for testing if no email fetched
        email_text = "Join us for the AI Summit 2024 on Dec 15 at the Convention Center. It will be a great event about LLMs."
        print("⚠️ Using fallback sample text.")

    prompt = f"""
    Extract event details from this email text in JSON format.
    Return ONLY raw JSON, no markdown formatting.
    
    Fields: title, date, location, description
    
    Email:
    {email_text}
    """
    
    try:
        client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content
        # Clean up if LLM returns markdown code blocks
        content = content.replace("```json", "").replace("```", "").strip()
        print(f"✅ Extracted JSON: {content}")
        return json.loads(content)
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return {
            "title": "Error Event",
            "date": "2024-01-01",
            "location": "Error Land",
            "description": "Failed to extract"
        }

# 3. Embed and store in Qdrant
def store_in_qdrant(event_data):
    print("ww Storing in Qdrant...")
    try:
        client = QdrantClient(":memory:")  # In-memory for PoC
        
        # Create collection
        client.create_collection(
            collection_name="events",
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
        )
        
        # Get embedding
        openai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        text_to_embed = f"{event_data.get('title', '')} {event_data.get('description', '')}"
        
        embedding_resp = openai_client.embeddings.create(
            input=text_to_embed,
            model="text-embedding-ada-002"
        )
        embedding = embedding_resp.data[0].embedding
        
        # Upsert
        client.upsert(
            collection_name="events",
            points=[
                PointStruct(
                    id=1,
                    vector=embedding,
                    payload=event_data
                )
            ]
        )
        print("✅ Stored vector in Qdrant")
        return client
    except Exception as e:
        print(f"❌ Qdrant Error: {e}")
        return None

# 4. Search
def search_events(client, query):
    print(f"🔍 Searching for: '{query}'...")
    if not client:
        return []
        
    try:
        openai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        embedding_resp = openai_client.embeddings.create(
            input=query,
            model="text-embedding-ada-002"
        )
        query_embedding = embedding_resp.data[0].embedding
        
        results = client.search(
            collection_name="events",
            query_vector=query_embedding,
            limit=5
        )
        return results
    except Exception as e:
        print(f"❌ Search Error: {e}")
        return []

# Run PoC
if __name__ == "__main__":
    print("🚀 FeedPrism PoC Starting...")
    
    # 1. Fetch
    email_text = fetch_sample_email()
    
    # 2. Extract
    event = extract_event(email_text)
    
    # 3. Store
    client = store_in_qdrant(event)
    
    # 4. Search
    results = search_events(client, "upcoming AI events")
    
    print("\n📊 Search Results:")
    for res in results:
        print(f"- Score: {res.score:.4f} | Title: {res.payload.get('title')}")
    
    print("\n🎉 PoC Complete!")
