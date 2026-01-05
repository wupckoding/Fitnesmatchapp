import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, ChatMessage, Conversation, ChatAttachment } from '../types';
import { DB } from '../services/databaseService';
import { compressImage, validateFile, formatFileSize } from '../services/fileUploadService';

interface ChatSystemProps {
  currentUser: User;
}

// Icons
const Icons = {
  Back: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path d="M15 19l-7-7 7-7"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
    </svg>
  ),
  Attachment: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
    </svg>
  ),
  Image: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  Document: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Plus: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M12 4v16m8-8H4"/>
    </svg>
  ),
  Chat: () => (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
    </svg>
  ),
  Block: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
    </svg>
  ),
  Info: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
};

export const ChatSystem: React.FC<ChatSystemProps> = ({ currentUser }) => {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const getOtherParticipant = useCallback((conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== currentUser.id) || '';
    const pros = DB.getPros();
    const clients = DB.getClients();
    return pros.find(p => p.id === otherId) || clients.find(c => c.id === otherId);
  }, [currentUser.id]);

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

  useEffect(() => {
    refresh();
    DB.forceSync().then(refresh).catch(console.error);
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [refresh]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent, attachment?: ChatAttachment) => {
    e?.preventDefault();
    if ((!inputText.trim() && !attachment) || !selectedConv) return;
    
    const otherId = selectedConv.participants.find(p => p !== currentUser.id) || '';
    
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId: otherId,
      text: inputText,
      timestamp: new Date().toISOString(),
      isRead: false,
      attachment,
    };
    
    DB.sendMessage(msg);
    setInputText('');
    setShowAttachMenu(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    
    // Reset input
    e.target.value = '';
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      showToast(validation.error!, 'error');
      return;
    }

    // Only allow images in chat (simpler approach)
    if (validation.type !== 'image') {
      showToast('Solo imágenes permitidas en el chat', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Comprimiendo...');
    setShowAttachMenu(false);

    try {
      // Compress and use base64 directly (works without Supabase Storage)
      const compressed = await compressImage(file, 500, 0.7);
      
      const attachmentId = `att-${Date.now()}`;
      const attachment: ChatAttachment = {
        id: attachmentId,
        type: 'image',
        url: compressed,
        fileName: file.name,
        size: file.size,
      };

      setUploadProgress('Enviando...');
      handleSendMessage(undefined, attachment);
      showToast('Imagen enviada', 'success');
    } catch (err: any) {
      console.error('Error uploading:', err);
      showToast(err.message || 'Error al subir imagen', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDeleteConversation = () => {
    if (!selectedConv) return;
    const otherUser = getOtherParticipant(selectedConv);
    if (confirm(`¿Eliminar conversación con ${otherUser?.name}?`)) {
      // For now, just go back - messages stay in DB
      setSelectedConv(null);
      showToast('Conversación archivada', 'success');
    }
    setShowChatMenu(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const renderAttachment = (attachment: ChatAttachment, isMe: boolean) => {
    if (attachment.type === 'image') {
      return (
        <div 
          className="mt-2 rounded-xl overflow-hidden cursor-pointer max-w-[200px]"
          onClick={() => setPreviewImage(attachment.url)}
        >
          <img 
            src={attachment.url} 
            alt="Imagen" 
            className="w-full h-auto object-cover rounded-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }
    
    if (attachment.type === 'pdf') {
      return (
        <a 
          href={attachment.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`mt-2 flex items-center gap-3 p-3 rounded-xl ${
            isMe ? 'bg-blue-700' : 'bg-gray-100'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isMe ? 'bg-blue-600' : 'bg-red-100'
          }`}>
            <Icons.Document />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-gray-900'}`}>
              {attachment.fileName || 'Documento.pdf'}
            </p>
            {attachment.size && (
              <p className={`text-xs ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                {formatFileSize(attachment.size)}
              </p>
            )}
          </div>
          <Icons.Download />
        </a>
      );
    }
    
    return null;
  };

  // Image Preview Modal
  if (previewImage) {
    return (
      <div 
        className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
        onClick={() => setPreviewImage(null)}
      >
        <button 
          className="absolute top-12 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
          onClick={() => setPreviewImage(null)}
        >
          <Icons.Close />
        </button>
        <img 
          src={previewImage} 
          alt="Preview" 
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  // Chat aberto
  if (selectedConv) {
    const otherUser = getOtherParticipant(selectedConv);
    
    return (
      <div className="flex-1 bg-gray-50 flex flex-col h-full animate-fade-in relative">
        {/* Toast */}
        {toast && (
          <div className="fixed top-20 inset-x-4 z-[200] animate-slide-up">
            <div className={`mx-auto max-w-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
            }`}>
              {toast.type === 'success' ? <Icons.Check /> : <Icons.Close />}
              <span className="text-sm font-medium">{toast.msg}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="px-4 pt-12 pb-4 flex items-center gap-4 bg-white border-b border-gray-100 shrink-0 shadow-sm relative z-10">
          <button 
            onClick={() => setSelectedConv(null)} 
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all"
          >
            <Icons.Back />
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
          
          {/* Menu Button with Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all"
            >
              <Icons.Menu />
            </button>
            
            {/* Dropdown Menu */}
            {showChatMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 min-w-[180px] animate-spring-up">
                  <button 
                    onClick={() => {
                      showToast('Perfil de ' + otherUser?.name, 'success');
                      setShowChatMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <Icons.Info />
                    <span className="text-sm font-medium text-gray-700">Ver perfil</span>
                  </button>
                  <button 
                    onClick={() => {
                      showToast('Notificaciones silenciadas', 'success');
                      setShowChatMenu(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Silenciar</span>
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button 
                    onClick={handleDeleteConversation}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors"
                  >
                    <Icons.Trash />
                    <span className="text-sm font-medium text-red-600">Archivar chat</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm text-blue-500">
                <Icons.Chat />
              </div>
              <p className="text-sm font-bold text-gray-400">¡Empieza la conversación!</p>
              <p className="text-xs text-gray-300 mt-1">Envía un mensaje a {otherUser?.name}</p>
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
                      : 'bg-white text-black rounded-bl-md shadow-sm border border-gray-100'
                  }`}>
                    {m.text && (
                      <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    )}
                    {m.attachment && renderAttachment(m.attachment, isMe)}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                    <p className="text-[9px] font-medium text-gray-400">
                      {formatTime(m.timestamp)}
                    </p>
                    {isMe && (
                      <span className={m.isRead ? 'text-blue-500' : 'text-gray-300'}>
                        <Icons.Check />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isUploading && (
            <div className="flex justify-end animate-spring-up">
              <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">{uploadProgress}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attachment Menu */}
        {showAttachMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
            <div className="absolute bottom-24 left-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-spring-up z-50">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Icons.Image />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">Enviar foto</p>
                  <p className="text-xs text-gray-500">JPG, PNG, GIF (máx 5MB)</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Input */}
        <div className="p-4 pb-8 shrink-0 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            
            <button 
              type="button" 
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={isUploading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                showAttachMenu 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-400 hover:text-gray-600'
              } ${isUploading ? 'opacity-50' : ''}`}
            >
              {showAttachMenu ? <Icons.Close /> : <Icons.Attachment />}
            </button>
            
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={isUploading}
              className="flex-1 bg-gray-100 rounded-xl py-3 px-4 font-medium text-sm text-black outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
            />
            
            <button 
              type="submit" 
              disabled={!inputText.trim() || isUploading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                inputText.trim() && !isUploading
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-90' 
                  : 'bg-gray-100 text-gray-300'
              }`}
            >
              <Icons.Send />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Lista de conversas
  return (
    <div className="flex-1 bg-gradient-to-b from-gray-50 to-white flex flex-col h-full animate-fade-in relative">
      {/* Toast for list view */}
      {toast && (
        <div className="fixed top-20 inset-x-4 z-[200] animate-slide-up">
          <div className={`mx-auto max-w-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? <Icons.Check /> : <Icons.Close />}
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}

      <header className="px-6 pt-14 pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight">Mensajes</h2>
            <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversaciones</p>
          </div>
          {/* Info button */}
          <button 
            className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors active:scale-90"
            onClick={() => showToast('Reserva una clase para iniciar chat', 'success')}
          >
            <Icons.Info />
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
              className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md border border-gray-100 hover:border-gray-200 group animate-spring-up"
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
                  <span className="text-[10px] font-medium text-gray-400 shrink-0 ml-2">
                    {conv.lastTimestamp ? formatTime(conv.lastTimestamp) : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
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
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center mb-4 text-blue-500">
              <Icons.Chat />
            </div>
            <p className="text-sm font-bold text-gray-400">Sin mensajes</p>
            <p className="text-xs text-gray-300 mt-1">Reserva una clase para chatear con profesionales</p>
          </div>
        )}
      </div>
    </div>
  );
};
