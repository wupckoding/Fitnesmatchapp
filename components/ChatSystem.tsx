
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Conversation, UserRole } from '../types';
import { DB } from '../services/databaseService';

interface ChatSystemProps {
  currentUser: User;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser }) => {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== currentUser.id) || '';
    const pros = DB.getPros();
    const clients = DB.getClients();
    return pros.find(p => p.id === otherId) || clients.find(c => c.id === otherId);
  };

  useEffect(() => {
    const refresh = () => {
      const convs = DB.getConversations(currentUser.id);
      setConversations(convs);
      
      if (selectedConv) {
        const otherId = selectedConv.participants.find(p => p !== currentUser.id) || '';
        const msgs = DB.getMessages(currentUser.id, otherId);
        setMessages(msgs);
        
        // Marcar como lidas se estiver com o chat aberto
        const hasUnread = msgs.some(m => m.senderId === otherId && !m.isRead);
        if (hasUnread) {
          DB.markMessagesAsRead(currentUser.id, otherId);
        }
      }
    };
    refresh();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [currentUser.id, selectedConv]);

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

  if (selectedConv) {
    const otherUser = getOtherParticipant(selectedConv);
    return (
      <div className="flex-1 bg-white flex flex-col h-full animate-fade-in">
        <header className="px-8 pt-12 pb-6 flex items-center gap-5 border-b border-slate-100 shrink-0">
           <button onClick={() => setSelectedConv(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg>
           </button>
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden shadow-sm border border-slate-50">
                 {otherUser?.image ? (
                   <img src={otherUser.image} className="w-full h-full object-cover" alt="" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-lg font-black text-slate-400 uppercase">
                      {otherUser?.name[0]}
                   </div>
                 )}
              </div>
              <div>
                 <h3 className="font-black text-slate-900 leading-tight">{otherUser?.name} {otherUser?.lastName}</h3>
                 <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">En línea</p>
              </div>
           </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50/30">
           {messages.map((m) => (
             <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-3.5 rounded-[24px] relative ${
                  m.senderId === currentUser.id 
                  ? 'bg-blue-600 text-white rounded-br-md shadow-lg shadow-blue-100/30' 
                  : 'bg-white text-slate-900 rounded-bl-md border border-slate-100 shadow-sm'
                }`}>
                   <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                   <div className="flex items-center justify-end gap-1 mt-1.5">
                      <p className={`text-[8px] font-black uppercase tracking-widest opacity-40`}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {m.senderId === currentUser.id && (
                        <div className="flex -space-x-1.5 ml-0.5">
                           <svg className={`w-3 h-3 ${m.isRead ? 'text-blue-300' : 'text-white/40'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                           {m.isRead && (
                             <svg className="w-3 h-3 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                             </svg>
                           )}
                        </div>
                      )}
                   </div>
                </div>
             </div>
           ))}
        </div>

        <div className="p-6 pb-10 shrink-0 border-t border-slate-50 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
           <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="w-full bg-slate-50 border border-slate-100 rounded-[28px] py-5 pl-6 pr-20 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-blue-600/5 transition-all shadow-inner placeholder:text-slate-300"
              />
              <button type="submit" className="absolute right-2 top-2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col h-full animate-fade-in">
       <header className="px-8 pt-16 pb-6 shrink-0">
          <h2 className="text-[34px] font-black text-slate-900 tracking-tighter leading-none">Mensajes</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 opacity-60">Chat directo con profesionales</p>
       </header>

       <div className="flex-1 overflow-y-auto px-6 space-y-3 no-scrollbar pb-32">
          {conversations.map((conv) => {
            const other = getOtherParticipant(conv);
            return (
              <div 
                key={conv.id} 
                onClick={() => setSelectedConv(conv)}
                className="bg-white border border-slate-100 p-5 rounded-[36px] flex items-center gap-5 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:border-blue-200 group"
              >
                 <div className="w-16 h-16 rounded-[24px] bg-slate-50 overflow-hidden shadow-sm border border-slate-50 shrink-0">
                    {other?.image ? (
                      <img src={other.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-black text-slate-300 uppercase">
                         {other?.name[0]}
                      </div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                       <h4 className="font-black text-slate-900 tracking-tight truncate text-lg leading-none">{other?.name} {other?.lastName}</h4>
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0 ml-2">
                          {conv.lastTimestamp ? new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                       </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       {conv.lastMessage && conv.lastMessage.startsWith('✅') && <span className="text-emerald-500">✨</span>}
                       <p className="text-[13px] font-medium text-slate-400 truncate pr-4">
                          {conv.lastMessage || 'Empieza una conversación...'}
                       </p>
                    </div>
                 </div>
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="2"/></svg>
               </div>
               <p className="font-black uppercase text-[10px] text-slate-300 tracking-[0.3em]">No hay mensajes todavía</p>
            </div>
          )}
       </div>
    </div>
  );
};
