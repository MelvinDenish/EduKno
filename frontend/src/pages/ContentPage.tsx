import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentAPI, recommendAPI } from '../services/api';
import {
    Eye, ThumbsUp, Download, ArrowLeft, Calendar, User, Tag,
    FileText, Video, BookMarked, BookOpen, Presentation, Clock,
    Bookmark, ExternalLink
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
    document: FileText, video: Video, article: BookMarked, course: BookOpen, presentation: Presentation,
};

export default function ContentPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [content, setContent] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (id) loadContent(id);
    }, [id]);

    const loadContent = async (contentId: string) => {
        setLoading(true);
        try {
            const [contentRes, relatedRes, bookmarkRes] = await Promise.all([
                contentAPI.get(contentId),
                recommendAPI.getTrending(4),
                contentAPI.bookmarkStatus(contentId),
            ]);
            setContent(contentRes.data);
            setRelated(relatedRes.data.recommendations.filter((r: any) => r.id !== contentId).slice(0, 3));
            setIsBookmarked(bookmarkRes.data.bookmarked);
            // Record view
            contentAPI.recordView(contentId);
        } catch (err) {
            console.error('Content load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpvote = async () => {
        if (!id) return;
        try {
            const res = await contentAPI.upvote(id);
            setContent({ ...content, upvotes: res.data.upvotes });
        } catch (err) {
            console.error('Upvote error:', err);
        }
    };

    const handleDownload = async () => {
        if (!id) return;
        setDownloading(true);
        try {
            const res = await contentAPI.download(id);
            setContent({ ...content, downloads: res.data.downloads });
            if (res.data.file_url) {
                window.open(res.data.file_url, '_blank');
            }
        } catch (err) {
            console.error('Download error:', err);
        } finally {
            setDownloading(false);
        }
    };

    const handleBookmark = async () => {
        if (!id) return;
        try {
            if (isBookmarked) {
                await contentAPI.unbookmark(id);
                setIsBookmarked(false);
            } else {
                await contentAPI.bookmark(id);
                setIsBookmarked(true);
            }
        } catch (err) {
            console.error('Bookmark error:', err);
        }
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="skeleton" style={{ height: 32, width: 100, marginBottom: 24 }}></div>
                <div className="skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 16 }}></div>
                <div className="skeleton" style={{ height: 400, borderRadius: 12 }}></div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Content not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>
        );
    }

    const Icon = TYPE_ICONS[content.content_type] || FileText;

    return (
        <div className="page-container animate-fade-in">
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
                <ArrowLeft size={16} /> Back
            </button>

            <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
                {/* Main Content */}
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: 'rgba(99, 102, 241, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon size={24} color="#6366f1" />
                            </div>
                            <div>
                                <div className="badge badge-primary" style={{ marginBottom: 4 }}>{content.content_type}</div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{content.source_system}</span>
                            </div>
                        </div>

                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>
                            {content.title}
                        </h1>

                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
                            {content.description}
                        </p>

                        {/* Tags */}
                        {content.tags?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {content.tags.map((tag: string) => (
                                    <span key={tag} className="tag">
                                        <Tag size={10} /> {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={handleUpvote}>
                                <ThumbsUp size={16} /> Upvote ({content.upvotes})
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownload}
                                disabled={downloading}
                            >
                                {content.file_url ? (
                                    <><ExternalLink size={16} /> {downloading ? 'Opening...' : 'Open Resource'}</>
                                ) : (
                                    <><Download size={16} /> Download ({content.downloads})</>
                                )}
                            </button>
                            <button
                                className={`btn ${isBookmarked ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={handleBookmark}
                                style={isBookmarked ? {} : { border: '1px solid var(--border-color)' }}
                            >
                                <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                            </button>
                        </div>
                    </div>

                    {/* Related Content */}
                    {related.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Related Resources</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {related.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="content-card"
                                        onClick={() => navigate(`/content/${item.id}`)}
                                        style={{ padding: 'var(--space-4)' }}
                                    >
                                        <h4 className="card-title" style={{ fontSize: '0.875rem' }}>{item.title}</h4>
                                        <div className="card-meta">
                                            <span>{item.content_type}</span>
                                            <span><Eye size={12} /> {item.views}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16 }}>Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Eye size={14} /> Views
                                </span>
                                <strong>{content.views}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ThumbsUp size={14} /> Upvotes
                                </span>
                                <strong>{content.upvotes}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Download size={14} /> Downloads
                                </span>
                                <strong>{content.downloads}</strong>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={14} /> Author
                                </span>
                                <strong>{content.author_name || 'Unknown'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Tag size={14} /> Category
                                </span>
                                <strong>{content.category}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={14} /> Version
                                </span>
                                <strong>v{content.version}</strong>
                            </div>
                            {content.created_at && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={14} /> Created
                                    </span>
                                    <strong>{new Date(content.created_at).toLocaleDateString()}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resource Link */}
                    {content.file_url && (
                        <div className="card">
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12 }}>📎 Resource Link</h3>
                            <a
                                href={content.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: '#6366f1',
                                    fontSize: '0.8rem',
                                    wordBreak: 'break-all',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                <ExternalLink size={14} />
                                Open external resource
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
