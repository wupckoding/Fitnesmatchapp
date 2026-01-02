
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

  useEffect(() => {
    const refresh = () => {
      setConversations(DB.getConversations(currentUser.id));
      if (selectedConv) {
        const otherId = selectedConv.participants.find(p => p !== currentUser.id) || '';
        setMessages(DB.getMessages(currentUser.id, otherId));
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
      timestamp: new Date().toISOString()
    };
    
    DB.sendMessage(msg);
    setInputText('');
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== currentUser.id) || '';
    const pros = DB.getPros();
    const clients = DB.getClients();
    return pros.find(p => p.id === otherId) || clients.find(c => c.id === otherId);
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
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-black uppercase shadow-sm">
                 {otherUser?.name[0]}
              </div>
              <div>
                 <h3 className="font-black text-slate-900 leading-tight">{otherUser?.name} {otherUser?.lastName}</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En línea</p>
              </div>
           </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
           {messages.map((m) => (
             <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-6 py-4 rounded-[28px] ${
                  m.senderId === currentUser.id 
                  ? 'bg-blue-600 text-white rounded-br-md shadow-lg shadow-blue-100' 
                  : 'bg-slate-50 text-slate-900 rounded-bl-md border border-slate-100'
                }`}>
                   <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                   <p className={`text-[8px] font-black uppercase tracking-widest mt-1.5 opacity-40 text-right`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                </div>
             </div>
           ))}
        </div>

        <div className="p-8 pb-12 shrink-0 border-t border-slate-50 bg-white">
           <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-6 pl-6 pr-20 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-600/10 transition-all shadow-inner"
              />
              <button type="submit" className="absolute right-3 top-2.5 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col h-full animate-fade-in">
       <header className="px-8 pt-12 pb-6 shrink-0">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mensajes</h2>
          <p className="text-slate-400 font-bold text-xs mt-1">Chat directo con tus profesionales</p>
       </header>

       <div className="flex-1 overflow-y-auto p-8 space-y-3 no-scrollbar pb-32">
          {conversations.map((conv) => {
            const other = getOtherParticipant(conv);
            return (
              <div 
                key={conv.id} 
                onClick={() => setSelectedConv(conv)}
                className="bg-white border border-slate-50 p-6 rounded-[32px] flex items-center gap-6 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:border-blue-100"
              >
                 <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-300 shrink-0">
                    {other?.name[0]}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                       <h4 className="font-black text-slate-900 truncate">{other?.name} {other?.lastName}</h4>
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0">
                          {conv.lastTimestamp ? new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                       </span>
                    </div>
                    <p className="text-xs font-medium text-slate-400 truncate pr-4">
                       {conv.lastMessage || 'Empieza una conversación...'}
                    </p>
                 </div>
              </div>
            );
          })}

          {conversations.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="2"/></svg>
               </div>
               <p className="font-black uppercase text-[10px] text-slate-300 tracking-widest">No hay mensajes todavía</p>
            </div>
          )}
       </div>
    </div>
  );
};
