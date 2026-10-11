import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, Settings, Eye, Layout, Type, 
  Palette, Smartphone, Tablet, Monitor, Save, 
  ChevronUp, ChevronDown, Check, Sparkles, BookOpen,
  Music, Map, HelpCircle, Users, Heart, Camera,
  Upload, Trash2, Plus, Image as ImageIcon, FileText,
  Clock, CheckCircle2, X, RefreshCw, MessageCircle, Share2, Sparkle
} from 'lucide-react';
import { WeddingConfig, WeddingTheme } from '../types';
import { THEME_PRESETS } from '../data/defaultConfig';
import { compressImage } from '../utils/imageCompressor';
import { downloadWeddingPdf, sendInviteViaWhatsApp } from '../utils/pdfGenerator';
import PublicInvite from './PublicInvite';

interface VisualEditorProps {
  config: WeddingConfig;
  onSave: (updatedConfig: WeddingConfig) => void;
}

type EditorSectionTab = 'story' | 'media' | 'couple' | 'event' | 'music_pdf' | 'theme' | 'sections';

export default function VisualEditor({ config, onSave }: VisualEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorSectionTab>('story');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
  const [editorConfig, setEditorConfig] = useState<WeddingConfig>({ ...config });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Sync state if config prop updates externally
  useEffect(() => {
    setEditorConfig({ ...config });
  }, [config]);

  // Real-time helper: updates local state AND immediately triggers onSave for seamless real-time preview & storage
  const updateConfig = (updater: (prev: WeddingConfig) => WeddingConfig) => {
    setEditorConfig(prev => {
      const next = updater(prev);
      onSave(next);
      return next;
    });
  };

  // Section visibility control state
  const [visibleSections, setVisibleSections] = useState({
    story: true,
    timeline: true,
    venue: true,
    dressCode: true,
    registry: true,
    playlist: true,
    faq: true,
    guestCheckIn: true,
  });

  const handlePresetSelect = (preset: typeof THEME_PRESETS[0]) => {
    updateConfig(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...preset
      }
    }));
  };

  const handleSave = () => {
    onSave(editorConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // High-performance image compressor upload handler
  const handleImageUpload = async (
    file: File, 
    callback: (base64: string) => void
  ) => {
    try {
      if (!file) return;
      setIsCompressing(true);
      const compressed = await compressImage(file, 1600, 0.85);
      if (compressed) {
        callback(compressed);
      }
    } catch (e) {
      console.warn("handleImageUpload compression error:", e);
    } finally {
      setIsCompressing(false);
    }
  };

  // Add photo to gallery
  const handleAddGalleryPhoto = (base64OrUrl: string) => {
    if (!base64OrUrl.trim()) return;
    updateConfig(prev => ({
      ...prev,
      media: {
        ...prev.media,
        photos: [...(prev.media.photos || []), base64OrUrl.trim()]
      }
    }));
    setNewGalleryUrl('');
  };

  // Remove photo from gallery
  const handleRemoveGalleryPhoto = (indexToRemove: number) => {
    updateConfig(prev => ({
      ...prev,
      media: {
        ...prev.media,
        photos: (prev.media.photos || []).filter((_, idx) => idx !== indexToRemove)
      }
    }));
  };

  const tabs: { id: EditorSectionTab; label: string; icon: any; badge?: string }[] = [
    { id: 'story', label: 'Nossa História', icon: BookOpen, badge: 'Destaque' },
    { id: 'media', label: 'Fotos & Galeria', icon: Camera },
    { id: 'couple', label: 'Os Noivos', icon: Heart },
    { id: 'event', label: 'Data & Locais', icon: Map },
    { id: 'music_pdf', label: 'Músicas & PDF', icon: Music },
    { id: 'theme', label: 'Estilo & Cores', icon: Palette },
    { id: 'sections', label: 'Blocos Visíveis', icon: Layout }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-140px)]" id="wedding-visual-editor">
      {/* LEFT SIDE: Clean & Airy Control Studio (5 Columns) */}
      <div className="xl:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col h-full overflow-hidden">
        
        {/* Modern Tab Navigation Pills */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-rose-900 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-200' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && !isActive && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-semibold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Clean Form Body without Heavy Box Containers */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          <AnimatePresence mode="wait">

            {/* TAB 1: NOSSA HISTÓRIA (OUR STORY) */}
            {activeTab === 'story' && (
              <motion.div
                key="story-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Nossa História de Amor</h3>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Personalize o título, a narrativa de como se conheceram e a foto que ilustra a jornada do casal no convite público.
                  </p>
                </div>

                {/* Story Title */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">
                    Título da Seção de História
                  </label>
                  <input
                    type="text"
                    value={editorConfig.storyTitle || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      storyTitle: e.target.value
                    }))}
                    placeholder="Ex: Como Nossos Caminhos se Cruzaram"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 focus:border-rose-800 font-medium transition-all shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 block">Este título aparece em destaque na página pública do convite.</span>
                </div>

                {/* Story Image Upload */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block text-xs">
                    Foto Principal da Nossa História
                  </label>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs relative group">
                      <img 
                        src={editorConfig.media?.storyImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800'} 
                        alt="Foto da História" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {editorConfig.media?.storyImage && (
                        <button
                          type="button"
                          onClick={() => updateConfig(prev => ({
                            ...prev,
                            media: { ...prev.media, storyImage: '' }
                          }))}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover imagem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
                        <Upload className="w-3.5 h-3.5 text-rose-300" />
                        <span>{isCompressing ? 'Otimizando Imagem...' : 'Carregar Foto do Dispositivo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, base64 => {
                                updateConfig(prev => ({
                                  ...prev,
                                  media: { ...prev.media, storyImage: base64 }
                                }));
                              });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      
                      <div className="text-[10px] text-slate-400">
                        Ou insira um link direto de imagem na web:
                      </div>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={editorConfig.media?.storyImage?.startsWith('data:') ? '' : (editorConfig.media?.storyImage || '')}
                        onChange={e => updateConfig(prev => ({
                          ...prev,
                          media: { ...prev.media, storyImage: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-rose-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Story Content Narrativa */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block text-xs">
                      Texto Narrativo da História
                    </label>
                    <span className="text-[10px] text-slate-400">Suporta múltiplos parágrafos</span>
                  </div>
                  <textarea
                    rows={6}
                    value={editorConfig.storyContent || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      storyContent: e.target.value
                    }))}
                    placeholder="Conte aqui como se conheceram, as viagens especiais, momentos marcantes e o pedido de casamento..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 focus:border-rose-800 font-normal leading-relaxed resize-y transition-all shadow-2xs"
                  />
                </div>
              </motion.div>
            )}

            {/* TAB 2: FOTOS & GALERIA (MEDIA & PHOTOS) */}
            {activeTab === 'media' && (
              <motion.div
                key="media-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Fotos do Casal & Galeria do Site</h3>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Carregue a foto de capa do convite, as fotos individuais e monte o álbum fotográfico que seus convidados poderão apreciar.
                  </p>
                </div>

                {/* Cover Banner Image */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block text-xs">
                    Foto de Capa Principal (Banner Hero)
                  </label>
                  
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <div className="h-32 w-full rounded-xl bg-slate-200 overflow-hidden border border-slate-200 relative group shadow-2xs">
                      <img 
                        src={editorConfig.media?.coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200'} 
                        alt="Capa do Casamento" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <label className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-slate-100">
                          Trocar Foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file, base64 => {
                                  updateConfig(prev => ({
                                    ...prev,
                                    media: { ...prev.media, coverImage: base64 }
                                  }));
                                });
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-rose-800" />
                        <span>{isCompressing ? 'Otimizando...' : 'Carregar do Dispositivo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, base64 => {
                                updateConfig(prev => ({
                                  ...prev,
                                  media: { ...prev.media, coverImage: base64 }
                                }));
                              });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Recomendado: 1920 x 1080px</span>
                    </div>
                  </div>
                </div>

                {/* Individual Bride & Groom Photos */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block text-xs">
                    Fotos dos Noivos (Perfil)
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Bride Photo */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 text-center">
                      <div className="w-16 h-16 rounded-full mx-auto overflow-hidden bg-slate-200 border-2 border-rose-200 shadow-2xs">
                        <img 
                          src={editorConfig.brideGroom?.bridePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'} 
                          alt="Noiva" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-[11px] font-bold text-slate-800">Foto da Noiva</div>
                      <label className="inline-flex items-center justify-center gap-1 w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer shadow-2xs">
                        <Upload className="w-3 h-3 text-rose-800" />
                        <span>Carregar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, base64 => {
                                updateConfig(prev => ({
                                  ...prev,
                                  brideGroom: { ...prev.brideGroom, bridePhoto: base64 }
                                }));
                              });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Groom Photo */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 text-center">
                      <div className="w-16 h-16 rounded-full mx-auto overflow-hidden bg-slate-200 border-2 border-slate-300 shadow-2xs">
                        <img 
                          src={editorConfig.brideGroom?.groomPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'} 
                          alt="Noivo" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-[11px] font-bold text-slate-800">Foto do Noivo</div>
                      <label className="inline-flex items-center justify-center gap-1 w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer shadow-2xs">
                        <Upload className="w-3 h-3 text-rose-800" />
                        <span>Carregar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, base64 => {
                                updateConfig(prev => ({
                                  ...prev,
                                  brideGroom: { ...prev.brideGroom, groomPhoto: base64 }
                                }));
                              });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Gallery Photos Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-slate-800 block text-xs">
                        Galeria de Fotos do Casal
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {(editorConfig.media?.photos || []).length} fotos no álbum
                      </span>
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach((file: File) => {
                              handleImageUpload(file, base64 => {
                                handleAddGalleryPhoto(base64);
                              });
                            });
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Photos Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {(editorConfig.media?.photos || []).map((photoUrl, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-2xs">
                        <img 
                          src={photoUrl} 
                          alt={`Foto ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryPhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-xs"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add by link */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="url"
                      placeholder="Ou adicione por link direto de imagem..."
                      value={newGalleryUrl}
                      onChange={e => setNewGalleryUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-rose-800 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddGalleryPhoto(newGalleryUrl)}
                      disabled={!newGalleryUrl.trim()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: OS NOIVOS (COUPLE NAMES & BIOS) */}
            {activeTab === 'couple' && (
              <motion.div
                key="couple-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Identidade do Casal</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Nomes exibidos nos cabeçalhos, mensagens de boas-vindas e detalhes dos pais.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">Primeiro Nome do Noivo (Ele)</label>
                    <input
                      type="text"
                      value={editorConfig.brideGroom?.groomName || ''}
                      onChange={e => {
                        const newGroom = e.target.value;
                        updateConfig(prev => {
                          const bride = prev.brideGroom?.brideName || 'Noiva';
                          const shouldUpdateFooter = !prev.customFooter || prev.customFooter.includes('Sofia & Gabriel') || prev.customFooter.includes('Com amor, sempre.');
                          return {
                            ...prev,
                            brideGroom: { ...prev.brideGroom, groomName: newGroom },
                            customFooter: shouldUpdateFooter ? `Com amor, sempre. — ${newGroom || 'Noivo'} & ${bride}` : prev.customFooter
                          };
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">Primeiro Nome da Noiva (Ela)</label>
                    <input
                      type="text"
                      value={editorConfig.brideGroom?.brideName || ''}
                      onChange={e => {
                        const newBride = e.target.value;
                        updateConfig(prev => {
                          const groom = prev.brideGroom?.groomName || 'Noivo';
                          const shouldUpdateFooter = !prev.customFooter || prev.customFooter.includes('Sofia & Gabriel') || prev.customFooter.includes('Com amor, sempre.');
                          return {
                            ...prev,
                            brideGroom: { ...prev.brideGroom, brideName: newBride },
                            customFooter: shouldUpdateFooter ? `Com amor, sempre. — ${groom} & ${newBride || 'Noiva'}` : prev.customFooter
                          };
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">Nome Completo do Noivo</label>
                    <input
                      type="text"
                      value={editorConfig.brideGroom?.groomFullName || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        brideGroom: { ...prev.brideGroom, groomFullName: e.target.value }
                      }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 block text-xs">Nome Completo da Noiva</label>
                    <input
                      type="text"
                      value={editorConfig.brideGroom?.brideFullName || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        brideGroom: { ...prev.brideGroom, brideFullName: e.target.value }
                      }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">Pais do Noivo</label>
                  <input
                    type="text"
                    value={editorConfig.brideGroom?.groomParents || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      brideGroom: { ...prev.brideGroom, groomParents: e.target.value }
                    }))}
                    placeholder="Ex: Fernando Montgomery & Helena Montgomery"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">Pais da Noiva</label>
                  <input
                    type="text"
                    value={editorConfig.brideGroom?.brideParents || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      brideGroom: { ...prev.brideGroom, brideParents: e.target.value }
                    }))}
                    placeholder="Ex: Alberto Montgomery & Teresa Montgomery"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">Biografia Curta do Noivo (Ele)</label>
                  <textarea
                    rows={2}
                    value={editorConfig.brideGroom?.groomBio || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      brideGroom: { ...prev.brideGroom, groomBio: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium resize-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">Biografia Curta da Noiva (Ela)</label>
                  <textarea
                    rows={2}
                    value={editorConfig.brideGroom?.brideBio || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      brideGroom: { ...prev.brideGroom, brideBio: e.target.value }
                    }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium resize-none shadow-2xs"
                  />
                </div>
              </motion.div>
            )}

            {/* TAB 4: DATA & LOCAIS (DATE & VENUES) */}
            {activeTab === 'event' && (
              <motion.div
                key="event-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Data, Horários & Localização</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Configure a contagem regressiva e os endereços da cerimônia e recepção com links de navegação.
                  </p>
                </div>

                {/* Wedding Date */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">
                    Data & Horário de Início da Cerimônia
                  </label>
                  <input
                    type="datetime-local"
                    value={editorConfig.date?.slice(0, 16) || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      date: e.target.value
                    }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                  />
                </div>

                {/* Ceremony Venue */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Map className="w-3.5 h-3.5 text-rose-800" />
                    Local da Cerimônia
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 block text-[11px] font-medium">Nome do Espaço</label>
                    <input
                      type="text"
                      value={editorConfig.venue?.ceremonyName || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        venue: { ...prev.venue, ceremonyName: e.target.value }
                      }))}
                      placeholder="Ex: Espaço Jardins da Welwitschia"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 block text-[11px] font-medium">Endereço Completo</label>
                    <input
                      type="text"
                      value={editorConfig.venue?.ceremonyAddress || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        venue: { ...prev.venue, ceremonyAddress: e.target.value }
                      }))}
                      placeholder="Ex: Via AL 15, Talatona, Luanda"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 block text-[11px] font-medium">Link do Google Maps / Waze</label>
                    <input
                      type="text"
                      value={editorConfig.venue?.ceremonyMapsUrl || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        venue: { ...prev.venue, ceremonyMapsUrl: e.target.value }
                      }))}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>
                </div>

                {/* Reception Venue */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-800" />
                    Local da Recepção / Copo d'Água
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 block text-[11px] font-medium">Nome do Salão</label>
                    <input
                      type="text"
                      value={editorConfig.venue?.receptionName || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        venue: { ...prev.venue, receptionName: e.target.value }
                      }))}
                      placeholder="Ex: Salão Nobre Real Welwitschia"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-600 block text-[11px] font-medium">Horário da Recepção</label>
                    <input
                      type="text"
                      value={editorConfig.venue?.receptionTime || ''}
                      onChange={e => updateConfig(prev => ({
                        ...prev,
                        venue: { ...prev.venue, receptionTime: e.target.value }
                      }))}
                      placeholder="Ex: 19 de Setembro de 2026, às 17:00"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: MÚSICAS & PDF (SPOTIFY & INVITATION PDF) */}
            {activeTab === 'music_pdf' && (
              <motion.div
                key="music-pdf-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Músicas & Convite em PDF</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Incorpore trilha sonora oficial do Spotify, vídeo especial do YouTube e o convite impresso em alta definição.
                  </p>
                </div>

                {/* PDF Uploader & Modeling Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block text-xs">
                      Convite Físico ou Modelo (PDF / Imagem)
                    </label>
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full font-bold">
                      Novo • Modelagem Digital
                    </span>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-800 shrink-0 mt-0.5">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs">
                            <Upload className="w-3.5 h-3.5 text-rose-300" />
                            <span>Carregar Arquivo PDF</span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === 'string') {
                                      updateConfig(prev => ({
                                        ...prev,
                                        pdfUrl: reader.result as string
                                      }));
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => downloadWeddingPdf(editorConfig)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-300" />
                            <span>Criar & Baixar PDF</span>
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 block leading-relaxed">
                          Você pode carregar o PDF do seu convite físico existente para modelar o convite digital, ou criar diretamente a partir daqui e baixar o PDF para enviar via WhatsApp.
                        </span>
                      </div>
                    </div>

                    {editorConfig.pdfUrl && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl text-emerald-900 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Arquivo de Convite Carregado com Sucesso!
                          </span>
                          <button
                            type="button"
                            onClick={() => updateConfig(prev => ({ ...prev, pdfUrl: undefined }))}
                            className="text-red-600 hover:text-red-800 text-[10px] font-bold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>

                        {/* Modelar Convite Digital Card */}
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-2">
                          <div className="flex items-center gap-2">
                            <Sparkle className="w-4 h-4 text-amber-700" />
                            <h5 className="font-bold text-amber-900 text-xs">Modelar Convite Digital a partir do PDF</h5>
                          </div>
                          <p className="text-[10px] text-amber-800 leading-normal">
                            Sincronize automaticamente os elementos visuais do convite impresso com a página interativa de convite dos convidados.
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                // Apply luxury gold preset that matches typical formal wedding print
                                handlePresetSelect(THEME_PRESETS[2]);
                                alert('Estilo visual Ouro Luxuoso aplicado para harmonizar com o convite impresso!');
                              }}
                              className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Aplicar Cores Douradas / Luxo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handlePresetSelect(THEME_PRESETS[0]);
                                alert('Estilo visual Romance Clássico aplicado!');
                              }}
                              className="px-2.5 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Aplicar Romance Clássico
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Quick Share Button */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        Envio Direto no WhatsApp
                      </span>
                      <button
                        type="button"
                        onClick={() => sendInviteViaWhatsApp(editorConfig)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Abrir WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Spotify */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">
                    Link de Playlist Incorporada do Spotify
                  </label>
                  <input
                    type="text"
                    value={editorConfig.spotifyPlaylistUrl || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      spotifyPlaylistUrl: e.target.value
                    }))}
                    placeholder="https://open.spotify.com/embed/playlist/..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 block">Cole o link de compartilhamento ou embed do Spotify.</span>
                </div>

                {/* YouTube */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block text-xs">
                    ID do Vídeo do YouTube (Destaque do Casamento)
                  </label>
                  <input
                    type="text"
                    value={editorConfig.youtubeVideoId || ''}
                    onChange={e => updateConfig(prev => ({
                      ...prev,
                      youtubeVideoId: e.target.value
                    }))}
                    placeholder="Ex: EngW7tLk6f0"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-rose-800 font-medium shadow-2xs"
                  />
                </div>
              </motion.div>
            )}

            {/* TAB 6: ESTILO & CORES (THEME & PRESETS) */}
            {activeTab === 'theme' && (
              <motion.div
                key="theme-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Temas & Tipografia</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Escolha um tema visual pronto e harmonize as cores principais do seu convite digital.
                  </p>
                </div>

                {/* Theme Presets */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block text-xs">Coleção de Temas Pré-configurados</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {THEME_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          editorConfig.theme?.primaryColor === preset.primaryColor
                            ? 'border-rose-900 bg-rose-50/70 shadow-xs ring-1 ring-rose-800/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span 
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs" 
                            style={{ backgroundColor: preset.secondaryColor }}
                          />
                          <span className="font-bold text-xs text-slate-900 ml-1">{preset.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block leading-tight">
                          {preset.fontHeading === 'serif' ? 'Elegante & Serif' : 'Contemporâneo & Sans'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">Cor Primária</label>
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <input
                        type="color"
                        value={editorConfig.theme?.primaryColor || '#831843'}
                        onChange={e => updateConfig(prev => ({
                          ...prev,
                          theme: { ...prev.theme, primaryColor: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <span className="font-mono text-xs font-bold text-slate-700 uppercase">
                        {editorConfig.theme?.primaryColor || '#831843'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-[11px]">Cor Secundária</label>
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <input
                        type="color"
                        value={editorConfig.theme?.secondaryColor || '#FDF2F8'}
                        onChange={e => updateConfig(prev => ({
                          ...prev,
                          theme: { ...prev.theme, secondaryColor: e.target.value }
                        }))}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <span className="font-mono text-xs font-bold text-slate-700 uppercase">
                        {editorConfig.theme?.secondaryColor || '#FDF2F8'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 7: BLOCOS VISÍVEIS (SECTION VISIBILITY) */}
            {activeTab === 'sections' && (
              <motion.div
                key="sections-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-700"></span>
                    <h3 className="text-sm font-serif font-bold text-slate-900">Seções Visíveis do Convite</h3>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Ative ou oculte blocos no site para personalizar exatamente o que os convidados verão.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {[
                    { key: 'story', label: 'Nossa História de Amor', desc: 'Narrativa e foto do casal' },
                    { key: 'timeline', label: 'Cronograma do Casamento', desc: 'Horários dos acontecimentos' },
                    { key: 'venue', label: 'Espaço & Localização', desc: 'Endereço e mapa da cerimônia' },
                    { key: 'dressCode', label: 'Dress Code & Paleta', desc: 'Sugestões de trajes' },
                    { key: 'registry', label: 'Lista de Presentes & Multicaixa', desc: 'Presentear com prova social' },
                    { key: 'playlist', label: 'Playlist Spotify', desc: 'Player de áudio incorporado' },
                    { key: 'faq', label: 'Perguntas Frequentes (FAQ)', desc: 'Esclarecimentos para convidados' },
                    { key: 'guestCheckIn', label: 'Portaria & Validação', desc: 'Acesso do scanner' }
                  ].map(block => (
                    <div 
                      key={block.key} 
                      className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{block.label}</div>
                        <div className="text-[10px] text-slate-400">{block.desc}</div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(visibleSections as any)[block.key]}
                          onChange={e => setVisibleSections(prev => ({
                            ...prev,
                            [block.key]: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-900"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer with Save / Publish Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sincronizado</span>
          </div>

          <button
            onClick={handleSave}
            id="btn-save-wedding-config"
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                <span>Alterações Publicadas!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Publicar no Convite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: Realtime Dynamic Multi-Viewport Sandbox (7 Columns) */}
      <div className="xl:col-span-7 flex flex-col h-full bg-slate-100/90 border border-slate-200 rounded-2xl overflow-hidden shadow-inner p-3 md:p-4 justify-between">
        
        {/* Sandbox Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-2.5 border border-slate-200/80 rounded-xl mb-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-700 tracking-wider">PRÉVIA AO VIVO DO CONVITE</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Export & WhatsApp Share */}
            <button
              type="button"
              onClick={() => downloadWeddingPdf(editorConfig)}
              title="Baixar Convite Formatado em PDF"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
            <button
              type="button"
              onClick={() => sendInviteViaWhatsApp(editorConfig)}
              title="Enviar Convite no WhatsApp"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Viewport Width Controls */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            {[
              { id: 'desktop', icon: Monitor, label: 'Computador (1200px)' },
              { id: 'tablet', icon: Tablet, label: 'Tablet (768px)' },
              { id: 'mobile', icon: Smartphone, label: 'Telemóvel (390px)' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setViewport(view.id as any)}
                title={view.label}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewport === view.id 
                    ? 'bg-white text-rose-900 shadow-xs font-bold' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {view.id === 'desktop' ? <Monitor className="w-4 h-4" /> : view.id === 'tablet' ? <Tablet className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Scalable Simulator Area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          <motion.div
            layout
            id="visual-editor-preview-viewport"
            className={`bg-white shadow-2xl border border-slate-300 overflow-y-auto overflow-x-hidden relative h-full transition-all duration-300 ${
              viewport === 'mobile' ? 'w-[375px] max-w-full rounded-[36px] ring-8 ring-slate-900 shadow-slate-900/15' :
              viewport === 'tablet' ? 'w-[768px] max-w-full rounded-2xl' :
              'w-full rounded-2xl'
            }`}
          >
            {/* Mobile Speaker/Camera Notch */}
            {viewport === 'mobile' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-xl z-50 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-800 rounded-full mb-0.5"></div>
              </div>
            )}

            {/* Simulated Frame Content */}
            <div className={`w-full h-full ${viewport === 'mobile' ? 'pt-5' : ''}`}>
              <PublicInvite 
                config={editorConfig} 
                simulatedOnly={true}
                visibleBlocks={visibleSections}
              />
            </div>
          </motion.div>
        </div>

        {/* Subtle Disclaimer */}
        <div className="mt-3 text-center text-[10px] text-slate-400 font-medium">
          As alterações feitas são refletidas em tempo real no simulador acima.
        </div>
      </div>
    </div>
  );
}
