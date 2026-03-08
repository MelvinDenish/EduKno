import { useState, useEffect, useRef } from 'react';
import { chatbotAPI } from '../services/api';
import { Send, Bot, User, BookOpen, RotateCcw, Sparkles, Zap, ChevronDown, ChevronUp, CheckCircle, XCircle, RotateCw } from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    sources?: any[];
    suggested?: string[];
    richContent?: any;
    timestamp: Date;
}

const COMMAND_HINTS = [
    { cmd: '/quiz', desc: 'Generate a quiz', example: '/quiz data structures', color: '#f59e0b' },
    { cmd: '/summary', desc: 'Summarize a topic', example: '/summary machine learning', color: '#10b981' },
    { cmd: '/flashcards', desc: 'Create flashcards', example: '/flashcards algorithms', color: '#6366f1' },
    { cmd: '/notes', desc: 'Generate study notes', example: '/notes calculus', color: '#0ea5e9' },
];

// ─── Quiz Component ───
function QuizWidget({ data }: { data: any }) {
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    const questions = data?.questions || [];

    const selectAnswer = (qIdx: number, optIdx: number) => {
        if (revealed[qIdx]) return;
        setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    };

    const revealAnswer = (qIdx: number) => {
        setRevealed(prev => ({ ...prev, [qIdx]: true }));
    };

    const score = Object.entries(revealed).filter(([qIdx]) => {
        const qi = parseInt(qIdx);
        return answers[qi] === questions[qi]?.correct;
    }).length;

    const totalRevealed = Object.keys(revealed).length;

    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <span style={{ fontSize: '1.2rem' }}>📝</span>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>{data?.title || 'Quiz'}</span>
                {totalRevealed > 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: score === totalRevealed ? '#10b981' : 'var(--text-secondary)' }}>
                        Score: {score}/{totalRevealed}
                    </span>
                )}
            </div>

            {questions.map((q: any, qIdx: number) => (
                <div key={qIdx} style={{
                    marginBottom: 16, padding: 16, borderRadius: 12,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                }}>
                    <p style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.95rem' }}>
                        <span style={{ color: '#f59e0b', marginRight: 8 }}>Q{qIdx + 1}.</span>
                        {q.question}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(q.options || []).map((opt: string, optIdx: number) => {
                            const isSelected = answers[qIdx] === optIdx;
                            const isCorrect = q.correct === optIdx;
                            const isRevealed = revealed[qIdx];
                            let bg = 'var(--bg-card)';
                            let border = '1px solid var(--border-color)';
                            if (isRevealed && isCorrect) { bg = 'rgba(16, 185, 129, 0.15)'; border = '1px solid #10b981'; }
                            else if (isRevealed && isSelected && !isCorrect) { bg = 'rgba(239, 68, 68, 0.15)'; border = '1px solid #ef4444'; }
                            else if (isSelected) { bg = 'rgba(99, 102, 241, 0.15)'; border = '1px solid #6366f1'; }
                            return (
                                <button key={optIdx} onClick={() => selectAnswer(qIdx, optIdx)} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                    borderRadius: 8, background: bg, border, cursor: isRevealed ? 'default' : 'pointer',
                                    textAlign: 'left', color: 'var(--text-primary)', fontSize: '0.88rem', transition: 'all 0.2s',
                                }}>
                                    <span style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                        {isRevealed && isCorrect ? <CheckCircle size={14} color="#10b981" /> : isRevealed && isSelected ? <XCircle size={14} color="#ef4444" /> : String.fromCharCode(65 + optIdx)}
                                    </span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                    {!revealed[qIdx] && answers[qIdx] !== undefined && (
                        <button onClick={() => revealAnswer(qIdx)} style={{
                            marginTop: 10, padding: '6px 16px', borderRadius: 6, background: '#f59e0b',
                            color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                        }}>
                            Check Answer
                        </button>
                    )}
                    {revealed[qIdx] && q.explanation && (
                        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            💡 {q.explanation}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Flashcard Widget ───
function FlashcardsWidget({ data }: { data: any }) {
    const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
    const cards = data?.cards || [];

    const toggleFlip = (idx: number) => {
        setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <span style={{ fontSize: '1.2rem' }}>🎴</span>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>{data?.deck_name || 'Flashcards'} Deck</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {data?.saved_count || cards.length} cards • saved to SRS
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {cards.map((card: any, idx: number) => {
                    const isFlipped = flippedCards[idx];
                    return (
                        <div key={idx} onClick={() => toggleFlip(idx)} style={{
                            cursor: 'pointer', perspective: 600, height: 160,
                        }}>
                            <div style={{
                                width: '100%', height: '100%', position: 'relative',
                                transition: 'transform 0.5s ease', transformStyle: 'preserve-3d',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            }}>
                                {/* Front */}
                                <div style={{
                                    position: 'absolute', width: '100%', height: '100%',
                                    backfaceVisibility: 'hidden', borderRadius: 12, padding: 16,
                                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                    color: 'white', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                                    boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                                }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4 }}>{card.front}</p>
                                    <span style={{ position: 'absolute', bottom: 8, fontSize: '0.7rem', opacity: 0.7 }}>tap to flip</span>
                                </div>
                                {/* Back */}
                                <div style={{
                                    position: 'absolute', width: '100%', height: '100%',
                                    backfaceVisibility: 'hidden', borderRadius: 12, padding: 16,
                                    background: 'var(--bg-card)', border: '2px solid #6366f1',
                                    transform: 'rotateY(180deg)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                                    boxShadow: '0 4px 15px rgba(99,102,241,0.15)',
                                }}>
                                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>{card.back}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: "Hi! I'm **EduBot** 🤖 — your AI-powered study assistant.\n\nI use **RAG (Retrieval-Augmented Generation)** to find the most relevant info from our knowledge base and answer your questions intelligently.\n\n**🎯 Try these commands:**\n• `/quiz <topic>` — Generate an interactive quiz\n• `/summary <topic>` — Get a concise summary\n• `/flashcards <topic>` — Create SRS flashcards\n• `/notes <topic>` — Generate study notes\n\nOr just ask me anything!",
            sender: 'bot',
            suggested: [
                '/quiz data structures',
                '/flashcards algorithms',
                'What are the library hours?',
                'Help me study for algorithms',
            ],
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const clearChat = () => {
        setMessages([{
            id: Date.now(),
            text: "Chat cleared! How can I help?\n\nRemember: `/quiz`, `/summary`, `/flashcards`, `/notes` + topic",
            sender: 'bot',
            suggested: ['/quiz python', '/summary databases', '/flashcards networking', '/notes physics'],
            timestamp: new Date(),
        }]);
    };

    const sendMessage = async (text?: string) => {
        const msg = text || input;
        if (!msg.trim() || loading) return;

        const userMsg: Message = { id: Date.now(), text: msg, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setShowCommands(false);
        setLoading(true);

        try {
            const history = messages.filter(m => m.id !== 0).slice(-6).map(m => ({ text: m.text, sender: m.sender }));
            const res = await chatbotAPI.chat(msg, {}, history);
            const botMsg: Message = {
                id: Date.now() + 1,
                text: res.data.response,
                sender: 'bot',
                sources: res.data.sources,
                suggested: res.data.suggested_questions,
                richContent: res.data.rich_content,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Sorry, I encountered an error. Please try again.",
                sender: 'bot',
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (val: string) => {
        setInput(val);
        setShowCommands(val.startsWith('/') && val.length < 15);
    };

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('### ')) return <h4 key={i} style={{ fontWeight: 700, marginTop: 8 }}>{line.slice(4)}</h4>;
            if (line.startsWith('## ')) return <h3 key={i} style={{ fontWeight: 700, marginTop: 8, fontSize: '1.05rem' }}>{line.slice(3)}</h3>;
            if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* '))
                return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>{renderInline(line)}</div>;
            if (/^\d+\.\s/.test(line))
                return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>{renderInline(line)}</div>;
            if (line.trim() === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />;
            if (line.trim() === '') return <br key={i} />;
            return <span key={i}>{renderInline(line)}<br /></span>;
        });
    };

    const renderInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) return <em key={i}>{part.slice(1, -1)}</em>;
            if (part.startsWith('`') && part.endsWith('`'))
                return <code key={i} style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 4, fontSize: '0.85em' }}>{part.slice(1, -1)}</code>;
            return part;
        });
    };

    const renderRichContent = (richContent: any) => {
        if (!richContent) return null;
        if (richContent.type === 'quiz') return <QuizWidget data={richContent.data} />;
        if (richContent.type === 'flashcards') return <FlashcardsWidget data={richContent.data} />;
        return null;
    };

    const renderMessage = (msg: Message) => (
        <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {msg.sender === 'bot' ? <Bot size={16} style={{ color: '#6366f1' }} /> : <User size={16} />}
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                    {msg.sender === 'bot' ? 'EduBot' : 'You'} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div style={{ lineHeight: 1.7 }}>{renderMarkdown(msg.text)}</div>

            {/* Rich Content (Quiz / Flashcards) */}
            {msg.richContent && renderRichContent(msg.richContent)}

            {/* Collapsible Sources */}
            {msg.sources && msg.sources.length > 0 && (
                <SourcesCollapsible sources={msg.sources} />
            )}

            {msg.suggested && msg.suggested.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {msg.suggested.map((q: string) => (
                        <button key={q} className="chat-suggestion-btn" onClick={() => sendMessage(q)}>
                            {q.startsWith('/') ? <Zap size={10} /> : null} {q}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1>🤖 EduBot</h1>
                        <p>AI study assistant with RAG • Quiz • Summary • Flashcards • Notes generation</p>
                    </div>
                    <button className="btn btn-secondary" onClick={clearChat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RotateCcw size={16} /> Clear
                    </button>
                </div>
            </div>

            {/* Command hints bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {COMMAND_HINTS.map(h => (
                    <button
                        key={h.cmd}
                        style={{
                            cursor: 'pointer', border: `1px solid ${h.color}30`, borderRadius: 20,
                            padding: '5px 14px', fontSize: '0.8rem', background: `${h.color}15`,
                            color: h.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                        }}
                        onClick={() => { setInput(h.example); }}
                    >
                        <Sparkles size={10} /> {h.cmd}
                    </button>
                ))}
            </div>

            <div className="card chat-container">
                <div className="chat-messages">
                    {messages.map(renderMessage)}
                    {loading && (
                        <div className="chat-bubble bot">
                            <div className="typing-indicator"><span></span><span></span><span></span></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Command autocomplete dropdown */}
                {showCommands && (
                    <div style={{
                        position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        borderRadius: 8, marginBottom: 4, overflow: 'hidden',
                    }}>
                        {COMMAND_HINTS.filter(h => h.cmd.startsWith(input.split(' ')[0])).map(h => (
                            <button key={h.cmd} style={{
                                display: 'block', width: '100%', padding: '8px 12px', border: 'none',
                                background: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                            }} onClick={() => { setInput(h.example); setShowCommands(false); }}>
                                <strong>{h.cmd}</strong> — {h.desc} <span style={{ color: 'var(--text-tertiary)' }}>e.g. {h.example}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="chat-input-area">
                    <input
                        className="input"
                        type="text"
                        placeholder="Ask anything or use /quiz /summary /flashcards /notes..."
                        value={input}
                        onChange={e => handleInputChange(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        disabled={loading}
                    />
                    <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Collapsible Sources Widget ───
function SourcesCollapsible({ sources }: { sources: any[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ marginTop: 8 }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem',
                    color: 'var(--text-tertiary)', cursor: 'pointer', background: 'none',
                    border: 'none', padding: '2px 0',
                }}
            >
                <BookOpen size={11} />
                {sources.length} source{sources.length !== 1 ? 's' : ''}
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {open && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {sources.map((s: any, i: number) => (
                        <span key={i} className="tag" style={{ fontSize: '0.7rem' }}>{s.title} ({s.type})</span>
                    ))}
                </div>
            )}
        </div>
    );
}
