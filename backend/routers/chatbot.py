from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import re
import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from database import get_db
from models import User, Content, Interaction
from schemas import ChatMessage, ChatResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/chatbot", tags=["EduBot"])

# ─── Expanded Knowledge Base for RAG-style responses ───
INSTITUTIONAL_KNOWLEDGE = {
    "library": {
        "hours": "The main library is open Monday-Friday 8:00 AM - 10:00 PM, Saturday 9:00 AM - 6:00 PM. During finals week, hours extend to midnight. Sunday hours are 12:00 PM - 8:00 PM.",
        "services": "The library offers book lending (up to 10 books for 14 days), digital resources (IEEE, ACM, Springer, JSTOR), study rooms (bookable online), printing/scanning services, inter-library loans, and dedicated research assistance from subject librarians.",
        "location": "The main library is in Building A, 2nd floor. The digital media lab is in the basement of Building A. The science reading room is in Building D, 3rd floor.",
        "digital": "Access digital resources 24/7 through the library portal. Includes e-books, journals, databases (PubMed, Web of Science, Scopus), and research tools. VPN access available for off-campus use.",
    },
    "exams": {
        "schedule": "Midterm exams are typically in Week 7-8. Final exams are in Week 15-16. Check the academic calendar for exact dates. Supplementary exams are held 2 weeks after finals.",
        "preparation": "Study resources include past papers in the repository, tutoring sessions (book via the portal), study group formation tools, and practice exams. The Academic Success Center offers free tutoring in Math, Science, and Writing.",
        "policies": "Students must bring valid ID to all exams. No electronic devices unless specified by the instructor. Accommodations available through the Disability Services Office. Make-up exams require documented medical or emergency reasons.",
        "grading": "Standard grading scale: A (90-100), A- (87-89), B+ (83-86), B (80-82), B- (77-79), C+ (73-76), C (70-72), C- (67-69), D (60-66), F (<60). GPA calculated on 4.0 scale.",
    },
    "courses": {
        "registration": "Course registration opens 2 weeks before each semester. Priority registration for seniors, then juniors, sophomores, and freshmen. Use the student portal to browse, add, and drop courses.",
        "materials": "Course materials are available through the content repository. Faculty upload syllabi, lecture notes, assignments, and supplementary readings. Some courses use OpenStax free textbooks.",
        "prerequisites": "Check course prerequisites in the catalog before registering. Override forms available from department heads for students with equivalent experience.",
        "withdrawal": "Course withdrawal deadline is Week 10. Withdrawal after deadline requires dean's approval. Withdrawn courses appear as 'W' on transcript with no GPA impact.",
    },
    "facilities": {
        "labs": "Computer labs in Buildings B and D, open 7 AM - 11 PM. Book time slots through the facilities portal. Software available: MATLAB, AutoCAD, Visual Studio, Python/Anaconda, Adobe Creative Suite.",
        "wifi": "Campus WiFi: Connect to 'EduKno-Campus' using your student credentials. Guest WiFi available with temporary access code from the front desk. EduroAM also supported.",
        "cafeteria": "Main cafeteria in Building A: 7 AM - 8 PM. Coffee shop in Building C: 7 AM - 9 PM. Food truck area near the quad: 11 AM - 3 PM on weekdays.",
        "rooms": "Study rooms: Book through the facilities portal, available in the library (10 rooms, 2-8 people) and Building E (5 rooms, 4-12 people). Conference rooms require faculty/staff booking.",
    },
    "support": {
        "academic": "Academic advisors available by appointment through the Student Success Center in Building A. Walk-in hours: Mon-Wed 10 AM - 2 PM. Each student is assigned a dedicated advisor.",
        "technical": "IT support: email support@edukno.edu, call ext. 4000, or visit the help desk in Building B, Room 101 (Mon-Fri 8 AM - 6 PM). 24/7 online ticket system available.",
        "counseling": "Student counseling services are confidential and free. Call ext. 5555 or visit Building E, 2nd floor. Crisis hotline available 24/7. Group therapy sessions available weekly.",
        "financial": "Financial aid office in Building A, Room 200. Scholarship applications due March 1 for fall semester. Emergency financial assistance available through the Dean of Students office.",
    },
    "events": {
        "upcoming": "Check the events calendar on the dashboard. Regular events include: weekly research seminars (Thursdays), monthly guest lectures, annual hackathon (November), research symposium (April).",
        "clubs": "Over 50 student clubs: Tech Club, Debate Society, Art Collective, Sports clubs, Cultural organizations, Community service groups. Join through the student activities portal or during Activities Fair (first week of each semester).",
        "career": "Career fairs: Fall (September) and Spring (March). Resume workshops monthly. Mock interview sessions bi-weekly. Alumni networking events quarterly. Internship database updated weekly.",
    },
    "academics": {
        "programs": "50+ undergraduate programs and 30+ graduate programs across 8 schools. Popular programs: Computer Science, Business Administration, Engineering, Biology, Psychology.",
        "research": "Research opportunities available for undergraduates through the Research Experience Program (REP). Faculty research labs accept student assistants. Summer research fellowships with stipend available.",
        "honors": "Honors program requires 3.5+ GPA. Benefits include priority registration, dedicated study spaces, honors thesis opportunity, and cord at graduation.",
        "transfer": "Transfer credits evaluated by the Registrar's office. Up to 60 credits accepted from accredited institutions. Course equivalency guide available online.",
    },
    "housing": {
        "dormitories": "On-campus housing available in 6 residence halls. Single, double, and suite-style rooms. All rooms include WiFi, laundry facilities, and common areas. Housing deposit due April 1.",
        "offcampus": "Off-campus housing resources available through the Student Life Office. Approved housing list maintained with vetted landlords. Shuttle service connects major off-campus areas.",
    },
    "scholarships": {
        "merit": "Merit scholarships: Dean's List (3.5+ GPA per semester), Presidential Scholar (top 5% of class), Department Awards (by application). Renewable if GPA requirements maintained.",
        "needbased": "Need-based aid determined by FAFSA. Institutional grants cover up to full tuition for qualifying students. Work-study positions available across campus.",
    },
}

