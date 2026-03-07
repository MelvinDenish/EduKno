from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from collections import Counter

from database import get_db
from models import User, Content, Interaction, SearchLog
from schemas import (
    AnalyticsOverview, ContentAnalytics, UserAnalytics, SearchAnalytics, ContentResponse
)
from routers.content import content_to_response

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def get_overview(db: Session = Depends(get_db)):
    """Get high-level analytics overview."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(func.count(User.id)).scalar()
    total_content = db.query(func.count(Content.id)).filter(Content.is_active == True).scalar()
    total_searches = db.query(func.count(SearchLog.id)).scalar()
    total_interactions = db.query(func.count(Interaction.id)).scalar()

    active_today = (
        db.query(func.count(func.distinct(Interaction.user_id)))
        .filter(Interaction.timestamp >= today_start)
        .scalar()
    )

    uploaded_today = (
        db.query(func.count(Content.id))
        .filter(Content.created_at >= today_start)
        .scalar()
    )

    return AnalyticsOverview(
        total_users=total_users,
        total_content=total_content,
        total_searches=total_searches,
        total_interactions=total_interactions,
        active_users_today=active_today,
        content_uploaded_today=uploaded_today,
    )


@router.get("/content", response_model=ContentAnalytics)
def get_content_analytics(db: Session = Depends(get_db)):
    """Get content-related analytics."""
    # By type
    by_type_raw = (
        db.query(Content.content_type, func.count(Content.id))
        .filter(Content.is_active == True)
        .group_by(Content.content_type)
        .all()
    )
    by_type = {t: c for t, c in by_type_raw}

    # By category
    by_cat_raw = (
        db.query(Content.category, func.count(Content.id))
        .filter(Content.is_active == True)
        .group_by(Content.category)
        .all()
    )
    by_category = {t: c for t, c in by_cat_raw}

    # Popular content (top 10)
    popular = (
        db.query(Content)
        .filter(Content.is_active == True)
        .order_by((Content.views + Content.upvotes * 3).desc())
        .limit(10)
        .all()
    )

    # Trending tags
    all_content = db.query(Content.tags).filter(Content.is_active == True).all()
    tag_counter = Counter()
    for (tags,) in all_content:
        if tags:
            for tag in tags:
                tag_counter[tag] += 1
    trending_tags = [
        {"tag": tag, "count": count}
        for tag, count in tag_counter.most_common(20)
    ]

    return ContentAnalytics(
        by_type=by_type,
        by_category=by_category,
        popular_content=[content_to_response(c, db) for c in popular],
        trending_tags=trending_tags,
    )


@router.get("/users", response_model=UserAnalytics)
def get_user_analytics(db: Session = Depends(get_db)):
    """Get user-related analytics."""
    # By role
    by_role_raw = (
        db.query(User.role, func.count(User.id))
        .group_by(User.role)
        .all()
    )
    by_role = {r: c for r, c in by_role_raw}

    # By department
    by_dept_raw = (
        db.query(User.department, func.count(User.id))
        .group_by(User.department)
        .all()
    )
    by_department = {d: c for d, c in by_dept_raw}

    # Top contributors
    top_users = (
        db.query(User)
        .filter(User.is_active == True)
        .order_by(User.reputation_score.desc())
        .limit(10)
        .all()
    )
    top_contributors = [
        {
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "reputation": u.reputation_score,
        }
        for u in top_users
    ]

    # Activity timeline (last 7 days)
    now = datetime.utcnow()
    activity_timeline = []
    for i in range(7):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = (
            db.query(func.count(Interaction.id))
            .filter(Interaction.timestamp >= day_start, Interaction.timestamp < day_end)
            .scalar()
        )
        activity_timeline.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count,
        })
    activity_timeline.reverse()

    return UserAnalytics(
        by_role=by_role,
        by_department=by_department,
        top_contributors=top_contributors,
        activity_timeline=activity_timeline,
    )


@router.get("/search", response_model=SearchAnalytics)
def get_search_analytics(db: Session = Depends(get_db)):
    """Get search-related analytics."""
    # Popular queries
    popular_raw = (
        db.query(SearchLog.query, func.count(SearchLog.id).label("cnt"))
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(20)
        .all()
    )
    popular_queries = [{"query": q, "count": c} for q, c in popular_raw]

    # Search volume (last 7 days)
    now = datetime.utcnow()
    search_volume = []
    for i in range(7):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = (
            db.query(func.count(SearchLog.id))
            .filter(SearchLog.timestamp >= day_start, SearchLog.timestamp < day_end)
            .scalar()
        )
        search_volume.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count,
        })
    search_volume.reverse()

    # Zero result queries
    zero_results = (
        db.query(SearchLog.query)
        .filter(SearchLog.results_count == 0)
        .distinct()
        .limit(10)
        .all()
    )

    return SearchAnalytics(
        popular_queries=popular_queries,
        search_volume=search_volume,
        zero_result_queries=[q[0] for q in zero_results],
    )
