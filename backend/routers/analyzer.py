from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any
import os
import json
from groq import Groq
from routers.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/analyze", tags=["AI Analyzer"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except:
        pass

@router.post("/document")
async def analyze_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a PDF document, extract text, and use Groq Llama-3 to generate
    a summary, key concepts, and flashcards.
    """
    if not client:
        raise HTTPException(status_code=503, detail="Groq API key not configured. LLM analysis unavailable.")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF not installed on server.")

    # Read and extract text
    try:
        content = await file.read()
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        # Extract from first 10 pages only to avoid token limits
        for i in range(min(10, len(doc))):
            text += doc[i].get_text() + "\n"
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be scanned/image-based.")
        
        # Truncate text to roughly 15000 chars to stay safe within Llama-3 8k context window
        text = text[:15000]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    prompt = f"""You are an expert AI tutor. Analyze the following document text and provide:
1. A concise, high-level summary (2-3 paragraphs).
2. A list of 5-7 key concepts explained simply.
3. 5 Anki-style flashcards with a 'front' (question) and 'back' (answer).

Output the response strictly as a JSON object with this structure:
{{
  "summary": "...",
  "key_concepts": ["concept 1", "concept 2", ...],
  "flashcards": [
    {{"front": "...", "back": "..."}}
  ]
}}

DOCUMENT TEXT:
{text}
"""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2048
        )
        
        result = json.loads(response.choices[0].message.content)
        return {
            "filename": file.filename,
            "analysis": result
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")
