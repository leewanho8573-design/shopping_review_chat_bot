'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, Plus, MessageSquare, Package, Bookmark, BarChart2, 
  Settings, HelpCircle, Moon, Sun, MoreVertical, 
  Headphones, Send, User, Bot, Database, Loader2, Quote, ChevronDown,
  Activity, Battery, Mic, Sparkles, Search
} from 'lucide-react';

interface Message {
  role: 'user' | 'bot';
  content: string;
  references?: string[];
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark');
  };

  const handleIndexing = async () => {
    setIsIndexing(true);
    try {
      const res = await fetch('/api/indexing', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('샘플 데이터 인덱싱이 완료되었습니다!');
      } else {
        const errorMsg = data?.error || data?.message || '알 수 없는 오류가 발생했습니다.';
        alert('인덱싱 실패: ' + errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert('인덱싱 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    if (!isChatActive) setIsChatActive(true);

    const newUserMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: messageText }),
      });
      const data = await res.json();
      
      const botMessage: Message = { 
        role: 'bot', 
        content: data.answer,
        references: data.references 
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: Message = { role: 'bot', content: '죄송합니다. 오류가 발생했습니다.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Zap size={18} fill="white" />
          </div>
          <span className="logo-text">ReviewInsight</span>
        </div>
        <div className="sidebar-subtitle">AI Shopping Analyst</div>

        <button className="new-chat-btn" onClick={() => window.location.reload()}>
          <Plus size={18} />
          <span>New Analysis</span>
        </button>

        <button 
            className="index-btn" 
            onClick={handleIndexing} 
            disabled={isIndexing}
        >
          {isIndexing ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
          <span>샘플 데이터 인덱싱</span>
        </button>

        <nav className="nav-menu">
          <a href="#" className="nav-item active">
            <MessageSquare size={18} />
            <span>Recent Chats</span>
          </a>
          <a href="#" className="nav-item">
            <Package size={18} />
            <span>Product Archive</span>
          </a>
          <a href="#" className="nav-item">
            <Bookmark size={18} />
            <span>Saved Insights</span>
          </a>
          <a href="#" className="nav-item">
            <BarChart2 size={18} />
            <span>Analytics</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </a>
          <a href="#" className="nav-item">
            <HelpCircle size={18} />
            <span>Help</span>
          </a>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="product-info">
            <h3>Current Product</h3>
            <h2>프리미엄 무선 이어폰 Pro</h2>
          </div>
          <div className="top-actions">
            <button className="icon-btn" title="Toggle Dark Mode" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="content-area">
          {!isChatActive ? (
            <section className="welcome-container">
              <div className="welcome-icon-wrapper">
                <Sparkles size={32} />
              </div>
              <h1 className="welcome-title">안녕하세요!</h1>
              <p className="welcome-subtitle">
                리뷰 데이터를 분석하여 쇼핑 결정을 도와드리는 <span>ReviewInsight</span>입니다.
              </p>
              
              <div className="suggested-cards">
                <div className="card" onClick={() => sendMessage('운동할 때 써도 되나요?')}>
                  <div className="card-icon"><Activity size={20} /></div>
                  <h4>운동용 적합성</h4>
                  <p>"땀에 강한지, 격한 움직임에도 잘 안 빠지는지 궁금해요."</p>
                </div>
                <div className="card" onClick={() => sendMessage('배터리 성능이 광고만큼 나오나요?')}>
                  <div className="card-icon"><Battery size={20} /></div>
                  <h4>배터리 성능</h4>
                  <p>"실제 사용 시 배터리가 얼마나 가는지 알고 싶어요."</p>
                </div>
                <div className="card" onClick={() => sendMessage('통화 품질은 어떤가요?')}>
                  <div className="card-icon"><MessageSquare size={20} /></div>
                  <h4>통화 품질</h4>
                  <p>"소음이 많은 곳에서도 통화가 잘 들리는지 궁금해요."</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="chat-container" ref={chatContainerRef}>
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.role === 'user' ? 'user' : 'bot'}`}>
                  <div className="avatar">
                    {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className="bubble">
                    {m.content}
                    {m.references && m.references.length > 0 && (
                      <div className="references">
                        <div className="reference-tag"><Search size={12} /> 관련 리뷰</div>
                        {m.references.map((ref, idx) => (
                          <div key={idx} className="reference-content">"{ref}"</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message bot">
                  <div className="avatar"><Bot size={20} /></div>
                  <div className="typing-indicator">
                    <span>분석 중</span>
                    <div className="dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="input-container">
          <div className="input-wrapper">
            <div className="input-field-group">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isChatActive ? '질문을 입력하세요...' : "'프리미엄 무선 이어폰 Pro'에 대해 질문해보세요..."} 
              />
              <button 
                className="send-btn" 
                onClick={() => sendMessage()} 
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
            <p className="disclaimer">
              ReviewInsight는 AI 기반 서비스로 부정확한 정보가 포함될 수 있습니다.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
