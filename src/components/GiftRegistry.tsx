import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, Plus, Search, Check, Clock, CheckCircle2, 
  Smartphone, FileText, Edit2, Trash2, MessageCircle, 
  Sparkles, X, Download, Copy, LayoutGrid, List, 
  Heart, AlertCircle, Upload, Image as ImageIcon, Camera, Users
} from 'lucide-react';
import { WeddingConfig, WeddingRegistryItem } from '../types';

interface GiftRegistryProps {
  config: WeddingConfig;
  onUpdateConfig: (config: WeddingConfig) => void;
}

// Preset categories for gifts
const GIFT_CATEGORIES = [
  { id: 'all', label: 'Todas Categorias' },
  { id: 'lua_de_mel', label: '🌴 Cotas de Lua de Mel' },
  { id: 'eletro', label: '⚡ Eletrodomésticos' },
  { id: 'cozinha', label: '🍳 Cozinha & Mesa' },
  { id: 'sala_quarto', label: '🛋️ Decoração & Conforto' },
  { id: 'experiencias', label: '✨ Experiências & Lazer' },
  { id: 'outro', label: '📦 Outros Presentes' },
];

// Quick gift suggestions ready to import in AOA
const PRESET_GIFTS: Omit<WeddingRegistryItem, 'id'>[] = [
  {
    name: 'Cota de Lua de Mel: Passeio de Barco no Mussulo',
    price: 85000,
    category: 'lua_de_mel',
    description: 'Passeio romântico privativo de lancha pela costa marítima de Luanda.',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Cota de Lua de Mel: Jantar Romântico à Beira-Mar',
    price: 75000,
    category: 'lua_de_mel',
    description: 'Jantar à luz de velas a dois com degustação gastronômica no Ilha do Cabo.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Máquina de Café Espresso DeLonghi Magnifica',
    price: 490000,
    category: 'eletro',
    description: 'Para manhãs cheias de energia e cafés especiais para receber os convidados.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Batedeira Planetária KitchenAid Artisan',
    price: 250000,
    category: 'eletro',
    description: 'Perfeita para preparar doces, bolos e massas especiais.',
    imageUrl: 'https://images.unsplash.com/photo-1594385208974-2e75f9d8a8be?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Aparelho de Jantar Porcelana Fina (12 Lugares)',
    price: 380000,
    category: 'cozinha',
    description: 'Conjunto completo com pratos rasos, fundos, sobremesa e xícaras de café.',
    imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Jogo de Panelas Antiaderente Cerâmica Le Creuset',
    price: 310000,
    category: 'cozinha',
    description: 'Conjunto durável com caçarolas e frigideiras de alta performance.',
    imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29283f3e1b1?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Smart TV 65" 4K OLED para Sala de Estar',
    price: 680000,
    category: 'sala_quarto',
    description: 'Para as noites de cinema e séries juntinhos no sofá.',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Jogo de Cama King Fio Egípcio 600 Fios',
    price: 160000,
    category: 'sala_quarto',
    description: 'Lençóis macios e sofisticados para a suíte principal do casal.',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Aspirador Robô Inteligente com Mapeamento Laser',
    price: 220000,
    category: 'eletro',
    description: 'Praticidade para manter o novo lar sempre limpo e organizado.',
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  },
  {
    name: 'Cota de Lua de Mel: Massagem Relaxante para o Casal no Spa',
    price: 90000,
    category: 'experiencias',
    description: 'Sessão completa de aromaterapia e relaxamento a dois.',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=400',
    status: 'disponivel'
  }
];

