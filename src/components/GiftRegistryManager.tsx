import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, Plus, Edit2, Trash2, CheckCircle2, Copy, Check, 
  Share2, DollarSign, Building, Sparkles, 
  Search, Filter, ShoppingBag, Heart, Plane, Home, Tv, Wine, Coffee,
  MessageCircle, Clock, Smartphone, Info, RefreshCw, Send, CheckCircle,
  Tag, ExternalLink
} from 'lucide-react';
import { WeddingConfig, WeddingRegistryItem, WeddingGiftInfo } from '../types';

interface GiftRegistryManagerProps {
  config: WeddingConfig;
  onUpdateConfig: (config: WeddingConfig) => void;
  onNavigateTab?: (tab: string) => void;
}

const GIFT_CATEGORIES = [
  { id: 'all', label: 'Todos os Presentes', icon: Sparkles },
  { id: 'lua_de_mel', label: 'Lua de Mel & Viagem', icon: Plane },
  { id: 'eletro', label: 'Eletrodomésticos', icon: Tv },
  { id: 'cozinha', label: 'Cozinha & Gourmet', icon: Coffee },
  { id: 'sala_quarto', label: 'Sala, Quarto & Banho', icon: Home },
  { id: 'experiencias', label: 'Experiências & Spa', icon: Wine },
  { id: 'cotas_dinheiro', label: 'Cotas em Dinheiro', icon: DollarSign }
];

const PRESET_GIFTS: Omit<WeddingRegistryItem, 'id'>[] = [
  {
    name: 'Cota de Lua de Mel: Passeio de Lancha no Mussulo',
    price: 95000,
    category: 'lua_de_mel',
    description: 'Passeio náutico com champanhe e pôr do sol na baía.',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Cota de Lua de Mel: Jantar Romântico com Vista Mar',
    price: 80000,
    category: 'lua_de_mel',
    description: 'Menu degustação para os noivos brindarem a união.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Batedeira Planetária KitchenAid Artisan',
    price: 260000,
    category: 'eletro',
    description: 'Para o preparo de massas, pães e doces especiais no novo lar.',
    imageUrl: 'https://images.unsplash.com/photo-1594385208974-2e75f9d8a8be?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Máquina de Café Espresso DeLonghi Automática',
    price: 340000,
    category: 'eletro',
    description: 'Café moído na hora para energizar os dias dos noivos.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Aparelho de Jantar Porcelana Fina (12 Lugares)',
    price: 380000,
    category: 'cozinha',
    description: 'Conjunto completo para jantares elegantes em família.',
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Jogo de Panelas Cerâmica Antiaderente Le Creuset',
    price: 310000,
    category: 'cozinha',
    description: 'Panelas de alta durabilidade e acabamento premium.',
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Smart TV 65" 4K OLED de Última Geração',
    price: 720000,
    category: 'sala_quarto',
    description: 'Cinema em casa para as noites de descanso.',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Jogo de Lençóis 1000 Fios Algodão Egípcio King',
    price: 210000,
    category: 'sala_quarto',
    description: 'Conforto e maciez extrema para a suíte principal.',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Dia de Spa Completo para os Noivos (Massagem Dupla)',
    price: 150000,
    category: 'experiencias',
    description: 'Dia relaxante de aromaterapia e banhos termais.',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Adega Climatizada Dual Zone para 24 Garrafas',
    price: 430000,
    category: 'eletro',
    description: 'Para armazenar e brindar com os melhores vinhos e espumantes.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Cota de Lua de Mel: Passagens Aéreas Internacionais',
    price: 250000,
    category: 'lua_de_mel',
    description: 'Ajude os noivos a voar rumo ao destino dos sonhos.',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400'
  },
  {
    name: 'Aspirador Robô Inteligente com Mapeamento Laser',
    price: 180000,
    category: 'eletro',
    description: 'Praticidade total para manter a casa sempre limpa.',
    imageUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=400'
  }
];

