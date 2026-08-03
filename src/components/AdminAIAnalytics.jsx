import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { analyzeAppData, convertToKimDaepyoTone, generateMarketingCopy, generatePointMarketingProposal } from '../services/claudeService';

const AdminAIAnalytics = () => {
    const [activeTab, setActiveTab] = useState('insights');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('claude-sonnet-4-5');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    
    // Tab 2: Writer
    const [rawText, setRawText] = useState('');
    const [brandPrompt, setBrandPrompt] = useState('');
    
    // Tab 3: Marketing
    const [topic, setTopic] = useState('');
    const [targetAudience, setTargetAudience] = useState('30~60대 광고모델');

    // Tab 3: Image generation
    const [imageUrl, setImageUrl] = useState('');
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState('');

    useEffect(() => {
        const storedKey = localStorage.getItem('claudeApiKey');
        setApiKey(storedKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '');
    }, []);

    const handleApiKeyChange = (e) => {
        const val = e.target.value;
        setApiKey(val);
        localStorage.setItem('claudeApiKey', val);
    };

    const handleAnalyzeData = async () => {
        setLoading(true);
        try {
            // Mock fetching data from supabase for demonstration
            const { data: users } = await supabase.from('users').select('*').limit(50);
            const { data: posts } = await supabase.from('certification_posts').select('*').limit(50);
            const snapshot = { users, posts };
            const res = await analyzeAppData(snapshot, apiKey, model);
            setResult(res);
        } catch (error) {
            setResult(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRewrite = async () => {
        setLoading(true);
        try {
            const res = await convertToKimDaepyoTone(rawText, brandPrompt, apiKey, model);
            setResult(res);
        } catch (error) {
            setResult(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMarketingCopy = async () => {
        setLoading(true);
        setImageUrl('');
        setImageError('');
        try {
            const res = await generateMarketingCopy(topic, targetAudience, apiKey, model);
            setResult(res);
        } catch (error) {
            setResult(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePointMarketing = async () => {
        setLoading(true);
        try {
            const pointStats = { sampleData: "some point stats" };
            const res = await generatePointMarketingProposal(pointStats, apiKey, model);
            setResult(res);
        } catch (error) {
            setResult(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        alert('복사되었습니다.');
    };

    // 🎨 AI 카드뉴스 이미지 생성 (Pollinations.ai 무료 API)
    const handleGenerateImage = async () => {
        if (!topic) return;
        setImageLoading(true);
        setImageError('');
        setImageUrl('');

        const imagePrompt = encodeURIComponent(
            `Premium luxury Instagram card news banner for MOCA Korean model agency app. ` +
            `Topic: ${topic}. Target: ${targetAudience}. ` +
            `Soft lavender background (#F3E8FF), dark plum purple (#1F1235) elegant frame, ` +
            `stylish Korean commercial advertising models 30s 40s 60s, confident professional poses, ` +
            `modern typography, gold and purple gradient accents, high-end fashion photography feel, ` +
            `square 1:1 format, ultra clean minimal design`
        );

        const url = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
        
        const img = new Image();
        img.onload = () => {
            setImageUrl(url);
            setImageLoading(false);
        };
        img.onerror = () => {
            setImageError('이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setImageLoading(false);
        };
        img.src = url;
    };

    // 이미지 다운로드
    const handleDownloadImage = async () => {
        if (!imageUrl) return;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `MOCA_카드뉴스_${Date.now()}.jpg`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(imageUrl, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto my-6 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-[#1F1235] flex items-center">
                <span className="mr-2">🤖</span> AI 마케팅 & 데이터 분석 센터
            </h2>

            {/* Config Section */}
            <div className="flex gap-4 mb-6 bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claude API Key</label>
                    <input 
                        type="password" 
                        value={apiKey} 
                        onChange={handleApiKeyChange}
                        placeholder="sk-ant-..."
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
                        <option value="claude-opus-4">Claude Opus 4</option>
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6 overflow-x-auto whitespace-nowrap">
                {[
                    { id: 'insights', label: '📈 데이터 인사이트' },
                    { id: 'writer', label: '✨ 글쓰기 도우미' },
                    { id: 'marketing', label: '🎨 홍보물 & 카드뉴스' },
                    { id: 'points', label: '🛍️ 아임모델 공화국 마케팅' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setResult(''); setImageUrl(''); setImageError(''); }}
                        className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
                            activeTab === tab.id 
                                ? 'border-[#9333EA] text-[#9333EA]' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {activeTab === 'insights' && (
                        <div>
                            <p className="text-gray-600 mb-4 text-sm">
                                앱 활동 데이터(가입자, 인증글 등)를 종합하여 현재 상황을 분석하고 마케팅 전략을 도출합니다.
                            </p>
                            <button 
                                onClick={handleAnalyzeData}
                                disabled={loading || !apiKey}
                                className="w-full bg-[#1F1235] text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50"
                            >
                                {loading ? '분석 중...' : '데이터 분석 실행'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'writer' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">원문</label>
                                <textarea 
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
                                    placeholder="변환할 내용을 입력하세요..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">브랜드 지침 (선택)</label>
                                <input 
                                    type="text" 
                                    value={brandPrompt}
                                    onChange={(e) => setBrandPrompt(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
                                    placeholder="예: 이번에는 여름 테마를 강조해주세요"
                                />
                            </div>
                            <button 
                                onClick={handleRewrite}
                                disabled={loading || !apiKey || !rawText}
                                className="w-full bg-[#9333EA] text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50"
                            >
                                {loading ? '변환 중...' : '김대표 톤앤매너로 변환'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">주제</label>
                                <input 
                                    type="text" 
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
                                    placeholder="예: 여름 맞이 포인트 2배 적립 이벤트"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">타겟 오디언스</label>
                                <input 
                                    type="text" 
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#9333EA]"
                                />
                            </div>
                            <button 
                                onClick={handleMarketingCopy}
                                disabled={loading || !apiKey || !topic}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {loading ? '생성 중...' : '마케팅 카피 생성'}
                            </button>

                            {/* 🎨 카드뉴스 이미지 생성 버튼 — 카피 완료 후 표시 */}
                            {result && activeTab === 'marketing' && (
                                <div className="mt-2 space-y-3">
                                    <div className="border-t border-purple-100 pt-3">
                                        <p className="text-xs text-gray-500 mb-2">📌 위 카피 주제로 카드뉴스 이미지를 자동 생성합니다 (무료 AI)</p>
                                        <button
                                            onClick={handleGenerateImage}
                                            disabled={imageLoading || !topic}
                                            className="w-full bg-gradient-to-r from-[#9333EA] to-[#1F1235] text-white py-3 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {imageLoading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                                                    </svg>
                                                    AI 이미지 생성 중... (10~30초)
                                                </>
                                            ) : (
                                                <> 🎨 AI 카드뉴스 이미지 생성 </>
                                            )}
                                        </button>
                                    </div>

                                    {imageError && (
                                        <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{imageError}</p>
                                    )}

                                    {imageUrl && (
                                        <div className="space-y-2">
                                            <img 
                                                src={imageUrl} 
                                                alt="AI 생성 카드뉴스" 
                                                className="w-full rounded-xl shadow-lg border border-purple-100"
                                            />
                                            <button
                                                onClick={handleDownloadImage}
                                                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
                                            >
                                                ⬇️ 이미지 다운로드
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'points' && (
                        <div>
                            <p className="text-gray-600 mb-4 text-sm">
                                아임모델 공화국(통합 회원)의 포인트 적립 현황을 분석하고 modelbeauty 앱과 연계한 프로모션을 제안합니다.
                            </p>
                            <button 
                                onClick={handlePointMarketing}
                                disabled={loading || !apiKey}
                                className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700 transition disabled:opacity-50"
                            >
                                {loading ? '생성 중...' : '마케팅 제안서 작성'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Result Area */}
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">결과물</label>
                        {result && (
                            <button onClick={handleCopy} className="text-sm text-[#9333EA] font-semibold hover:underline">
                                복사하기
                            </button>
                        )}
                    </div>
                    <div className="flex-1 bg-gray-50 border rounded-lg p-4 overflow-y-auto min-h-[300px] max-h-[600px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                AI가 열심히 작업 중입니다... 🪄
                            </div>
                        ) : result ? (
                            <div 
                                className="prose prose-sm max-w-none whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                좌측에서 실행 버튼을 눌러주세요.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAIAnalytics;