SUGGESTED_QUESTIONS = [
    "When is the library open during finals?",
    "How do I register for courses?",
    "Where can I find exam preparation resources?",
    "What study rooms are available?",
    "How do I submit an assignment?",
    "What are the grading policies?",
    "Where is the IT help desk?",
    "How do I join a student club?",
    "When are career fairs held?",
    "How do I access course materials?",
    "What digital resources does the library offer?",
    "Tell me about research opportunities",
    "What scholarships are available?",
    "How do I access campus WiFi?",
    "What are the computer lab hours?",
    "How do I get academic advising?",
    "What housing options are available?",
    "How do I apply for financial aid?",
]


# ─── TF-IDF based RAG engine ───
class RAGEngine:
    """TF-IDF based Retrieval-Augmented Generation engine."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),
            min_df=1,
        )
        self.documents: List[Dict[str, Any]] = []
        self.tfidf_matrix = None
        self._built = False

    def _build_corpus(self, db_contents: List[Content]):
        """Build document corpus from institutional knowledge + DB content."""
        self.documents = []

        # Add institutional knowledge as documents
        for topic, subtopics in INSTITUTIONAL_KNOWLEDGE.items():
            for subtopic, info in subtopics.items():
                self.documents.append({
                    "text": f"{topic} {subtopic}: {info}",
                    "source_type": "institutional",
                    "topic": f"{topic}/{subtopic}",
                    "content": info,
                    "title": f"{topic.title()} > {subtopic.title()}",
                })

        # Add DB content as documents
        for content in db_contents:
            text_parts = [content.title]
            if content.description:
                text_parts.append(content.description)
            if content.tags:
                text_parts.extend(content.tags)
            if content.category:
                text_parts.append(content.category)

            self.documents.append({
                "text": " ".join(text_parts),
                "source_type": "content",
                "title": content.title,
                "content_type": content.content_type,
                "content_id": content.id,
                "content": content.description or content.title,
            })

        # Fit TF-IDF
        if self.documents:
            corpus = [d["text"] for d in self.documents]
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
            self._built = True

    def retrieve(self, query: str, db: Session, top_k: int = 5) -> List[Dict]:
        """Retrieve most relevant documents for the query."""
        # Rebuild corpus each time to include latest content
        db_contents = db.query(Content).filter(Content.is_active == True).all()
        self._build_corpus(db_contents)

        if not self._built or not self.documents:
            return []

        # Transform query
        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Get top-K indices
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = similarities[idx]
            if score > 0.01:  # Minimum relevance threshold
                doc = self.documents[idx].copy()
                doc["relevance_score"] = float(score)
                results.append(doc)

        return results


# Singleton RAG engine
rag_engine = RAGEngine()


def generate_response(
    query: str,
    retrieved_docs: List[Dict],
    user_role: str,
    history: List[Dict] = None,
) -> str:
    """Generate a contextual response based on retrieved documents."""
    if not retrieved_docs:
        return (
            f"I appreciate your question! While I don't have specific information about that topic, "
            f"I'd recommend checking the content repository for relevant resources or contacting "
            f"the appropriate department directly. As a {user_role}, you can also reach out to "
            f"your advisor for personalized guidance.\n\n"
            f"Try asking about:\n"
            f"• Library services and hours\n"
            f"• Course registration and materials\n"
            f"• Exam schedules and preparation\n"
            f"• Campus facilities and WiFi\n"
            f"• Academic support and advising"
        )

    response_parts = []

    # Separate institutional vs content sources
    institutional = [d for d in retrieved_docs if d["source_type"] == "institutional"]
    content_docs = [d for d in retrieved_docs if d["source_type"] == "content"]

    # Build answer from institutional knowledge
    if institutional:
        # Use the most relevant institutional source as the primary answer
        primary = institutional[0]
        response_parts.append(primary["content"])

        # Add supplementary info from other institutional sources
        if len(institutional) > 1:
            response_parts.append("\n\n**Additional Information:**")
            for doc in institutional[1:3]:
                response_parts.append(f"\n• {doc['content']}")

    # Add content recommendations
    if content_docs:
        response_parts.append(
            "\n\n📚 **Relevant Resources in Our Knowledge Base:**"
        )
        for doc in content_docs[:4]:
            ctype = doc.get("content_type", "resource")
            emoji = {"document": "📄", "video": "🎬", "article": "📰", "course": "🎓", "presentation": "📊"}.get(ctype, "📄")
            response_parts.append(f"\n{emoji} **{doc['title']}** ({ctype})")

    # Add context-aware tips based on role
    role_tips = {
        "student": "\n\n💡 *Tip: Check your personalized recommendations for more study resources! You can also bookmark resources for quick access later.*",
        "faculty": "\n\n💡 *Tip: You can upload additional materials for your students through the content manager. Your contributions earn reputation points!*",
        "staff": "\n\n💡 *Tip: For administrative queries, check the staff resources section or contact the appropriate department.*",
        "admin": "\n\n💡 *Tip: You have access to all administrative tools, analytics dashboards, and content management features.*",
        "alumni": "\n\n💡 *Tip: As an alumnus, you can access career resources, contribute knowledge, and connect with current students.*",
        "parent": "\n\n💡 *Tip: You can track your student's academic progress and access relevant institutional information.*",
    }
    response_parts.append(role_tips.get(user_role, ""))

    return "".join(response_parts)


@router.post("/chat", response_model=ChatResponse)
def chat(
    message: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = message.message
    history = message.history or []

    # Build context-enriched query using conversation history
    context_query = query
    if history:
        recent_context = " ".join([
            m.get("text", "") for m in history[-3:]
            if m.get("sender") == "user"
        ])
        context_query = f"{recent_context} {query}"

    # Retrieve relevant documents using TF-IDF RAG
    retrieved_docs = rag_engine.retrieve(context_query, db, top_k=6)

    # Generate response
    response = generate_response(query, retrieved_docs, current_user.role, history)

    # Format sources for citation
    sources = []
    seen_titles = set()
    for doc in retrieved_docs:
        title = doc.get("title", "Unknown")
        if title in seen_titles:
            continue
        seen_titles.add(title)

        source_entry = {"title": title, "type": doc["source_type"]}
        if doc["source_type"] == "content":
            source_entry["id"] = doc.get("content_id", "")
            source_entry["type"] = doc.get("content_type", "resource")
        sources.append(source_entry)

    # Track interaction
    interaction = Interaction(
        user_id=current_user.id,
        action="chat",
        query=query,
        context={"sources_count": len(sources), "history_length": len(history)},
    )
    db.add(interaction)
    db.commit()

    # Suggested follow-up questions (context-aware)
    remaining = [q for q in SUGGESTED_QUESTIONS if q.lower() != query.lower()]
    # Try to pick contextually relevant suggestions
    query_terms = set(query.lower().split())
    scored_suggestions = []
    for q in remaining:
        score = sum(1 for w in query_terms if w in q.lower())
        scored_suggestions.append((q, score))
    scored_suggestions.sort(key=lambda x: x[1], reverse=True)

    # Mix: 1-2 related + 1-2 random
    related = [q for q, s in scored_suggestions if s > 0][:2]
    unrelated = [q for q, s in scored_suggestions if s == 0]
    random_picks = random.sample(unrelated, min(2, len(unrelated))) if unrelated else []
    suggested = (related + random_picks)[:4]

    return ChatResponse(
        response=response,
        sources=sources,
        suggested_questions=suggested,
    )


@router.get("/suggestions", response_model=List[str])
def get_suggestions():
    """Get suggested questions for the chatbot."""
    return random.sample(SUGGESTED_QUESTIONS, min(6, len(SUGGESTED_QUESTIONS)))
