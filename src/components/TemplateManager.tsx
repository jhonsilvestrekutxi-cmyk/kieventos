import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { safeSetItem } from '../utils/storage';
import { 
  Sparkles, Plus, Edit3, Trash2, Copy, Check, Eye, 
  Palette, Type, Layout, Image, CheckCircle2, Bookmark, 
  Search, Sliders, ExternalLink, ShieldCheck, Heart
} from 'lucide-react';

export interface InvitationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Clássico' | 'Moderno' | 'Luxo' | 'Rústico' | 'Minimalista' | 'Tropical';
  previewImageUrl: string;
  fontFamily: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  hasMusicPlayer: boolean;
  hasCountdown: boolean;
  hasQrCodeCheckin: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  createdAt: string;
}

const INITIAL_TEMPLATES: InvitationTemplate[] = [
  {
    id: 'tmpl_1',
    name: 'Ouro Real & Luanda Classic',
    description: 'Design tradicional com arabescos nobres em dourado champanhe, tipografia serifada e contrastes ricos.',
    category: 'Luxo',
    previewImageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    fontFamily: 'Playfair Display, serif',
    colors: {
      primary: '#881337', // rose-900
      accent: '#D97706',  // amber-600 gold
      background: '#FFFDF9',
      surface: '#FFFFFF',
      text: '#1E293B'
    },
    hasMusicPlayer: true,
    hasCountdown: true,
    hasQrCodeCheckin: true,
    isPopular: true,
    createdAt: '2025-01-10'
  },
  {
    id: 'tmpl_2',
    name: 'Jardim Botânico & Rosas Nobles',
    description: 'Floral requintado com degradê suave de pêssego e vinho tinto, ideal para quintas e casamentos ao ar livre.',
    category: 'Romântico' as any,
    previewImageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
    fontFamily: 'Cormorant Garamond, serif',
    colors: {
      primary: '#9F1239',
      accent: '#FB7185',
      background: '#FFF5F5',
      surface: '#FFFFFF',
      text: '#334155'
    },
    hasMusicPlayer: true,
    hasCountdown: true,
    hasQrCodeCheckin: true,
    isPopular: true,
    createdAt: '2025-02-14'
  },
  {
    id: 'tmpl_3',
    name: 'Midnight Black & Velvet Gold',
    description: 'A estética misteriosa e contemporânea com fundo dark grafite, toques de ouro reluzente e minimalismo puro.',
    category: 'Minimalista',
    previewImageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=800',
    fontFamily: 'Cinzel, serif',
    colors: {
      primary: '#F59E0B',
      accent: '#D97706',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC'
    },
    hasMusicPlayer: true,
    hasCountdown: true,
    hasQrCodeCheckin: true,
    isNew: true,
    createdAt: '2025-03-01'
  },
  {
    id: 'tmpl_4',
    name: 'Esmeralda Colonial & Sintra',
    description: 'Verde esmeralda nobre associado a detalhes de monograma com caligrafia fina e selo de cera virtual.',
    category: 'Clássico',
    previewImageUrl: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=800',
    fontFamily: 'Great Vibes, cursive',
    colors: {
      primary: '#065F46',
      accent: '#10B981',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#1E293B'
    },
    hasMusicPlayer: false,
    hasCountdown: true,
    hasQrCodeCheckin: true,
    createdAt: '2025-02-20'
  },
  {
    id: 'tmpl_5',
    name: 'Baía de Luanda Sunset & Terrecota',
    description: 'Tons terrosos quentes, pôr-do-sol tropical e tipografia moderna sem serifa para celebrações na praia.',
    category: 'Tropical',
    previewImageUrl: 'https://images.unsplash.com/photo-1545232979-fbf671175653?auto=format&fit=crop&q=80&w=800',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    colors: {
      primary: '#C2410C',
      accent: '#EA580C',
      background: '#FFF7ED',
      surface: '#FFFFFF',
      text: '#292524'
    },
    hasMusicPlayer: true,
    hasCountdown: true,
    hasQrCodeCheckin: true,
    isNew: true,
    createdAt: '2025-03-05'
  }
];

