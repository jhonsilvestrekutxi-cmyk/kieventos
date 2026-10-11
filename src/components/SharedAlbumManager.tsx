import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, MessageSquare, Trash2, Sparkles, 
  Heart, Calendar, FileText, CheckCircle2, Eye, EyeOff,
  Clock, ShieldAlert, Check
} from 'lucide-react';
import { WeddingConfig } from '../types';
import { safeSetItem } from '../utils/storage';

interface SharedAlbumManagerProps {
  config: WeddingConfig;
}

interface SharedPhoto {
  id: string;
  guestName: string;
  imageUrl: string;
  timestamp: string;
  caption?: string;
  approved?: boolean;
}

interface AffectionMessage {
  id: string;
  clientName: string;
  text: string;
  timestamp: string;
}

export default function SharedAlbumManager({ config }: SharedAlbumManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'photos' | 'messages'>('photos');
  const [photoFilter, setPhotoFilter] = useState<'pending' | 'approved'>('pending');
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [messages, setMessages] = useState<AffectionMessage[]>([]);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load photos and messages from localStorage
  useEffect(() => {
    const loadedPhotos = localStorage.getItem(`vowsflow_photos_${config.id}`) || localStorage.getItem(`kutxi_photos_${config.id}`);
    if (loadedPhotos) {
      try {
        const parsed = JSON.parse(loadedPhotos);
        const validated = parsed.map((p: any) => ({
          ...p,
          approved: p.approved === undefined ? true : p.approved
        }));
        setPhotos(validated);
      } catch (e) {
        setPhotos([]);
      }
    } else {
      // Default placeholder photos
      const defaults = [
        { id: 'ph_1', guestName: 'Madrinha Isabella', imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600', timestamp: '19/09/2026 18:24', caption: 'O casal mais lindo de Luanda! Que energia!', approved: true },
        { id: 'ph_2', guestName: 'Lucas Vance', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600', timestamp: '19/09/2026 19:10', caption: 'Festa simplesmente inesquecível!', approved: true },
      ];
      setPhotos(defaults);
      safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(defaults));
    }

    const loadedMsgs = localStorage.getItem(`vowsflow_affection_msgs_${config.id}`) || localStorage.getItem(`kutxi_affection_msgs_${config.id}`);
    if (loadedMsgs) {
      try {
        setMessages(JSON.parse(loadedMsgs));
      } catch (e) {
        setMessages([]);
      }
    } else {
      // Default placeholder comments
      const defaults = [
        { id: 'msg_1', clientName: 'Madrinha Isabella', text: 'Queridos noivos, que alegria ver a união de vocês! Que Deus abençoe ricamente cada passo desta nova jornada.', timestamp: '19/09/2026 18:30' },
        { id: 'msg_2', clientName: 'Lucas Vance', text: 'Parabéns ao casal! Que festa maravilhosa e que amor inspirador!', timestamp: '19/09/2026 19:15' },
        { id: 'msg_3', clientName: 'Tia Eleonora', text: 'Meus afilhados amados, meu coração transborda de felicidade por vocês hoje.', timestamp: '19/09/2026 19:45' }
      ];
      setMessages(defaults);
      safeSetItem(`kutxi_affection_msgs_${config.id}`, JSON.stringify(defaults));
    }
  }, [config.id]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleDeletePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(updated));
    showNotification('Foto removida do álbum com sucesso!');
  };

  const handleApprovePhoto = (id: string) => {
    const updated = photos.map(p => p.id === id ? { ...p, approved: true } : p);
    setPhotos(updated);
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(updated));
    showNotification('Foto aprovada e publicada no mural de fotos com sucesso!');
  };

  const handleDeleteMessage = (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    safeSetItem(`kutxi_affection_msgs_${config.id}`, JSON.stringify(updated));
    showNotification('Mensagem de carinho removida com sucesso!');
  };

  return (
    <div className="space-y-6" id="shared-album-manager-root">
      
      {/* Top Banner and Summary Header */}
      <div className="bg-gradient-to-r from-rose-900 to-slate-900 p-6 md:p-8 rounded-2xl text-white space-y-4 shadow-lg border border-rose-800/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <span className="text-xs font-bold font-mono uppercase tracking-widest text-rose-300">Painel de Moderação</span>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl md:text-2xl font-serif font-bold text-white tracking-wide">
            Álbum Coletivo & Mensagens de Carinho
          </h2>
          <p className="text-xs text-rose-200/80 leading-relaxed max-w-2xl font-light">
            Aqui você gerencia tudo o que seus convidados publicam no seu site. Remova fotos inadequadas do álbum compartilhado e filtre os comentários/mensagens carinhosas enviadas no dia do evento.
          </p>
        </div>

        {/* Quick Statistics Counters */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-rose-300" />
            <div>
              <span className="text-[10px] block text-rose-300/80 uppercase font-bold">Fotos Coletadas</span>
              <strong className="text-white font-mono text-base">{photos.length}</strong>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-300" />
            <div>
              <span className="text-[10px] block text-indigo-300/80 uppercase font-bold">Mensagens Recebidas</span>
              <strong className="text-white font-mono text-base">{messages.length}</strong>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-3">
            <Calendar className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="leading-tight">
              <span className="text-[10px] block text-amber-300 uppercase font-bold">Período de Envio</span>
              <span className="text-[10px] text-amber-100 font-semibold font-sans block mt-0.5">
                Ativo apenas no dia do Casamento e dia seguinte
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating alert notifications */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-lg fixed top-5 right-5 z-50 ${
              alertMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-tab Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start max-w-sm">
        <button
          onClick={() => setActiveSubTab('photos')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'photos' 
              ? 'bg-white text-rose-800 shadow-xs' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Mural de Fotos</span>
        </button>
        <button
          onClick={() => setActiveSubTab('messages')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'messages' 
              ? 'bg-white text-rose-800 shadow-xs' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Mensagens de Carinho</span>
        </button>
      </div>

      {/* Grid displays */}
      <div className="min-h-[300px]">
        {activeSubTab === 'photos' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100">
              <div>
                <h3 className="font-serif font-medium text-slate-900 text-base flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-600" />
                  Moderação do Álbum Coletivo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Defina quais fotos dos convidados ficam visíveis no site público.</p>
              </div>
              
              {/* Pending vs Approved filters */}
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-150 self-start shrink-0">
                <button
                  onClick={() => setPhotoFilter('pending')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    photoFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Pendentes ({photos.filter(p => p.approved === false).length})
                </button>
                <button
                  onClick={() => setPhotoFilter('approved')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    photoFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Aprovadas ({photos.filter(p => p.approved === true).length})
                </button>
              </div>
            </div>

            {(() => {
              const filteredPhotos = photos.filter(p => 
                photoFilter === 'pending' ? p.approved === false : p.approved === true
              );

              if (filteredPhotos.length === 0) {
                return (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 space-y-3.5">
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
                      {photoFilter === 'pending' ? <Clock className="w-5 h-5 text-amber-500" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800">
                        {photoFilter === 'pending' ? 'Nenhuma foto pendente de moderação' : 'Nenhuma foto aprovada ainda'}
                      </h4>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                        {photoFilter === 'pending' 
                          ? 'Excelente! Todas as fotos enviadas pelos convidados já foram moderadas.' 
                          : 'Aprove fotos na aba "Pendentes" para exibi-las publicamente no site dos noivos.'}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPhotos.map(photo => (
                    <div key={photo.id} className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-all">
                      <div className="relative aspect-video bg-slate-100 overflow-hidden">
                        <img 
                          src={photo.imageUrl} 
                          alt={photo.guestName} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 bg-slate-950/70 text-white font-mono text-[9px] px-2 py-0.5 rounded-full backdrop-blur-xs font-bold flex items-center gap-1">
                          {photoFilter === 'pending' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Pendente
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Publicada
                            </>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[8px] font-mono px-1.5 py-0.5 rounded">
                          {photo.timestamp}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 font-bold flex items-center justify-center text-[10px] border border-rose-100">
                              {photo.guestName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">{photo.guestName}</span>
                          </div>
                          {photo.caption && (
                            <p className="text-[11px] text-slate-500 italic leading-relaxed pl-1 border-l-2 border-rose-100 font-light">
                              "{photo.caption}"
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-50">
                          {photoFilter === 'pending' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleApprovePhoto(photo.id)}
                                className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-emerald-500 shadow-sm"
                              >
                                <Check className="w-3 h-3" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-250"
                              >
                                <Trash2 className="w-3 h-3 text-rose-500" />
                                Recusar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
                              className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-rose-100"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remover do Mural
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-medium text-slate-900 text-base">Moderar Mensagens de Carinho (Guestbook)</h3>
              <span className="text-[11px] text-slate-400 font-mono">Total: {messages.length} mensagens</span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Nenhum recado de carinho</h4>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Mensagens carinhosas enviadas no site aparecerão aqui como comentários em tempo real.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {messages.map(msg => (
                  <div key={msg.id} className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-200 transition-all">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-100">
                            {msg.clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-xs font-bold text-slate-800 block leading-tight">{msg.clientName}</strong>
                            <span className="text-[9px] text-slate-400 font-mono">{msg.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 p-3 rounded-xl border border-slate-100/60 font-light">
                        "{msg.text}"
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border border-rose-100"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover Mensagem
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
