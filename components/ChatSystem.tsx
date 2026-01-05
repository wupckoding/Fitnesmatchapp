
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChatMessage, Conversation } from '../types';
import { DB } from '../services/databaseService';

interface ChatSystemProps {
  currentUser: User;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser }) => {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== currentUser.id) || '';
    const pros = DB.getPros();
    const clients = DB.getClients();
    return pros.find(p => p.id === otherId) || clients.find(c => c.id === otherId);
  };

  const refresh = useCallback(() => {
    const convs = DB.getConversations(currentUser.id);
    setConversations(convs);
    
    if (selectedConv) {
      const otherId = selectedConv.participants.find(p => p !== currentUser.id) || '';
      const msgs = DB.getMessages(currentUser.id, otherId);
      setMessages(msgs);
      
      const hasUnread = msgs.some(m => m.senderId === otherId && !m.isRead);
      if (hasUnread) {
        DB.markMessagesAsRead(currentUser.id, otherId);
      }
    }
    setIsLoading(false);
  }, [currentUser.id, selectedConv]);

  // Carregar dados frescos do Supabase
  const loadFreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await DB.forceSync();
      refresh();
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    loadFreshData();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [loadFreshData, refresh]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedConv) return;
    const otherId = selectedConv.participants.find(p => p !== currentUser.id) || '';
    
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId: otherId,
      text: inputText,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    DB.sendMessage(msg);
    setInputText('');
  };

  // Formatar timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  // Chat aberto
  if (selectedConv) {
    const otherUser = getOtherParticipant(selectedConv);
    return (
      <div className="flex-1 bg-slate-50 flex flex-col h-full animate-fade-in">
        {/* Header do Chat */}
        <header className="px-4 pt-12 pb-4 flex items-center gap-4 bg-white border-b border-slate-100 shrink-0 shadow-sm">
          <button 
            onClick={() => setSelectedConv(null)} 
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 overflow-hidden">
                {otherUser?.image ? (
                  <img src={otherUser.image} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {otherUser?.name[0]}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h3 className="font-bold text-black text-sm">{otherUser?.name} {otherUser?.lastName}</h3>
              <p className="text-[10px] font-medium text-green-500">En línea</p>
            </div>
          </div>
          
          <button className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
        </header>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">👋</div>
              <p className="text-sm font-bold text-slate-400">¡Empieza la conversación!</p>
              <p className="text-xs text-slate-300 mt-1">Envía un mensaje a {otherUser?.name}</p>
            </div>
          )}
          
          {messages.map((m, idx) => {
            const isMe = m.senderId === currentUser.id;
            const showAvatar = idx === 0 || messages[idx - 1].senderId !== m.senderId;
            
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-spring-up`}>
                {!isMe && showAvatar && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 overflow-hidden mr-2 shrink-0">
                    {otherUser?.image ? (
                      <img src={otherUser.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {otherUser?.name[0]}
                      </div>
                    )}
                  </div>
                )}
                {!isMe && !showAvatar && <div className="w-8 mr-2"></div>}
                
                <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-md' 
                      : 'bg-white text-black rounded-bl-md shadow-sm border border-slate-100'
                  }`}>
                    <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                    <p className="text-[9px] font-medium text-slate-400">
                      {formatTime(m.timestamp)}
                    </p>
                    {isMe && (
                      <svg className={`w-3.5 h-3.5 ${m.isRead ? 'text-blue-500' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-slate-100">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 pb-8 shrink-0 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button type="button" className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
            </button>
            
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-slate-100 rounded-xl py-3 px-4 font-medium text-sm text-black outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            />
            
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                inputText.trim() 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-90' 
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Lista de conversas
  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 to-white flex flex-col h-full animate-fade-in">
      <header className="px-6 pt-14 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight">Mensajes</h2>
            <p className="text-xs text-slate-400 mt-0.5">{conversations.length} conversaciones</p>
          </div>
          <button className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 space-y-2 no-scrollbar pb-32">
        {conversations.map((conv, idx) => {
          const other = getOtherParticipant(conv);
          const hasUnread = conv.lastMessage && !conv.lastMessage.startsWith('✅');
          
          return (
            <div 
              key={conv.id} 
              onClick={() => setSelectedConv(conv)}
              className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md border border-slate-100 hover:border-slate-200 group animate-spring-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 overflow-hidden group-hover:scale-105 transition-transform">
                  {other?.image ? (
                    <img src={other.image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                      {other?.name[0]}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-black text-sm truncate">{other?.name} {other?.lastName}</h4>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                    {conv.lastTimestamp ? formatTime(conv.lastTimestamp) : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {conv.lastMessage || 'Empieza una conversación...'}
                </p>
              </div>
              
              {hasUnread && (
                <div className="w-3 h-3 bg-blue-600 rounded-full shrink-0"></div>
              )}
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-400">Sin mensajes</p>
            <p className="text-xs text-slate-300 mt-1">Reserva una clase para chatear con profesionales</p>
          </div>
        )}
      </div>
    </div>
  );
};
