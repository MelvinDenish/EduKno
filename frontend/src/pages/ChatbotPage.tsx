import { useState, useEffect, useRef } from 'react';
import { chatbotAPI } from '../services/api';
import { Send, Bot, User, BookOpen, Sparkles, RotateCcw } from 'lucide-react';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    sources?: any[];
    suggested?: string[];
    timestamp: Date;
}

export default function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            text: "Hi! I'm **EduBot** 🤖, your AI-powered knowledge assistant. I use TF-IDF semantic search to find the most relevant information from our knowledge base and content repository.\n\nI can help you with:\n• 📚 Course materials and registration\n• 📖 Library services and hours\n• 📝 Exam schedules and prep resources\n• 🏫 Campus facilities and WiFi\n• 💬 Academic advising and support\n• 🎓 Scholarships and financial aid\n\nHow can I help you today?",
            sender: 'bot',
            suggested: [
                'When is the library open during finals?',
                'Tell me about machine learning courses',
                'How do I register for courses?',
                'What scholarships are available?',
            ],
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSuggestions();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSuggestions = async () => {
        try {
            const res = await chatbotAPI.suggestions();
            setSuggestions(res.data);
        } catch (err) { }
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now(),
            text: "Chat cleared! How can I help you?",
            sender: 'bot',
            suggested: suggestions.slice(0, 4),
            timestamp: new Date(),
        }]);
    };

    const sendMessage = async (text?: string) => {
        const msg = text || input;
        if (!msg.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now(),
            text: msg,
            sender: 'user',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Build conversation history for context
            const history = messages
                .filter(m => m.id !== 0)
                .slice(-6)
                .map(m => ({
                    text: m.text,
                    sender: m.sender,
                }));

            const res = await chatbotAPI.chat(msg, {}, history);
            const botMsg: Message = {
                id: Date.now() + 1,
                text: res.data.response,
                sender: 'bot',
                sources: res.data.sources,
                suggested: res.data.suggested_questions,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (err) {
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: "Sorry, I'm having trouble processing your request. Please try again.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const renderMessage = (msg: Message) => {
        // Enhanced markdown rendering
        const renderText = (text: string) => {
            const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                    return <em key={i}>{part.slice(1, -1)}</em>;
                }
                // Handle newlines and bullets
                return part.split('\n').map((line, j) => (
                    <span key={`${i}-${j}`}>
                        {j > 0 && <br />}
                        {line.startsWith('• ') ? (
                            <span style={{ paddingLeft: 8 }}>{line}</span>
                        ) : line}
                    </span>
                ));
            });
        };

        return (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {msg.sender === 'bot' ? (
                        <Bot size={16} style={{ color: '#6366f1' }} />
                    ) : (
                        <User size={16} />
                    )}
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        {msg.sender === 'bot' ? 'EduBot' : 'You'} · {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div>{renderText(msg.text)}</div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <BookOpen size={12} /> Sources ({msg.sources.length}):
                        </span>
                        {msg.sources.map((s: any, i: number) => (
                            <span key={i} className="tag" style={{ marginRight: 4, marginBottom: 2 }}>
                                {s.title} ({s.type})
                            </span>
                        ))}
                    </div>
                )}

                {/* Suggested follow-ups */}
                {msg.suggested && msg.suggested.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {msg.suggested.map((q: string) => (
                            <button
                                key={q}
                                className="chat-suggestion-btn"
                                onClick={() => sendMessage(q)}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1>🤖 EduBot</h1>
                        <p>AI-powered knowledge assistant using TF-IDF Retrieval-Augmented Generation</p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={clearChat}
                        title="Clear chat history"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <RotateCcw size={16} /> Clear
                    </button>
                </div>
            </div>

            <div className="card chat-container">
                <div className="chat-messages">
                    {messages.map(renderMessage)}
                    {loading && (
                        <div className="chat-bubble bot">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        className="input"
                        type="text"
                        placeholder="Ask EduBot anything about your institution..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
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