export default function GiftRegistryManager({ config, onUpdateConfig }: GiftRegistryManagerProps) {
  const giftRegistry: WeddingGiftInfo = config.giftRegistry || {
    pixKey: '+244 923 456 789',
    pixQrCode: '',
    bankName: 'BFA - Banco de Fomento Angola',
    bankAgency: 'Agência Talatona (0042)',
    bankAccount: 'AO06 0006 0042 0001 9472 0090 1',
    iban: 'AO06 0006 0042 0001 9472 0090 1',
    multicaixaPhone: '+244 923 456 789',
    bankRecipient: `${config.brideGroom.brideName} & ${config.brideGroom.groomName}`,
    customInstructions: 'As transferências podem ser efetuadas via Multicaixa Express ou IBAN bancário direto.',
    registryItems: []
  };

  const registryItems: WeddingRegistryItem[] = giftRegistry.registryItems || [];

  // Navigation Submenu: 'catalog' | 'received' | 'bank'
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'received' | 'bank'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WeddingRegistryItem | null>(null);
  
  // Item form states
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemCategory, setItemCategory] = useState<string>('eletro');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemClaimedBy, setItemClaimedBy] = useState('');
  const [itemGuestMessage, setItemGuestMessage] = useState('');

  // Bank Info modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState(giftRegistry.bankName || 'BFA - Banco de Fomento Angola');
  const [bankAgency, setBankAgency] = useState(giftRegistry.bankAgency || 'Agência Talatona (0042)');
  const [bankAccount, setBankAccount] = useState(giftRegistry.bankAccount || 'AO06 0006 0042 0001 9472 0090 1');
  const [bankRecipient, setBankRecipient] = useState(giftRegistry.bankRecipient || `${config.brideGroom.brideName} & ${config.brideGroom.groomName}`);
  const [multicaixaPhone, setMulticaixaPhone] = useState(giftRegistry.multicaixaPhone || giftRegistry.pixKey || '+244 923 456 789');
  const [customInstructions, setCustomInstructions] = useState(giftRegistry.customInstructions || '');

  // Metrics
  const totalGiftValue = registryItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const claimedItems = registryItems.filter(item => Boolean(item.claimedBy));
  const claimedValue = claimedItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const availableItems = registryItems.filter(item => !item.claimedBy);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemPrice('');
    setItemCategory('eletro');
    setItemDescription('');
    setItemImage('https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=400');
    setItemClaimedBy('');
    setItemGuestMessage('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: WeddingRegistryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price);
    setItemCategory(item.category || 'eletro');
    setItemDescription(item.description || '');
    setItemImage(item.imageUrl);
    setItemClaimedBy(item.claimedBy || '');
    setItemGuestMessage(item.guestMessage || '');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice) return;

    let updatedList: WeddingRegistryItem[];

    if (editingItem) {
      updatedList = registryItems.map(it => it.id === editingItem.id ? {
        ...it,
        name: itemName.trim(),
        price: Number(itemPrice),
        category: itemCategory,
        description: itemDescription.trim() || undefined,
        imageUrl: itemImage.trim() || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=400',
        claimedBy: itemClaimedBy.trim() || undefined,
        guestMessage: itemGuestMessage.trim() || undefined
      } : it);
    } else {
      const newItem: WeddingRegistryItem = {
        id: 'gift_' + Date.now(),
        name: itemName.trim(),
        price: Number(itemPrice),
        category: itemCategory,
        description: itemDescription.trim() || undefined,
        imageUrl: itemImage.trim() || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=400',
        claimedBy: itemClaimedBy.trim() || undefined,
        guestMessage: itemGuestMessage.trim() || undefined
      };
      updatedList = [newItem, ...registryItems];
    }

    const updatedConfig: WeddingConfig = {
      ...config,
      giftRegistry: {
        ...giftRegistry,
        registryItems: updatedList
      }
    };

    onUpdateConfig(updatedConfig);
    setIsItemModalOpen(false);
  };

  const handleAddPresetGift = (preset: Omit<WeddingRegistryItem, 'id'>) => {
    const newItem: WeddingRegistryItem = {
      id: 'gift_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      ...preset
    };

    const updatedList = [newItem, ...registryItems];
    const updatedConfig: WeddingConfig = {
      ...config,
      giftRegistry: {
        ...giftRegistry,
        registryItems: updatedList
      }
    };

    onUpdateConfig(updatedConfig);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Deseja realmente excluir este presente da lista?')) {
      const updatedList = registryItems.filter(it => it.id !== id);
      const updatedConfig: WeddingConfig = {
        ...config,
        giftRegistry: {
          ...giftRegistry,
          registryItems: updatedList
        }
      };
      onUpdateConfig(updatedConfig);
    }
  };

  const handleToggleClaimStatus = (item: WeddingRegistryItem) => {
    const isClaimed = Boolean(item.claimedBy);
    const updatedList = registryItems.map(it => it.id === item.id ? {
      ...it,
      claimedBy: isClaimed ? undefined : 'Convidado Padrinho',
      claimedDate: isClaimed ? undefined : new Date().toISOString().split('T')[0],
      guestMessage: isClaimed ? undefined : 'Muitas felicidades ao lindo casal! Que Deus abençoe essa união.'
    } : it);

    const updatedConfig: WeddingConfig = {
      ...config,
      giftRegistry: {
        ...giftRegistry,
        registryItems: updatedList
      }
    };

    onUpdateConfig(updatedConfig);
  };

  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig: WeddingConfig = {
      ...config,
      giftRegistry: {
        ...giftRegistry,
        bankName,
        bankAgency,
        bankAccount,
        iban: bankAccount,
        bankRecipient,
        pixKey: multicaixaPhone,
        multicaixaPhone,
        customInstructions
      }
    };
    onUpdateConfig(updatedConfig);
    setIsBankModalOpen(false);
  };

  const shareWhatsApp = () => {
    const couple = `${config.brideGroom.brideName} & ${config.brideGroom.groomName}`;
    const text = encodeURIComponent(
      `🎁 *Lista de Presentes de Casamento - ${couple}*\n\n` +
      `Olá querido(a)! Preparamos com muito carinho a nossa lista de presentes e cotas para o nosso casamento.\n\n` +
      `💳 *Coordenadas Bancárias (IBAN):*\n` +
      `• Banco: ${giftRegistry.bankName}\n` +
      `• IBAN: ${giftRegistry.bankAccount}\n` +
      `• Titular: ${giftRegistry.bankRecipient}\n` +
      (giftRegistry.multicaixaPhone || giftRegistry.pixKey ? `• Multicaixa Express / Tel: ${giftRegistry.multicaixaPhone || giftRegistry.pixKey}\n\n` : '\n') +
      `Agradecemos do fundo do coração por todo o seu carinho e bênçãos para este novo capítulo! ❤️`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const sendThankYouWhatsApp = (item: WeddingRegistryItem) => {
    const guest = item.claimedBy || 'Querido(a) Convidado(a)';
    const text = encodeURIComponent(
      `Olá ${guest}! ❤️\n\n` +
      `Passando para agradecer imensamente pelo carinho do presente *${item.name}*!\n\n` +
      `Sua presença e bênção em nossas vidas tornam nosso casamento ainda mais inesquecível.\n\n` +
      `Com todo nosso amor,\n${config.brideGroom.brideName} & ${config.brideGroom.groomName}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const filteredItems = registryItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.claimedBy && item.claimedBy.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6" id="gift-registry-manager-root">
      
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 p-6 md:p-8 rounded-2xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 border border-rose-500/30 text-rose-300">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            Lista de Casamento & Cotas • {config.brideGroom.brideName} & {config.brideGroom.groomName}
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-medium">Lista de Presentes dos Noivos</h2>
          <p className="text-slate-300 text-xs md:text-sm max-w-xl leading-relaxed">
            Gerencie itens de enxoval, cotas de lua de mel e dados bancários (IBAN / Multicaixa Express) para receber presentes diretamente em sua conta bancária.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10">
          <button
            onClick={() => setIsBankModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm border border-white/15 cursor-pointer"
          >
            <Building className="w-4 h-4 text-amber-400" />
            Dados Bancários / IBAN
          </button>
          
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Sugestões Prontas ✨
          </button>

          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-white" />
            Partilhar Lista
          </button>

          <button
            onClick={handleOpenAddItem}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Novo Presente
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Valor Total da Lista',
            value: `${totalGiftValue.toLocaleString('pt-AO')} Kz`,
            sub: `${registryItems.length} presentes cadastrados`,
            icon: DollarSign,
            color: 'text-slate-700 bg-slate-100'
          },
          {
            title: 'Arrecadado / Reservado',
            value: `${claimedValue.toLocaleString('pt-AO')} Kz`,
            sub: `${claimedItems.length} presentes garantidos por convidados`,
            icon: CheckCircle2,
            color: 'text-emerald-700 bg-emerald-50 border border-emerald-100'
          },
          {
            title: 'Presentes Livres',
            value: `${availableItems.length} itens`,
            sub: 'Disponíveis para escolha',
            icon: ShoppingBag,
            color: 'text-rose-700 bg-rose-50 border border-rose-100'
          },
          {
            title: 'Progresso da Lista',
            value: `${registryItems.length > 0 ? Math.round((claimedItems.length / registryItems.length) * 100) : 0}%`,
            sub: `${claimedItems.length} de ${registryItems.length} presentes`,
            icon: Sparkles,
            color: 'text-amber-700 bg-amber-50 border border-amber-100'
          }
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-slate-900 tracking-tight">{card.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SUBMENU DE NAVEGAÇÃO INTERNA NA LISTA DE PRESENTES */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'catalog'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Catálogo de Presentes ({registryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('received')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'received'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Presentes Recebidos & Mensagens</span>
            {claimedItems.length > 0 && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                activeSubTab === 'received' ? 'bg-white text-rose-900' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {claimedItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'bank'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Coordenadas Bancárias & Multicaixa</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>+ Ideias de Presentes</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: CATALOG */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-5">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {GIFT_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const count = cat.id === 'all' 
                ? registryItems.length 
                : registryItems.filter(i => i.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isSelected 
                      ? 'bg-rose-950 text-white border-rose-950 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-rose-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Actions Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar presentes por nome, descrição ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Mostrando <strong>{filteredItems.length}</strong> de {registryItems.length} itens
              </span>
              <button
                onClick={handleOpenAddItem}
                className="px-3.5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Presente
              </button>
            </div>
          </div>

          {/* Gift Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-150 text-center text-slate-400 text-xs font-medium space-y-4">
              <Gift className="w-12 h-12 text-rose-300 mx-auto stroke-[1.2]" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800">Nenhum presente encontrado nesta categoria</h4>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Você pode cadastrar um presente personalizado ou usar nossa biblioteca de sugestões pré-configuradas.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsPresetModalOpen(true)}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ✨ Ver Sugestões Prontas
                </button>
                <button
                  onClick={handleOpenAddItem}
                  className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Cadastrar Presente
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredItems.map(item => {
                const isClaimed = Boolean(item.claimedBy);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between group hover:shadow-md ${
                      isClaimed 
                        ? 'border-emerald-200/80 bg-emerald-50/15' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Image container */}
                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs uppercase tracking-wider">
                          {GIFT_CATEGORIES.find(c => c.id === item.category)?.label || 'Presente'}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1 ${
                          isClaimed 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-white/95 text-slate-800 backdrop-blur-xs'
                        }`}>
                          {isClaimed ? (
                            <>
                              <Check className="w-3 h-3" />
                              Presenteado
                            </>
                          ) : (
                            'Disponível'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Body details */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">{item.name}</h4>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 font-light leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="text-rose-900 font-bold text-base mt-2">
                          {item.price.toLocaleString('pt-AO')} Kz
                        </div>

                        {isClaimed && (
                          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                            <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                              Presenteado por: <strong>{item.claimedBy}</strong>
                            </div>
                            {item.guestMessage && (
                              <p className="text-[10px] text-slate-600 italic line-clamp-2">
                                "{item.guestMessage}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <button
                          onClick={() => handleToggleClaimStatus(item)}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            isClaimed
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100'
                          }`}
                        >
                          {isClaimed ? 'Desmarcar' : 'Marcar Recebido'}
                        </button>

                        <div className="flex items-center gap-1">
                          {isClaimed && (
                            <button
                              onClick={() => sendThankYouWhatsApp(item)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Enviar mensagem de agradecimento via WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar presente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir presente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: RECEIVED GIFTS & MESSAGES */}
      {activeSubTab === 'received' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600 fill-rose-600/20" />
                  Extrato de Presentes Recebidos & Mensagens de Carinho
                </h3>
                <p className="text-xs text-slate-400">Acompanhe quem já presenteou e envie notas de agradecimento pelo WhatsApp</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                  Total Arrecadado: {claimedValue.toLocaleString('pt-AO')} Kz
                </span>
              </div>
            </div>

            {claimedItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-3">
                <Heart className="w-10 h-10 text-slate-200 mx-auto" />
                <p>Nenhum presente foi marcado como recebido ainda.</p>
                <p className="text-[11px] text-slate-400">Assim que os convidados escolherem presentes no site ou você marcar na lista, eles aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claimedItems.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" 
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-slate-900 font-bold">{item.claimedBy || 'Convidado'}</strong>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                            Confirmado
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          Presenteou: <strong className="text-rose-900">{item.name}</strong> • {item.price.toLocaleString('pt-AO')} Kz
                        </div>
                        {item.guestMessage && (
                          <div className="text-xs text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/60 max-w-xl">
                            "{item.guestMessage}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => sendThankYouWhatsApp(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Agradecer no WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleToggleClaimStatus(item)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-xs font-semibold"
                        title="Desmarcar recebimento"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: BANK COORDINATES (IBAN & MULTICAIXA) */}
      {activeSubTab === 'bank' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-150 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-700 border border-amber-100">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Coordenadas Bancárias & Multicaixa Express (Angola)</h3>
                <p className="text-xs text-slate-400">Estas informações são apresentadas aos convidados para transferências diretas em Kwanzas</p>
              </div>
            </div>
            <button
              onClick={() => setIsBankModalOpen(true)}
              className="px-4 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar Coordenadas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Instituição Bancária</span>
              <div className="font-bold text-sm text-slate-900">{giftRegistry.bankName}</div>
              <div className="text-slate-500 text-xs">{giftRegistry.bankAgency}</div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Número de IBAN (Angola)</span>
                <button
                  onClick={() => handleCopy(giftRegistry.bankAccount, 'iban_tab')}
                  className="text-rose-800 hover:text-rose-950 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'iban_tab' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'iban_tab' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm tracking-wider select-all">{giftRegistry.bankAccount}</div>
              <div className="text-slate-500 text-xs">Titular: {giftRegistry.bankRecipient}</div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Multicaixa Express / Telefone</span>
                {giftRegistry.multicaixaPhone && (
                  <button
                    onClick={() => handleCopy(giftRegistry.multicaixaPhone || '', 'mcx_tab')}
                    className="text-rose-800 hover:text-rose-950 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'mcx_tab' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedField === 'mcx_tab' ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">{giftRegistry.multicaixaPhone || giftRegistry.pixKey || 'Não configurado'}</div>
              <div className="text-slate-500 text-xs">Permite transferência rápida pelo app Multicaixa</div>
            </div>
          </div>

          {giftRegistry.customInstructions && (
            <div className="p-4 bg-amber-50 border border-amber-200/70 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                Instruções Personalizadas aos Convidados
              </span>
              <p className="text-amber-800 leading-relaxed font-medium">{giftRegistry.customInstructions}</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: PRESET SUGGESTIONS LIBRARY */}
      <AnimatePresence>
        {isPresetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-150 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Sugestões e Ideias Prontas de Presentes</h3>
                    <p className="text-[11px] text-slate-400">Adicione presentes populares à sua lista com apenas 1 clique</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPresetModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_GIFTS.map((preset, idx) => {
                    const alreadyAdded = registryItems.some(i => i.name.toLowerCase() === preset.name.toLowerCase());

                    return (
                      <div 
                        key={idx}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-rose-300 transition-all shadow-2xs"
                      >
                        <img 
                          src={preset.imageUrl} 
                          alt={preset.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" 
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-slate-900 truncate">{preset.name}</h5>
                          <span className="text-[11px] font-bold text-rose-800 block">
                            {preset.price.toLocaleString('pt-AO')} Kz
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">
                            {GIFT_CATEGORIES.find(c => c.id === preset.category)?.label || 'Geral'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddPresetGift(preset)}
                          disabled={alreadyAdded}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            alreadyAdded
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-rose-900 hover:bg-rose-950 text-white shadow-xs'
                          }`}
                        >
                          {alreadyAdded ? 'Já Adicionado' : '+ Adicionar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsPresetModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-black transition-all"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT GIFT ITEM */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  {editingItem ? 'Editar Presente da Lista' : 'Adicionar Novo Presente'}
                </h3>
                <button
                  onClick={() => setIsItemModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Título / Nome do Presente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jogo de Panelas Le Creuset ou Cota Lua de Mel"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-semibold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Valor Estimado em Kwanzas (Kz)</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      placeholder="Ex: 50000"
                      value={itemPrice}
                      onChange={e => setItemPrice(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-bold text-rose-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Categoria</label>
                    <select
                      value={itemCategory}
                      onChange={e => setItemCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-semibold text-slate-800"
                    >
                      <option value="eletro">Eletrodomésticos</option>
                      <option value="cozinha">Cozinha & Gourmet</option>
                      <option value="lua_de_mel">Lua de Mel & Viagem</option>
                      <option value="sala_quarto">Sala, Quarto & Banho</option>
                      <option value="experiencias">Experiências & Spa</option>
                      <option value="cotas_dinheiro">Cotas em Dinheiro</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Descrição do Presente (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Adicione um detalhe sobre o item ou para o que será usado..."
                    value={itemDescription}
                    onChange={e => setItemDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium text-slate-800"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">URL da Imagem do Presente</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={itemImage}
                    onChange={e => setItemImage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: 'Casa', url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=400' },
                      { label: 'Eletro', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400' },
                      { label: 'Lua de Mel', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400' },
                      { label: 'Jantar', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400' },
                      { label: 'TV', url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=400' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setItemImage(preset.url)}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-slate-600 font-semibold cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <span className="font-bold text-[11px] text-slate-700 block">Status de Atribuição (Opcional)</span>
                  <div className="space-y-1">
                    <label className="text-slate-500 text-[10px] font-semibold">Nome de Quem Presenteou</label>
                    <input
                      type="text"
                      placeholder="Deixe em branco se o item estiver disponível"
                      value={itemClaimedBy}
                      onChange={e => setItemClaimedBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  {itemClaimedBy && (
                    <div className="space-y-1">
                      <label className="text-slate-500 text-[10px] font-semibold">Mensagem do Convidado</label>
                      <input
                        type="text"
                        placeholder="Ex: Felicidades ao casal! Com carinho..."
                        value={itemGuestMessage}
                        onChange={e => setItemGuestMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                  >
                    Salvar Presente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BANK COORDINATES (IBAN & MULTICAIXA) */}
      <AnimatePresence>
        {isBankModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-rose-800" />
                  <h3 className="font-bold text-base text-slate-900">Coordenadas Bancárias & Multicaixa</h3>
                </div>
                <button
                  onClick={() => setIsBankModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBankInfo} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome do Banco</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BFA, BAI, Banco BIC, Millennium Atlântico, Standard Bank"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Agência / Balcão</label>
                  <input
                    type="text"
                    placeholder="Ex: Agência Talatona (0042)"
                    value={bankAgency}
                    onChange={e => setBankAgency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">IBAN Completo (Angola)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: AO06 0006 0042 0001 9472 0090 1"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-rose-800 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Titular da Conta Bancária</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sofia M Montgomery & Gabriel J Vance"
                    value={bankRecipient}
                    onChange={e => setBankRecipient(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Multicaixa Express / Número de Telefone</label>
                  <input
                    type="text"
                    placeholder="Ex: +244 923 456 789"
                    value={multicaixaPhone}
                    onChange={e => setMulticaixaPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-rose-800 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Instruções para os Convidados (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Pode efetuar a transferência pelo Multicaixa Express ou IBAN e indicar seu nome..."
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBankModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
                  >
                    Salvar Dados
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
