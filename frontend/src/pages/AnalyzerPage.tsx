import { useState, useRef } from 'react';
import { analyzerAPI, flashcardsAPI } from '../services/api';
import { UploadCloud, FileText, Loader, CheckCircle, BrainCircuit, Activity, BookOpen } from 'lucide-react';

export default function AnalyzerPage() {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [savingFlashcards, setSavingFlashcards] = useState(false);
    const [savedFlashcards, setSavedFlashcards] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            if (selected.type !== 'application/pdf') {
                setError('Please upload a PDF file.');
                setFile(null);
                return;
            }
            setFile(selected);
            setError('');
            setResult(null);
            setSavedFlashcards(false);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await analyzerAPI.analyzeDocument(formData);
            setResult(res.data.analysis);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to analyze document.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSaveFlashcards = async () => {
        if (!result || !result.flashcards) return;
        setSavingFlashcards(true);
        try {
            const deckName = file ? file.name.replace('.pdf', '') : "AI Generated";
            for (const card of result.flashcards) {
                await flashcardsAPI.create({
                    deck_name: deckName,
                    front: card.front,
                    back: card.back
                });
            }
            setSavedFlashcards(true);
        } catch (err) {
            console.error('Error saving flashcards:', err);
            alert('Failed to save flashcards');
        } finally {
            setSavingFlashcards(false);
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrainCircuit size={32} color="var(--primary-color)" />
                    AI Document Analyzer
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Upload a PDF document and instantly generate summaries, key concepts, and flashcards using Groq Llama-3.
                </p>
            </div>

            <div className="grid-2">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: 12,
                            padding: 48,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: file ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                            borderColor: file ? 'var(--primary-color)' : 'var(--border-color)'
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        {file ? (
                            <>
                                <FileText size={48} color="var(--primary-color)" style={{ margin: '0 auto 16px' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</h3>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                                </p>
                            </>
                        ) : (
                            <>
                                <UploadCloud size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 16px' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Click to upload PDF</h3>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>
                                    Max file size: 10MB
                                </p>
                            </>
                        )}
                    </div>

                    {error && (
                        <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 8, fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                        disabled={!file || analyzing}
                        onClick={handleAnalyze}
                    >
                        {analyzing ? (
                            <><Loader className="animate-spin" size={20} /> Analyzing with Groq...</>
                        ) : (
                            <><BrainCircuit size={20} /> Generate Study Materials</>
                        )}
                    </button>
                </div>

                <div>
                    {analyzing && (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                            <Loader className="animate-spin" size={48} color="var(--primary-color)" style={{ marginBottom: 24 }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Extracting Knowledge</h3>
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Llama-3 is reading your document, extracting key concepts, and building flashcards...
                            </p>
                        </div>
                    )}

                    {!analyzing && result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 16 }}>
                                    <BookOpen size={20} color="var(--primary-color)" /> Summary
                                </h3>
                                <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>{result.summary}</p>
                            </div>

                            <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 16 }}>
                                    <Activity size={20} color="#10b981" /> Key Concepts
                                </h3>
                                <ul style={{ marginLeft: 20, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {result.key_concepts?.map((c: string, i: number) => (
                                        <li key={i} style={{ marginBottom: 8 }}>{c}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="card animate-fade-in" style={{ animationDelay: '0.3s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem' }}>
                                        <CheckCircle size={20} color="#f59e0b" /> Generated Flashcards ({result.flashcards?.length})
                                    </h3>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveFlashcards}
                                        disabled={savingFlashcards || savedFlashcards}
                                        style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                                    >
                                        {savingFlashcards ? 'Saving...' : savedFlashcards ? <><CheckCircle size={14} style={{ marginRight: 4 }} /> Saved!</> : 'Save All to Deck'}
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {result.flashcards?.map((card: any, i: number) => (
                                        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Q: {card.front}</div>
                                            <div style={{ color: 'var(--text-secondary)' }}>A: {card.back}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!analyzing && !result && (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, border: '1px dashed var(--border-color)', background: 'transparent' }}>
                            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                Upload a document to see the AI magic.<br />Results will appear here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