export default function GiftRegistry({ config, onUpdateConfig }: GiftRegistryProps) {
  // Items list
  const registryItems = config.giftRegistry?.registryItems || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'disponivel' | 'reservado' | 'recebido'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WeddingRegistryItem | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<WeddingRegistryItem | null>(null);
  const [showBankSettingsModal, setShowBankSettingsModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states for Add/Edit item
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'eletro',
    description: '',
    imageUrl: '',
    status: 'disponivel' as 'disponivel' | 'reservado' | 'recebido',
    claimedBy: '',
    claimedPhone: '',
    guestMessage: '',
    claimedDate: ''
  });

  // Banking Info form state
  const [bankFormData, setBankFormData] = useState({
    multicaixaPhone: config.giftRegistry?.multicaixaPhone || '+244 923 456 789',
    iban: config.giftRegistry?.iban || 'AO06 0006 0042 0001 9472 0090 1',
    bankName: config.giftRegistry?.bankName || 'BFA - Banco de Fomento Angola',
    bankAccount: config.giftRegistry?.bankAccount || '194720090',
    accountHolder: config.giftRegistry?.accountHolder || `${config.brideGroom.brideName} & ${config.brideGroom.groomName || 'Gabriel'}`,
    pixKey: config.giftRegistry?.pixKey || '+244 923 456 789',
    customInstructions: config.giftRegistry?.customInstructions || 'As transferências podem ser efetuadas via Multicaixa Express ou IBAN bancário direto. Coloque o seu nome no descritivo para podermos agradecer!'
  });

  // Helper to determine accurate status
  const getItemStatus = (item: WeddingRegistryItem): 'disponivel' | 'reservado' | 'recebido' => {
    if (item.status) return item.status;
    if (item.paymentStatus === 'received') return 'recebido';
    if (item.claimedBy) return 'reservado';
    return 'disponivel';
  };

  // Helper to format currency in AOA / Kwanzas
  const formatAOA = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val) + ' Kz';
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalItems = registryItems.length;
    let totalValue = 0;
    let receivedValue = 0;
    let reservedValue = 0;
    let availableCount = 0;
    let reservedCount = 0;
    let receivedCount = 0;

    registryItems.forEach(item => {
      const price = Number(item.price) || 0;
      totalValue += price;
      const status = getItemStatus(item);
      if (status === 'recebido') {
        receivedValue += price;
        receivedCount += 1;
      } else if (status === 'reservado') {
        reservedValue += price;
        reservedCount += 1;
      } else {
        availableCount += 1;
      }
    });

    const completionRate = totalValue > 0 ? Math.round(((receivedValue + reservedValue) / totalValue) * 100) : 0;

    return {
      totalItems,
      totalValue,
      receivedValue,
      reservedValue,
      availableCount,
      reservedCount,
      receivedCount,
      completionRate
    };
  }, [registryItems]);

  // Filtered items list
  const filteredItems = useMemo(() => {
    return registryItems.filter(item => {
      // Search term
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.claimedBy && item.claimedBy.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
        item.category === selectedCategory ||
        (selectedCategory === 'lua_de_mel' && (item.category === 'Lua de Mel' || item.category === 'cotas_dinheiro')) ||
        (selectedCategory === 'eletro' && item.category === 'Eletrodomésticos') ||
        (selectedCategory === 'cozinha' && item.category === 'Cozinha') ||
        (selectedCategory === 'sala_quarto' && item.category === 'Decoração');

      // Status filter
      const currentStatus = getItemStatus(item);
      const matchesStatus = selectedStatus === 'all' || currentStatus === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [registryItems, searchTerm, selectedCategory, selectedStatus]);

  // Handle open add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      price: '',
      category: 'eletro',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1584990347449-a29283f3e1b1?auto=format&fit=crop&q=80&w=400',
      status: 'disponivel',
      claimedBy: '',
      claimedPhone: '',
      guestMessage: '',
      claimedDate: ''
    });
    setShowAddEditModal(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (item: WeddingRegistryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category || 'eletro',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      status: getItemStatus(item),
      claimedBy: item.claimedBy || '',
      claimedPhone: item.claimedPhone || '',
      guestMessage: item.guestMessage || '',
      claimedDate: item.claimedDate || ''
    });
    setShowAddEditModal(true);
  };

  // Handle Save / Add Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor, informe o nome do presente.');
      return;
    }

    const priceNum = parseFloat(formData.price.replace(/[^0-9.]/g, '')) || 0;
    if (priceNum <= 0) {
      alert('Por favor, informe um valor válido em AOA.');
      return;
    }

    const updatedItem: WeddingRegistryItem = {
      id: editingItem ? editingItem.id : `gift_${Date.now()}`,
      name: formData.name.trim(),
      price: priceNum,
      category: formData.category,
      description: formData.description.trim(),
      imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=400',
      status: formData.status,
      claimedBy: formData.status !== 'disponivel' ? formData.claimedBy.trim() || 'Convidado Especial' : undefined,
      claimedPhone: formData.status !== 'disponivel' ? formData.claimedPhone.trim() : undefined,
      guestMessage: formData.status !== 'disponivel' ? formData.guestMessage.trim() : undefined,
      claimedDate: formData.status !== 'disponivel' ? (formData.claimedDate || new Date().toISOString().split('T')[0]) : undefined,
      paymentStatus: formData.status === 'recebido' ? 'received' : 'pending',
      contributors: editingItem?.contributors || [],
      totalCollected: editingItem?.totalCollected || (formData.status === 'recebido' ? priceNum : 0),
      isQuota: editingItem?.isQuota || formData.category === 'lua_de_mel' || formData.category === 'cotas_dinheiro'
    };

    let newItems: WeddingRegistryItem[];
    if (editingItem) {
      newItems = registryItems.map(it => it.id === editingItem.id ? updatedItem : it);
    } else {
      newItems = [updatedItem, ...registryItems];
    }

    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: newItems
      }
    });

    setShowAddEditModal(false);
  };

  // Handle Delete Item
  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o presente "${name}" da lista?`)) {
      const newItems = registryItems.filter(it => it.id !== id);
      onUpdateConfig({
        ...config,
        giftRegistry: {
          ...config.giftRegistry,
          registryItems: newItems
        }
      });
    }
  };

  // Handle Instant Status Change
  const handleQuickStatusChange = (item: WeddingRegistryItem, newStatus: 'disponivel' | 'reservado' | 'recebido') => {
    if (newStatus === 'reservado' && !item.claimedBy) {
      // Open modal to specify who reserved it
      setShowStatusModal(item);
      return;
    }

    const updated = registryItems.map(it => {
      if (it.id === item.id) {
        return {
          ...it,
          status: newStatus,
          paymentStatus: (newStatus === 'recebido' ? 'received' : 'pending') as 'received' | 'pending',
          claimedBy: newStatus === 'disponivel' ? undefined : (it.claimedBy || 'Convidado Especial'),
          claimedDate: newStatus === 'disponivel' ? undefined : (it.claimedDate || new Date().toISOString().split('T')[0])
        };
      }
      return it;
    });

    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: updated
      }
    });
  };

  // Save Reservation Details from Status Modal
  const handleSaveStatusModal = (guestName: string, guestPhone: string, guestMsg: string, status: 'reservado' | 'recebido') => {
    if (!showStatusModal) return;

    const updated = registryItems.map(it => {
      if (it.id === showStatusModal.id) {
        return {
          ...it,
          status,
          paymentStatus: (status === 'recebido' ? 'received' : 'pending') as 'received' | 'pending',
          claimedBy: guestName.trim() || 'Convidado Especial',
          claimedPhone: guestPhone.trim() || undefined,
          guestMessage: guestMsg.trim() || undefined,
          claimedDate: new Date().toISOString().split('T')[0]
        };
      }
      return it;
    });

    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: updated
      }
    });

    setShowStatusModal(null);
  };

  // Handle Import Preset Gift
  const handleImportPreset = (preset: Omit<WeddingRegistryItem, 'id'>) => {
    const newItem: WeddingRegistryItem = {
      ...preset,
      id: `gift_preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };

    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: [newItem, ...registryItems]
      }
    });
  };

  // Handle Save Bank Info
  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        multicaixaPhone: bankFormData.multicaixaPhone,
        iban: bankFormData.iban,
        bankName: bankFormData.bankName,
        bankAccount: bankFormData.bankAccount,
        accountHolder: bankFormData.accountHolder,
        pixKey: bankFormData.pixKey,
        customInstructions: bankFormData.customInstructions
      }
    });
    setShowBankSettingsModal(false);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Item', 'Categoria', 'Valor (AOA)', 'Status', 'Reservado Por', 'Telefone', 'Data', 'Mensagem'];
    const rows = registryItems.map(it => [
      `"${it.id}"`,
      `"${it.name.replace(/"/g, '""')}"`,
      `"${it.category || ''}"`,
      `"${it.price}"`,
      `"${getItemStatus(it)}"`,
      `"${(it.claimedBy || '').replace(/"/g, '""')}"`,
      `"${it.claimedPhone || ''}"`,
      `"${it.claimedDate || ''}"`,
      `"${(it.guestMessage || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lista_presentes_${config.slug || 'casamento'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-slate-800" id="gift-registry-dashboard">
      
      {/* 1. HEADER WITH ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-800 shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900">
              Lista de Presentes & Cotas de Casamento
            </h2>
            <p className="text-xs text-slate-500">
              Defina itens e cotas em Kwanzas (AOA), acompanhe reservas em tempo real e gerencie dados bancários para depósitos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBankSettingsModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Configurar IBAN e Multicaixa Express"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>Dados Bancários (AOA)</span>
          </button>

          <button
            onClick={() => setShowPresetModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Adicionar presentes sugeridos prontos"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Sugestões Prontas</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-800 hover:bg-rose-900 text-white transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Presente</span>
          </button>
        </div>
      </div>

      {/* 2. MINIMALIST FINANCIAL & PROGRESS KPI SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Itens */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total de Itens</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalItems}</span>
            <span className="text-xs text-slate-400 font-medium">cadastrados</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{stats.availableCount} disponíveis</span>
          </div>
        </div>

        {/* Valor Total da Lista */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Meta Total da Lista</span>
          <div className="text-xl md:text-2xl font-bold text-slate-900 truncate">
            {formatAOA(stats.totalValue)}
          </div>
          <span className="text-[11px] text-slate-400 font-medium block">
            Soma de todos os presentes
          </span>
        </div>

        {/* Valor Recebido / Confirmado */}
        <div className="bg-white p-4 rounded-2xl border border-rose-150 shadow-xs space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full blur-xl -z-10"></div>
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">Recebido / Confirmado</span>
          <div className="text-xl md:text-2xl font-bold text-rose-900 truncate">
            {formatAOA(stats.receivedValue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
            <span>{stats.receivedCount} {stats.receivedCount === 1 ? 'presente' : 'presentes'}</span>
            <span className="font-bold text-rose-800">{stats.completionRate}% da meta</span>
          </div>
        </div>

        {/* Valor Reservado (Pendente) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Reservado (Aguardando)</span>
          <div className="text-xl md:text-2xl font-bold text-amber-900 truncate">
            {formatAOA(stats.reservedValue)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{stats.reservedCount} em andamento</span>
          </div>
        </div>
      </div>

      {/* 3. FILTER, SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do presente, descrição ou convidado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'Todos', count: stats.totalItems },
              { id: 'disponivel', label: 'Disponíveis', count: stats.availableCount },
              { id: 'reservado', label: 'Reservados', count: stats.reservedCount },
              { id: 'recebido', label: 'Recebidos', count: stats.receivedCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  selectedStatus === tab.id
                    ? 'bg-white text-rose-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedStatus === tab.id ? 'bg-rose-100 text-rose-900' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher & Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-rose-800' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-rose-800' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer"
              title="Exportar Lista em CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1 shrink-0">Categoria:</span>
          {GIFT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer font-medium ${
                selectedCategory === cat.id
                  ? 'bg-rose-900 text-white font-bold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. ITEMS LIST (GRID OR TABLE) */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Gift className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-sm">Nenhum presente encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Tente ajustar seus filtros de busca ou categoria para visualizar outros itens.'
                : 'Sua lista de presentes está vazia. Comece adicionando seus itens favoritos ou use nossas sugestões prontas em Kwanzas.'}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Adicionar Primeiro Presente
            </button>
            <button
              onClick={() => setShowPresetModal(true)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Carregar Sugestões
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const status = getItemStatus(item);
            return (
              <div 
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  status === 'recebido' 
                    ? 'border-rose-200/80 bg-rose-50/10' 
                    : status === 'reservado' 
                    ? 'border-amber-200/80' 
                    : 'border-slate-200/80 hover:border-rose-300'
                }`}
              >
                <div>
                  {/* Card Image Header */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />

                    {/* Category badge */}
                    {item.category && (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white">
                        {item.category}
                      </span>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      {status === 'recebido' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-900 text-white shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Recebido</span>
                        </span>
                      )}
                      {status === 'reservado' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Reservado</span>
                        </span>
                      )}
                      {status === 'disponivel' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Disponível</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Donor Details if Reserved or Received */}
                    {(status === 'reservado' || status === 'recebido') && item.claimedBy && (
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 space-y-1 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Presenteado por:</span>
                          <strong className="text-slate-900 font-bold">{item.claimedBy}</strong>
                        </div>
                        {item.claimedDate && (
                          <div className="text-[10px] text-slate-400">
                            Data: {item.claimedDate}
                          </div>
                        )}
                        {item.guestMessage && (
                          <p className="text-[10px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 mt-1">
                            "{item.guestMessage}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price and Action Footer */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Valor em AOA</span>
                      <span className="text-base font-bold text-rose-900">
                        {formatAOA(item.price)}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Status Dropdown/Selector */}
                      <div className="relative group">
                        <button
                          onClick={() => {
                            if (status === 'disponivel') {
                              setShowStatusModal(item);
                            } else if (status === 'reservado') {
                              handleQuickStatusChange(item, 'recebido');
                            } else {
                              handleQuickStatusChange(item, 'disponivel');
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            status === 'recebido'
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-900'
                              : status === 'reservado'
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Clique para alternar status"
                        >
                          {status === 'disponivel' && 'Marcar Reservado'}
                          {status === 'reservado' && 'Confirmar Recebido ✓'}
                          {status === 'recebido' && 'Recebido ✓'}
                        </button>
                      </div>

                      {/* WhatsApp thank you if phone present */}
                      {item.claimedPhone && (
                        <a
                          href={`https://wa.me/${item.claimedPhone.replace(/[^0-9]/g, '')}?text=Olá%20${encodeURIComponent(item.claimedBy || '')},%20muito%20obrigado%20pelo%20presente%20"${encodeURIComponent(item.name)}"%20para%20o%20nosso%20casamento!`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                          title="Agradecer no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="Editar Presente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Remover Presente"
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
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Presente</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Valor (AOA)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Convidado / Doador</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const status = getItemStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Image & Title */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <strong className="text-slate-900 font-semibold block">{item.name}</strong>
                            {item.description && (
                              <span className="text-[10px] text-slate-400 line-clamp-1">{item.description}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {item.category || 'Geral'}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 font-bold text-rose-900 whitespace-nowrap">
                        {formatAOA(item.price)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {status === 'recebido' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                            <CheckCircle2 className="w-3 h-3" /> Recebido
                          </span>
                        )}
                        {status === 'reservado' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3" /> Reservado
                          </span>
                        )}
                        {status === 'disponivel' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <Check className="w-3 h-3" /> Disponível
                          </span>
                        )}
                      </td>

                      {/* Donor */}
                      <td className="px-4 py-3 text-slate-600">
                        {item.claimedBy ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">{item.claimedBy}</span>
                            {item.claimedDate && <span className="text-[10px] text-slate-400">{item.claimedDate}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Status button */}
                          <button
                            onClick={() => {
                              if (status === 'disponivel') {
                                setShowStatusModal(item);
                              } else if (status === 'reservado') {
                                handleQuickStatusChange(item, 'recebido');
                              } else {
                                handleQuickStatusChange(item, 'disponivel');
                              }
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            {status === 'disponivel' && 'Reservar'}
                            {status === 'reservado' && 'Receber ✓'}
                            {status === 'recebido' && 'Liberar'}
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-700 rounded-lg cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ADD / EDIT GIFT ITEM MODAL */}
      <AnimatePresence>
        {showAddEditModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-sm">
                    {editingItem ? 'Editar Presente' : 'Adicionar Novo Presente'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddEditModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-xs text-left">
                {/* Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Nome do Presente / Cota</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cafeteira Elétrica Express, Cota de Lua de Mel..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                  />
                </div>

                {/* Price & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Valor em Kwanzas (AOA)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="500"
                      placeholder="Ex: 85000"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                    >
                      <option value="lua_de_mel">🌴 Cotas de Lua de Mel</option>
                      <option value="eletro">⚡ Eletrodomésticos</option>
                      <option value="cozinha">🍳 Cozinha & Mesa</option>
                      <option value="sala_quarto">🛋️ Sala & Quarto</option>
                      <option value="experiencias">✨ Experiências</option>
                      <option value="outro">📦 Outro</option>
                    </select>
                  </div>
                </div>

                {/* Image Upload from Device or URL */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">Foto do Presente</label>
                    <span className="text-[10px] text-slate-400 font-medium">Carregar do dispositivo ou link</span>
                  </div>

                  {/* Device upload button & preview */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center gap-3">
                      {formData.imageUrl ? (
                        <div className="w-16 h-16 rounded-xl bg-slate-150 overflow-hidden border border-slate-200 relative shrink-0 shadow-xs group">
                          <img 
                            src={formData.imageUrl} 
                            alt="Prévia" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold"
                            title="Remover foto"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-6 h-6 stroke-1" />
                        </div>
                      )}

                      <div className="flex-1 space-y-1.5">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/70 text-xs font-bold transition-all cursor-pointer shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-rose-700" />
                          <span>Carregar do Dispositivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === 'string') {
                                      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
                                    }
                                  };
                                  reader.onerror = (err) => {
                                    console.warn("File reading error:", err);
                                  };
                                  reader.readAsDataURL(file);
                                } catch (err) {
                                  console.warn("FileReader exception:", err);
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          Aceita fotos em PNG, JPG, JPEG ou WebP diretamente do seu computador ou telemóvel.
                        </span>
                      </div>
                    </div>

                    {/* Or URL input fallback */}
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] text-slate-500 font-medium mb-1">Ou cole uma URL direta da internet:</div>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl}
                        onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-rose-800 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Descrição / Recado aos Convidados</label>
                  <textarea
                    rows={2}
                    placeholder="Breve descrição do produto ou motivo especial..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium resize-none"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-bold text-slate-700 block">Status do Item</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'disponivel', label: 'Disponível', color: 'emerald' },
                      { id: 'reservado', label: 'Reservado', color: 'amber' },
                      { id: 'recebido', label: 'Recebido', color: 'rose' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: st.id as any })}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          formData.status === st.id
                            ? 'border-rose-800 bg-rose-50 text-rose-900 shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Donor Details if not available */}
                {formData.status !== 'disponivel' && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Dados do Convidado que Presenteou
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nome do Convidado"
                        value={formData.claimedBy}
                        onChange={e => setFormData({ ...formData, claimedBy: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="Telefone (+244...)"
                        value={formData.claimedPhone}
                        onChange={e => setFormData({ ...formData, claimedPhone: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Mensagem deixada pelo convidado..."
                      value={formData.guestMessage}
                      onChange={e => setFormData({ ...formData, guestMessage: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs resize-none"
                    />
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEditModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    {editingItem ? 'Salvar Alterações' : 'Adicionar à Lista'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. STATUS CHANGE & DONOR DETAILS MODAL */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-6"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">Marcar Item como Reservado / Recebido</h3>
                </div>
                <button
                  onClick={() => setShowStatusModal(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs text-left">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm">{showStatusModal.name}</h4>
                  <span className="text-rose-900 font-bold text-xs mt-0.5 block">{formatAOA(showStatusModal.price)}</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Nome do Convidado</label>
                    <input
                      type="text"
                      id="status-guest-name"
                      placeholder="Ex: Padrinho Lucas Vance"
                      defaultValue={showStatusModal.claimedBy || ''}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Telefone para Agradecimento (WhatsApp)</label>
                    <input
                      type="tel"
                      id="status-guest-phone"
                      placeholder="+244 923 000 000"
                      defaultValue={showStatusModal.claimedPhone || ''}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Mensagem ou Nota (Opcional)</label>
                    <textarea
                      rows={2}
                      id="status-guest-msg"
                      placeholder="Recado especial ou observação de pagamento..."
                      defaultValue={showStatusModal.guestMessage || ''}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium resize-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const name = (document.getElementById('status-guest-name') as HTMLInputElement)?.value || '';
                      const phone = (document.getElementById('status-guest-phone') as HTMLInputElement)?.value || '';
                      const msg = (document.getElementById('status-guest-msg') as HTMLTextAreaElement)?.value || '';
                      handleSaveStatusModal(name, phone, msg, 'reservado');
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Marcar como Reservado
                  </button>

                  <button
                    onClick={() => {
                      const name = (document.getElementById('status-guest-name') as HTMLInputElement)?.value || '';
                      const phone = (document.getElementById('status-guest-phone') as HTMLInputElement)?.value || '';
                      const msg = (document.getElementById('status-guest-msg') as HTMLTextAreaElement)?.value || '';
                      handleSaveStatusModal(name, phone, msg, 'recebido');
                    }}
                    className="px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Recebido</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. PRESET SUGGESTIONS IMPORT MODAL */}
      <AnimatePresence>
        {showPresetModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6 flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm">Sugestões Prontas de Presentes (AOA)</h3>
                    <p className="text-[10px] text-slate-400">Adicione cotas e presentes populares com 1 clique</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 text-xs">
                {PRESET_GIFTS.map((preset, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-rose-50/40 rounded-2xl border border-slate-200/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={preset.imageUrl} 
                        alt={preset.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <strong className="text-slate-900 font-semibold block group-hover:text-rose-900 transition-colors">
                          {preset.name}
                        </strong>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-rose-900">{formatAOA(preset.price)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                            {preset.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleImportPreset(preset);
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  onClick={() => setShowPresetModal(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. BANKING & MULTICAIXA SETTINGS MODAL */}
      <AnimatePresence>
        {showBankSettingsModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-sm">Configuração de Dados Bancários (AOA)</h3>
                </div>
                <button
                  onClick={() => setShowBankSettingsModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBankInfo} className="p-6 space-y-4 text-xs text-left">
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Estes dados serão apresentados aos convidados no convite público para transferências de cotas e presentes em dinheiro.
                </p>

                {/* Multicaixa Express */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Número Multicaixa Express (Telefone)</label>
                  <input
                    type="text"
                    required
                    placeholder="+244 923 456 789"
                    value={bankFormData.multicaixaPhone}
                    onChange={e => setBankFormData({ ...bankFormData, multicaixaPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-mono font-medium"
                  />
                </div>

                {/* IBAN */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">IBAN Angola</label>
                  <input
                    type="text"
                    required
                    placeholder="AO06 0006 0042 0001 9472 0090 1"
                    value={bankFormData.iban}
                    onChange={e => setBankFormData({ ...bankFormData, iban: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-mono font-medium"
                  />
                </div>

                {/* Bank Name & Account Holder */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Nome do Banco</label>
                    <input
                      type="text"
                      placeholder="Ex: BFA, BAI, BIC..."
                      value={bankFormData.bankName}
                      onChange={e => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Titular da Conta</label>
                    <input
                      type="text"
                      placeholder="Ex: Sofia & Gabriel"
                      value={bankFormData.accountHolder}
                      onChange={e => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium"
                    />
                  </div>
                </div>

                {/* Custom Instructions */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Instruções aos Convidados</label>
                  <textarea
                    rows={2}
                    placeholder="Orientações sobre envio de comprovativo..."
                    value={bankFormData.customInstructions}
                    onChange={e => setBankFormData({ ...bankFormData, customInstructions: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800 font-medium resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBankSettingsModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Salvar Dados Bancários
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