export default function TemplateManager() {
  const [templates, setTemplates] = useState<InvitationTemplate[]>(() => {
    const saved = localStorage.getItem('kutxi_invitation_templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvitationTemplate | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<InvitationTemplate['category']>('Luxo');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [fontFamily, setFontFamily] = useState('Playfair Display, serif');
  const [primaryColor, setPrimaryColor] = useState('#881337');
  const [accentColor, setAccentColor] = useState('#D97706');
  const [backgroundColor, setBackgroundColor] = useState('#FFFDF9');
  const [textColor, setTextColor] = useState('#1E293B');
  const [hasMusicPlayer, setHasMusicPlayer] = useState(true);
  const [hasCountdown, setHasCountdown] = useState(true);
  const [hasQrCodeCheckin, setHasQrCodeCheckin] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<InvitationTemplate | null>(null);

  useEffect(() => {
    safeSetItem('kutxi_invitation_templates', JSON.stringify(templates));
  }, [templates]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setCategory('Luxo');
    setPreviewImageUrl('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800');
    setFontFamily('Playfair Display, serif');
    setPrimaryColor('#881337');
    setAccentColor('#D97706');
    setBackgroundColor('#FFFDF9');
    setTextColor('#1E293B');
    setHasMusicPlayer(true);
    setHasCountdown(true);
    setHasQrCodeCheckin(true);
    setIsPopular(false);
    setIsNew(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl: InvitationTemplate) => {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setDescription(tmpl.description);
    setCategory(tmpl.category);
    setPreviewImageUrl(tmpl.previewImageUrl);
    setFontFamily(tmpl.fontFamily);
    setPrimaryColor(tmpl.colors.primary);
    setAccentColor(tmpl.colors.accent);
    setBackgroundColor(tmpl.colors.background);
    setTextColor(tmpl.colors.text);
    setHasMusicPlayer(tmpl.hasMusicPlayer);
    setHasCountdown(tmpl.hasCountdown);
    setHasQrCodeCheckin(tmpl.hasQrCodeCheckin);
    setIsPopular(Boolean(tmpl.isPopular));
    setIsNew(Boolean(tmpl.isNew));
    setIsModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? {
        ...t,
        name: name.trim(),
        description: description.trim(),
        category,
        previewImageUrl: previewImageUrl.trim() || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
        fontFamily,
        colors: {
          primary: primaryColor,
          accent: accentColor,
          background: backgroundColor,
          surface: '#FFFFFF',
          text: textColor
        },
        hasMusicPlayer,
        hasCountdown,
        hasQrCodeCheckin,
        isPopular,
        isNew
      } : t));
    } else {
      const newTmpl: InvitationTemplate = {
        id: 'tmpl_' + Date.now(),
        name: name.trim(),
        description: description.trim(),
        category,
        previewImageUrl: previewImageUrl.trim() || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
        fontFamily,
        colors: {
          primary: primaryColor,
          accent: accentColor,
          background: backgroundColor,
          surface: '#FFFFFF',
          text: textColor
        },
        hasMusicPlayer,
        hasCountdown,
        hasQrCodeCheckin,
        isPopular,
        isNew,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setTemplates(prev => [newTmpl, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este modelo de convite?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleDuplicate = (tmpl: InvitationTemplate) => {
    const duplicated: InvitationTemplate = {
      ...tmpl,
      id: 'tmpl_' + Date.now(),
      name: `${tmpl.name} (Cópia)`,
      createdAt: new Date().toISOString().split('T')[0],
      isNew: true
    };
    setTemplates(prev => [duplicated, ...prev]);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6" id="template-manager-admin-root">
      
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              Módulo Exclusivo Super Administrador
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-medium text-white">Criador & Biblioteca de Modelos Prontos</h2>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl">
            Crie, padronize e configure novos layouts e temas de convites para os noivos utilizarem em seus casamentos.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-3 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer self-start md:self-center"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Criar Novo Modelo</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['all', 'Luxo', 'Clássico', 'Moderno', 'Minimalista', 'Tropical'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat === 'all' ? 'Todos os Modelos' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar modelo de convite..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
          />
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(tmpl => (
          <motion.div
            key={tmpl.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:border-slate-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
          >
            {/* Template Preview Image Banner */}
            <div className="relative h-48 w-full bg-slate-100 overflow-hidden group">
              <img
                src={tmpl.previewImageUrl}
                alt={tmpl.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-800 backdrop-blur-xs shadow-xs">
                  {tmpl.category}
                </span>
                {tmpl.isPopular && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                    Popular ★
                  </span>
                )}
                {tmpl.isNew && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                    Novo
                  </span>
                )}
              </div>

              {/* Color Swatch Dots */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: tmpl.colors.primary }} title="Cor Primária"></div>
                <div className="w-4 h-4 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: tmpl.colors.accent }} title="Cor de Destaque"></div>
                <div className="w-4 h-4 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: tmpl.colors.background }} title="Fundo"></div>
              </div>

              {/* Quick Preview Button */}
              <button
                onClick={() => setPreviewTemplate(tmpl)}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1 backdrop-blur-xs transition-transform cursor-pointer"
              >
                <Eye className="w-3 h-3 text-rose-800" />
                Visualizar
              </button>
            </div>

            {/* Template Body */}
            <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h3 className="font-bold text-sm text-slate-900">{tmpl.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{tmpl.description}</p>
                <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>Fonte: {tmpl.fontFamily.split(',')[0]}</span>
                  <span>•</span>
                  <span>{tmpl.hasMusicPlayer ? 'Música ✓' : 'Sem Áudio'}</span>
                  <span>•</span>
                  <span>QR Pass ✓</span>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <button
                  onClick={() => handleDuplicate(tmpl)}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  title="Duplicar modelo"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(tmpl)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Editar configurações do modelo"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir modelo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl space-y-5 my-8"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-rose-800" />
                  <h3 className="font-bold text-base text-slate-900">
                    {editingTemplate ? `Editar Modelo: ${editingTemplate.name}` : 'Criar Novo Modelo Pronto'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome do Modelo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Luanda Luxury Ouro & Veludo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Categoria</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 cursor-pointer font-medium"
                    >
                      <option value="Luxo">Luxo</option>
                      <option value="Clássico">Clássico</option>
                      <option value="Moderno">Moderno</option>
                      <option value="Minimalista">Minimalista</option>
                      <option value="Tropical">Tropical</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Família Tipográfica</label>
                    <select
                      value={fontFamily}
                      onChange={e => setFontFamily(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 cursor-pointer font-medium"
                    >
                      <option value="Playfair Display, serif">Playfair Display (Serif Nobre)</option>
                      <option value="Cormorant Garamond, serif">Cormorant Garamond (Elegante)</option>
                      <option value="Cinzel, serif">Cinzel (Imperial / Monumental)</option>
                      <option value="Great Vibes, cursive">Great Vibes (Caligráfico)</option>
                      <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans (Moderno)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Descrição do Estilo</label>
                  <textarea
                    rows={2}
                    placeholder="Descreva as características visuais deste tema..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-normal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">URL da Imagem de Capa do Modelo</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={previewImageUrl}
                    onChange={e => setPreviewImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                  />
                </div>

                {/* Palette selection */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                  <span className="font-bold text-[11px] text-slate-800 block">Paleta Cromática do Modelo</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Primária</label>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={e => setPrimaryColor(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Destaque</label>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Fundo</label>
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={e => setBackgroundColor(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Texto</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={e => setTextColor(e.target.value)}
                        className="w-full h-8 rounded-lg cursor-pointer border border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Features toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMusicPlayer}
                      onChange={e => setHasMusicPlayer(e.target.checked)}
                      className="rounded text-rose-800"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Reprodutor de Música</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCountdown}
                      onChange={e => setHasCountdown(e.target.checked)}
                      className="rounded text-rose-800"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Contador Regressivo</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPopular}
                      onChange={e => setIsPopular(e.target.checked)}
                      className="rounded text-rose-800"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Destaque "Popular"</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-150 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNew}
                      onChange={e => setIsNew(e.target.checked)}
                      className="rounded text-rose-800"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Selo "Novo"</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                  >
                    Salvar Modelo ✓
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK PREVIEW MODAL */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full border border-slate-100 shadow-2xl space-y-4"
            >
              {/* Header */}
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm">{previewTemplate.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Categoria: {previewTemplate.category}</span>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Simulated Mobile Frame with this template */}
              <div className="p-6 flex flex-col items-center justify-center bg-slate-100">
                <div 
                  className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border p-6 text-center space-y-4"
                  style={{ 
                    backgroundColor: previewTemplate.colors.background,
                    color: previewTemplate.colors.text,
                    fontFamily: previewTemplate.fontFamily
                  }}
                >
                  <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: previewTemplate.colors.accent }}>
                    Convite de Casamento
                  </div>
                  <h2 className="text-2xl font-bold" style={{ color: previewTemplate.colors.primary }}>
                    Sofia & Gabriel
                  </h2>
                  <p className="text-xs opacity-80 max-w-xs mx-auto">
                    Convidamos você para celebrar nossa união em uma noite inesquecível de amor.
                  </p>

                  <div className="p-3 rounded-xl border bg-white/70 backdrop-blur-xs text-xs space-y-1" style={{ borderColor: previewTemplate.colors.accent }}>
                    <div className="font-bold">Sábado, 28 de Outubro de 2026</div>
                    <div className="opacity-70 text-[11px]">Luanda, Angola</div>
                  </div>

                  <div className="pt-2">
                    <span 
                      className="inline-block px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: previewTemplate.colors.primary }}
                    >
                      Confirmar Presença (RSVP)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-150">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
