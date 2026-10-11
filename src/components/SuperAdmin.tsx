import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, CreditCard, ShieldCheck, Settings, Activity, 
  Users, CheckCircle2, TrendingUp, Sparkles, AlertTriangle, 
  DollarSign, Terminal, ArrowUpRight, Search, Plus, Filter, Tag,
  Edit, Trash2, Key, Copy, Check, Eye, EyeOff, Calendar, Mail, Smartphone, 
  RefreshCw, LayoutDashboard, Sliders, Lock, ExternalLink, QrCode, FileText,
  Database, Cloud
} from 'lucide-react';
import { ClientWeddingSaaS, SystemAuditLog, WeddingConfig, Guest } from '../types';
import { INITIAL_WEDDING_CONFIG } from '../data/defaultConfig';
import ClientReadOnlyModal from './ClientReadOnlyModal';
import SupabaseModal from './SupabaseModal';
import { safeSetItem } from '../utils/storage';
import { isSupabaseConfigured } from '../services/supabase';

export interface SaaSPlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  guestLimit: number | 'Ilimitado';
  storageGB: number;
  badge?: string;
  popular?: boolean;
  features: string[];
  support: string;
}

const DEFAULT_PLANS: SaaSPlanConfig[] = [
  {
    id: 'free',
    name: 'Plano Grátis',
    price: 0,
    period: 'único',
    guestLimit: 15,
    storageGB: 0.5,
    features: ['Até 15 convidados na lista', 'Formulário básico de RSVP', 'Envio manual de links padrão', 'Tema clássico pré-configurado'],
    support: 'Comunidade & Ajuda Online'
  },
  {
    id: 'basic',
    name: 'Plano Essencial',
    price: 45000,
    period: 'único',
    guestLimit: 100,
    storageGB: 1,
    features: ['Até 100 convidados na lista', '1 GB de mídias e fotos', 'Paleta de cores selecionável', 'Suporte comercial por e-mail'],
    support: 'E-mail Comercial (48h)'
  },
  {
    id: 'premium',
    name: 'Plano Premium',
    price: 135000,
    period: 'único',
    guestLimit: 300,
    storageGB: 5,
    popular: true,
    badge: 'Mais Popular',
    features: ['Até 300 convidados na lista', '5 GB de fotos em alta resolução', 'Trilha sonora e música ambiente', 'Suporte prioritário em 24 horas'],
    support: 'Suporte Prioritário 24h'
  },
  {
    id: 'luxury',
    name: 'Plano Luxo',
    price: 225000,
    period: 'único',
    guestLimit: 'Ilimitado',
    storageGB: 15,
    badge: 'Experiência VIP',
    features: ['Convidados ilimitados na lista', '15 GB de armazenamento', 'Editor visual avançado ativo', 'Portaria inteligente via QR Code', 'Suporte Hot-line VIP WhatsApp'],
    support: 'Hot-line VIP WhatsApp Dedicado'
  }
];

interface SuperAdminProps {
  clients: ClientWeddingSaaS[];
  userAccounts: { username: string; pass: string; clientId: string; clientName: string }[];
  auditLogs: SystemAuditLog[];
  onAddClient: (client: ClientWeddingSaaS, accountsToAdd?: { username: string; pass: string }[]) => void;
  onUpdateClient: (updatedClient: ClientWeddingSaaS, updatedAccounts?: { username: string; pass: string }[]) => void;
  onDeleteClient: (clientId: string) => void;
}

export default function SuperAdmin({ 
  clients, 
  userAccounts, 
  auditLogs, 
  onAddClient, 
  onUpdateClient, 
  onDeleteClient 
}: SuperAdminProps) {
  // Tabs: dashboard (Início), clients (Clientes & Casais), plans (Planos & Tarifas), logs (Auditoria), health (Infraestrutura)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'plans' | 'logs' | 'health'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  
  // Read-Only Client Modal
  const [readOnlyClient, setReadOnlyClient] = useState<ClientWeddingSaaS | null>(null);
  const [isReadOnlyModalOpen, setIsReadOnlyModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // CRUD Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWeddingSaaS | null>(null);
  
  // Plans & Tariffs dynamic configuration
  const [plans, setPlans] = useState<SaaSPlanConfig[]>(() => {
    const saved = localStorage.getItem('kutxi_saas_plans');
    return saved ? JSON.parse(saved) : DEFAULT_PLANS;
  });

  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaaSPlanConfig | null>(null);
  const [planFormPrice, setPlanFormPrice] = useState<number>(0);
  const [planFormGuestLimit, setPlanFormGuestLimit] = useState<string>('100');
  const [planFormStorage, setPlanFormStorage] = useState<number>(1);
  const [planFormSupport, setPlanFormSupport] = useState<string>('');
  const [planFormFeatures, setPlanFormFeatures] = useState<string>('');

  useEffect(() => {
    safeSetItem('kutxi_saas_plans', JSON.stringify(plans));
  }, [plans]);

  // Form fields for Client CRUD
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium' | 'Luxury'>('Premium');
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Trial' | 'Expired'>('Active');
  
  // Access Credentials state inside modal
  const [user1Username, setUser1Username] = useState('');
  const [user1Pass, setUser1Pass] = useState('');
  const [user2Username, setUser2Username] = useState('');
  const [user2Pass, setUser2Pass] = useState('');

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Cross-system metrics calculation
  const totalClientsCount = clients.length;
  const activeCount = clients.filter(c => c.status === 'Active').length;
  const trialCount = clients.filter(c => c.status === 'Trial').length;
  const expiredCount = clients.filter(c => c.status === 'Expired').length;

  // Calculate total revenue collected in Kwanzas from active plans
  const totalRevenueKwanzas = clients.reduce((acc, c) => {
    if (c.status !== 'Active') return acc;
    const matchedPlan = plans.find(p => p.name.toLowerCase().includes(c.plan.toLowerCase()) || c.plan.toLowerCase().includes(p.id));
    if (matchedPlan) return acc + matchedPlan.price;
    // Fallback based on plan name
    if (c.plan === 'Luxury') return acc + 225000;
    if (c.plan === 'Premium') return acc + 135000;
    if (c.plan === 'Basic') return acc + 45000;
    return acc;
  }, 0);

  // Compute total guests & total RSVP confirmations across all clients
  let totalGuestsAcrossAll = 0;
  let totalConfirmedRsvpAcrossAll = 0;
  let totalCheckedInAcrossAll = 0;

  clients.forEach(c => {
    const rawGuests = localStorage.getItem(`kutxi_guests_${c.id}`) || (c.id === 'client_1' ? localStorage.getItem('kutxi_guests') : null);
    if (rawGuests) {
      try {
        const glist: Guest[] = JSON.parse(rawGuests);
        if (Array.isArray(glist)) {
          totalGuestsAcrossAll += glist.length;
          totalConfirmedRsvpAcrossAll += glist.filter(g => g.status === 'Confirmed').length;
          totalCheckedInAcrossAll += glist.filter(g => g.checkedIn).length;
        }
      } catch (e) {}
    }
  });

  const rsvpRateOverall = totalGuestsAcrossAll > 0 ? Math.round((totalConfirmedRsvpAcrossAll / totalGuestsAcrossAll) * 100) : 0;

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'All' || c.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenClientReadOnly = (client: ClientWeddingSaaS) => {
    setReadOnlyClient(client);
    setIsReadOnlyModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setBrideName('');
    setGroomName('');
    setClientEmail('');
    setWeddingDate('2026-12-18');
    setSelectedPlan('Premium');
    setSelectedStatus('Active');
    
    // Auto generate credentials
    const rand1 = Math.floor(100 + Math.random() * 900);
    const rand2 = Math.floor(100 + Math.random() * 900);
    setUser1Username('noiva.votos');
    setUser1Pass(`vows.${rand1}`);
    setUser2Username('noivo.votos');
    setUser2Pass(`vows.${rand2}`);
    
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: ClientWeddingSaaS, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(client);
    
    const bride = client.config?.brideGroom?.brideName || client.clientName.split('&')[0]?.trim() || 'Noiva';
    const groom = client.config?.brideGroom?.groomName || client.clientName.split('&')[1]?.trim() || 'Noivo';
    
    setBrideName(bride);
    setGroomName(groom);
    setClientEmail(client.clientEmail);
    setWeddingDate(client.weddingDate);
    setSelectedPlan(client.plan as any);
    setSelectedStatus(client.status as any);

    const matchingAccounts = userAccounts.filter(acc => acc.clientId === client.id);
    
    if (matchingAccounts.length > 0) {
      setUser1Username(matchingAccounts[0].username);
      setUser1Pass(matchingAccounts[0].pass);
      if (matchingAccounts[1]) {
        setUser2Username(matchingAccounts[1].username);
        setUser2Pass(matchingAccounts[1].pass);
      } else {
        setUser2Username('');
        setUser2Pass('');
      }
    } else {
      const rand1 = Math.floor(100 + Math.random() * 900);
      const rand2 = Math.floor(100 + Math.random() * 900);
      const cleanBride = bride.toLowerCase().replace(/\s+/g, '');
      const cleanGroom = groom.toLowerCase().replace(/\s+/g, '');
      setUser1Username(`noiva.${cleanBride}`);
      setUser1Pass(`vows.${rand1}`);
      setUser2Username(`noivo.${cleanGroom}`);
      setUser2Pass(`vows.${rand2}`);
    }

    setIsModalOpen(true);
  };

  const handleRegenerateCredentials = () => {
    const cleanBride = (brideName || 'noiva').trim().toLowerCase().replace(/\s+/g, '');
    const cleanGroom = (groomName || 'noivo').trim().toLowerCase().replace(/\s+/g, '');
    const rand1 = Math.floor(100 + Math.random() * 900);
    const rand2 = Math.floor(100 + Math.random() * 900);
    
    setUser1Username(`noiva.${cleanBride}`);
    setUser1Pass(`vows.${rand1}`);
    setUser2Username(`noivo.${cleanGroom}`);
    setUser2Pass(`vows.${rand2}`);
  };

  const handleQuickActivate = (client: ClientWeddingSaaS, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated: ClientWeddingSaaS = {
      ...client,
      status: 'Active'
    };
    onUpdateClient(updated);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brideName || !groomName || !clientEmail || !weddingDate) return;

    const fullName = `${brideName.trim()} & ${groomName.trim()}`;
    const accountsToAdd = [
      { username: user1Username.trim(), pass: user1Pass.trim() },
      { username: user2Username.trim(), pass: user2Pass.trim() }
    ];

    if (editingClient) {
      const updatedClient: ClientWeddingSaaS = {
        ...editingClient,
        clientName: fullName,
        clientEmail: clientEmail.trim(),
        weddingDate,
        plan: selectedPlan,
        status: selectedStatus,
        revenue: selectedPlan === 'Luxury' ? 499 : selectedPlan === 'Premium' ? 299 : 99,
        config: {
          ...editingClient.config,
          brideGroom: {
            ...editingClient.config.brideGroom,
            brideName: brideName.trim(),
            brideFullName: `${brideName.trim()} Silva`,
            groomName: groomName.trim(),
            groomFullName: `${groomName.trim()} Costa`
          },
          date: weddingDate + 'T16:00:00'
        }
      };

      onUpdateClient(updatedClient, accountsToAdd);
    } else {
      const newClientId = 'client_' + Date.now();
      const newClient: ClientWeddingSaaS = {
        id: newClientId,
        clientName: fullName,
        clientEmail: clientEmail.trim(),
        weddingDate,
        plan: selectedPlan,
        status: selectedStatus,
        guestCount: 0,
        rsvpsReceived: 0,
        revenue: selectedPlan === 'Luxury' ? 499 : selectedPlan === 'Premium' ? 299 : 99,
        createdAt: new Date().toISOString().split('T')[0],
        config: {
          ...INITIAL_WEDDING_CONFIG,
          id: newClientId,
          brideGroom: {
            ...INITIAL_WEDDING_CONFIG.brideGroom,
            brideName: brideName.trim(),
            brideFullName: `${brideName.trim()} Silva`,
            groomName: groomName.trim(),
            groomFullName: `${groomName.trim()} Costa`
          },
          date: weddingDate + 'T16:00:00',
          customFooter: `Com amor, sempre. — ${fullName}`
        }
      };

      onAddClient(newClient, accountsToAdd);
    }

    setIsModalOpen(false);
  };

  // Plan Edit Modal
  const handleOpenEditPlan = (plan: SaaSPlanConfig) => {
    setEditingPlan(plan);
    setPlanFormPrice(plan.price);
    setPlanFormGuestLimit(plan.guestLimit === 'Ilimitado' ? 'Ilimitado' : String(plan.guestLimit));
    setPlanFormStorage(plan.storageGB);
    setPlanFormSupport(plan.support);
    setPlanFormFeatures(plan.features.join('\n'));
    setIsPlanEditModalOpen(true);
  };

  const handleSavePlanVariables = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const parsedLimit = planFormGuestLimit.toLowerCase() === 'ilimitado' ? 'Ilimitado' : Number(planFormGuestLimit) || 100;
    const parsedFeatures = planFormFeatures.split('\n').map(f => f.trim()).filter(Boolean);

    setPlans(prev => prev.map(p => p.id === editingPlan.id ? {
      ...p,
      price: Number(planFormPrice),
      guestLimit: parsedLimit,
      storageGB: Number(planFormStorage),
      support: planFormSupport.trim(),
      features: parsedFeatures
    } : p));

    setIsPlanEditModalOpen(false);
  };

  return (
    <div className="space-y-6" id="super-admin-root-view">
      
      {/* Super Admin Top Control Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-150 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'dashboard', label: 'Início (Dashboard Geral)', icon: LayoutDashboard },
            { id: 'clients', label: `Clientes & Casais (${clients.length})`, icon: Users },
            { id: 'plans', label: 'Planos & Tarifas', icon: CreditCard },
            { id: 'logs', label: 'Auditoria de Logs', icon: Terminal },
            { id: 'health', label: 'Infraestrutura', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-rose-900 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isSupabaseConfigured()
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Gerenciar Banco de Dados Supabase"
          >
            <Database className="w-3.5 h-3.5 text-rose-800" />
            <span>Supabase</span>
            <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
          </button>

          {activeTab === 'clients' && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              Adicionar Novo Casal
            </button>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      <AnimatePresence mode="wait">
        
        {/* ======================================================== */}
        {/* TAB 1: INÍCIO (DASHBOARD GERAL SIMPLES & INTUITIVO) */}
        {/* ======================================================== */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
            id="super-admin-dashboard-general"
          >
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Arrecadado em Kwanzas */}
              <div className="bg-gradient-to-br from-rose-950 to-slate-900 text-white p-6 rounded-2xl border border-rose-900/50 shadow-md relative overflow-hidden flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">Total Arrecadado (Kz)</span>
                    <div className="text-2xl lg:text-3xl font-display font-bold text-white mt-1">
                      {totalRevenueKwanzas.toLocaleString('pt-AO')} Kz
                    </div>
                  </div>
                  <div className="p-2.5 bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-rose-200/80">
                  <span>{activeCount} casamentos ativos</span>
                  <span className="text-emerald-400 font-bold">100% faturamento local</span>
                </div>
              </div>

              {/* Card 2: Total de Clientes / Casais */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Casais Cadastrados</span>
                    <div className="text-2xl lg:text-3xl font-display font-bold text-slate-900 mt-1">
                      {totalClientsCount}
                    </div>
                  </div>
                  <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl">
                    <Users className="w-5 h-5 text-rose-800" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="text-emerald-600 font-bold">{activeCount} Ativos</span>
                  <span>•</span>
                  <span className="text-amber-600 font-bold">{trialCount} Pendentes</span>
                  {expiredCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-600 font-bold">{expiredCount} Expirados</span>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Total de Convidados Registrados */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total de Convidados</span>
                    <div className="text-2xl lg:text-3xl font-display font-bold text-slate-900 mt-1">
                      {totalGuestsAcrossAll}
                    </div>
                  </div>
                  <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>RSVP Confirmados:</span>
                  <span className="text-indigo-600 font-bold">{totalConfirmedRsvpAcrossAll} convidados</span>
                </div>
              </div>

              {/* Card 4: Taxa de Confirmação & Portaria */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Taxa de Conversão RSVP</span>
                    <div className="text-2xl lg:text-3xl font-display font-bold text-slate-900 mt-1">
                      {rsvpRateOverall}%
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Check-ins Portaria:</span>
                  <span className="text-emerald-600 font-bold">{totalCheckedInAcrossAll} presenças</span>
                </div>
              </div>

            </div>

            {/* Middle Section: Quick Summary & Client List Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2 cols): Recent Couples List with Direct Read-Only Click */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-2xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Casamentos & Locatários Ativos</h3>
                    <p className="text-xs text-slate-400">Clique em qualquer casal para abrir a ficha completa em <strong>Modo Leitura</strong></p>
                  </div>
                  <button
                    onClick={() => setActiveTab('clients')}
                    className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
                  >
                    Ver Todos ({clients.length}) →
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {clients.slice(0, 5).map(c => {
                    const brideInitial = c.config?.brideGroom?.brideName?.charAt(0) || c.clientName.charAt(0);

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleOpenClientReadOnly(c)}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 p-2 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-800 font-bold text-sm group-hover:scale-105 transition-transform">
                            {brideInitial}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 group-hover:text-rose-800 flex items-center gap-2 transition-colors">
                              <span>{c.clientName}</span>
                              <Lock className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(c.weddingDate).toLocaleDateString('pt-BR')} • {c.clientEmail}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] font-bold text-slate-700 block">{c.plan}</span>
                            <span className="text-[9px] text-slate-400">Plano Ativo</span>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            c.status === 'Trial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {c.status === 'Active' ? '✓ Ativo' : c.status === 'Trial' ? 'Aguardando' : 'Expirado'}
                          </span>

                          <button
                            onClick={(e) => handleOpenEditModal(c, e)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Dados Cadastrais"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (1 col): Quick Control & Distribution breakdown */}
              <div className="space-y-6">
                
                {/* Plan Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Distribuição dos Planos</h3>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="text-[10px] font-bold text-rose-800 hover:underline cursor-pointer"
                    >
                      Configurar Tarifas
                    </button>
                  </div>

                  <div className="space-y-3">
                    {plans.map(p => {
                      const count = clients.filter(c => c.plan.toLowerCase().includes(p.id) || p.name.toLowerCase().includes(c.plan.toLowerCase())).length;
                      const percentage = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;

                      return (
                        <div key={p.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{p.name}</span>
                            <span className="font-mono font-bold text-slate-900">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                p.id === 'luxury' ? 'bg-amber-500' :
                                p.id === 'premium' ? 'bg-rose-700' :
                                p.id === 'basic' ? 'bg-indigo-600' :
                                'bg-slate-400'
                              }`} 
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3 border border-slate-800">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Atalhos Rápidos de Operação
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={handleOpenAddModal}
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-left font-bold transition-all cursor-pointer flex flex-col gap-1"
                    >
                      <Plus className="w-4 h-4 text-rose-300" />
                      <span>Cadastrar Casal</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-left font-bold transition-all cursor-pointer flex flex-col gap-1"
                    >
                      <Sliders className="w-4 h-4 text-amber-300" />
                      <span>Editar Tarifas</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CLIENTES & CASAIS (LOCATÁRIOS SAAS) */}
        {/* ======================================================== */}
        {activeTab === 'clients' && (
          <motion.div
            key="clients-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
            id="super-admin-clients-panel"
          >
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-xl border border-slate-150 shadow-2xs">
              <div className="flex items-center gap-2 w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar casal ou e-mail..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-transparent border-0 focus:outline-hidden text-slate-800 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Filtrar:</span>
                {['All', 'Basic', 'Premium', 'Luxury'].map(plan => (
                  <button
                    key={plan}
                    onClick={() => setPlanFilter(plan)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      planFilter === plan ? 'bg-rose-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {plan === 'All' ? 'Todos' : plan}
                  </button>
                ))}
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50/70 border-b border-slate-150 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">
                  Locatários Cadastrados ({filteredClients.length}) — Clique no nome para abrir em <strong>Modo Leitura</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-150">
                    <tr>
                      <th className="p-3.5">Casal / Cliente</th>
                      <th className="p-3.5">Data do Evento</th>
                      <th className="p-3.5">Plano Contratado</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Credenciais de Acesso</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredClients.map(client => {
                      const matchingAccounts = userAccounts.filter(acc => acc.clientId === client.id);

                      return (
                        <tr 
                          key={client.id} 
                          onClick={() => handleOpenClientReadOnly(client)}
                          className="hover:bg-rose-50/30 transition-colors cursor-pointer group"
                        >
                          {/* Couple name */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 group-hover:text-rose-800 flex items-center gap-1.5 transition-colors">
                              <span>{client.clientName}</span>
                              <Lock className="w-3 h-3 text-slate-300" />
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{client.clientEmail}</div>
                          </td>

                          {/* Wedding date */}
                          <td className="p-3.5 text-slate-600">
                            {new Date(client.weddingDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>

                          {/* Plan */}
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800">{client.plan}</span>
                          </td>

                          {/* Status badge */}
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              client.status === 'Trial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {client.status === 'Active' ? '✓ Ativo / Pago' : client.status === 'Trial' ? 'Aguardando Pagamento' : 'Expirado'}
                            </span>
                          </td>

                          {/* Credentials preview */}
                          <td className="p-3.5" onClick={e => e.stopPropagation()}>
                            {matchingAccounts.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                  {matchingAccounts[0].username}
                                </div>
                                <button
                                  onClick={() => handleCopy(`Usuário: ${matchingAccounts[0].username} | Senha: ${matchingAccounts[0].pass}`)}
                                  className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                                  title="Copiar credenciais do casal"
                                >
                                  {copiedText?.includes(matchingAccounts[0].username) ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">Padrão</span>
                            )}
                          </td>

                          {/* Action buttons */}
                          <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {client.status === 'Trial' && (
                                <button
                                  onClick={(e) => handleQuickActivate(client, e)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                                  title="Validar pagamento bancário e liberar acesso instantâneo"
                                >
                                  Aprovar Pagamento ✓
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenClientReadOnly(client)}
                                className="p-1.5 text-slate-400 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Ver Ficha Completa em Modo Leitura"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => handleOpenEditModal(client, e)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar dados cadastrais"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Deseja realmente excluir permanentemente o cadastro de "${client.clientName}"?`)) {
                                    onDeleteClient(client.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir casal"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PLANOS & TARIFAS (COM MODAL CONFIGURAR VARIÁVEIS) */}
        {/* ======================================================== */}
        {activeTab === 'plans' && (
          <motion.div
            key="plans-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
            id="super-admin-plans-panel"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Planos & Tarifas Comerciais em Kwanzas</h3>
                <p className="text-xs text-slate-400">Personalize os limites de convidados, valores em Kz e níveis de suporte</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`bg-white p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    plan.popular ? 'border-rose-400 ring-2 ring-rose-500/15 shadow-sm' : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider block">{plan.name}</span>
                        <strong className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                          {plan.price.toLocaleString('pt-AO')} Kz
                        </strong>
                        <span className="text-[9px] text-slate-400 font-mono"> / {plan.period}</span>
                      </div>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                      <div><strong>Convidados:</strong> {plan.guestLimit}</div>
                      <div><strong>Armazenamento:</strong> {plan.storageGB} GB</div>
                      <div className="text-[10px] text-slate-500"><strong>Suporte:</strong> {plan.support}</div>
                    </div>

                    <ul className="space-y-2 pt-2 border-t border-slate-50 text-[11px] text-slate-600">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleOpenEditPlan(plan)}
                    className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-600" />
                    Configurar Variáveis
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: AUDITORIA DE LOGS */}
        {/* ======================================================== */}
        {activeTab === 'logs' && (
          <motion.div
            key="logs-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
            id="super-admin-logs-panel"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Histórico de Auditoria Ativo (Assinado por IP)</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                Transmissão em Tempo Real
              </span>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 font-mono text-[11px] leading-relaxed shadow-inner max-h-96 overflow-y-auto space-y-3 border border-slate-800">
              {auditLogs.map(log => (
                <div key={log.id} className="border-b border-slate-800 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>[{log.timestamp}]</span>
                    <span>IP: {log.ip}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-rose-400 font-semibold">{log.actor}</span>
                    <span className="text-slate-400 mx-1">→</span>
                    <strong className="text-white font-medium">{log.action}:</strong>
                    <span className="text-slate-300 ml-1.5">{log.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: INFRAESTRUTURA & HEALTH */}
        {/* ======================================================== */}
        {activeTab === 'health' && (
          <motion.div
            key="health-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
            id="super-admin-health-panel"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Uso de Memória dos Containers', value: '142 MB / 512 MB', usage: 27, status: 'Saudável', color: 'bg-emerald-500' },
                { label: 'Pool do Banco de Dados Cloud', value: '4 / 20 Conexões', usage: 20, status: 'Saudável', color: 'bg-emerald-500' },
                { label: 'Armazenamento de Mídia CDN', value: '1.2 GB / 50 GB', usage: 2.4, status: 'Saudável', color: 'bg-emerald-500' }
              ].map((stat, i) => (
                <div key={i} className="p-4 bg-white border border-slate-150 rounded-2xl text-xs space-y-3 shadow-2xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{stat.label}</span>
                    <span className="text-emerald-700 font-bold">{stat.status}</span>
                  </div>
                  <div className="text-lg font-bold text-slate-950 font-mono">{stat.value}</div>
                  
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${stat.usage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs flex gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <strong className="font-semibold block">Renovação de Certificado SSL Pendente</strong>
                <p className="mt-0.5 text-amber-800 leading-normal">
                  O certificado SSL coringa wildcard principal (*.kutxi.com) expira em 42 dias. O cron job automático do Let's Encrypt está agendado e entrará em fila de processamento dia 12 de Julho.
                </p>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* READ-ONLY CLIENT MODAL */}
      <ClientReadOnlyModal 
        client={readOnlyClient}
        isOpen={isReadOnlyModalOpen}
        onClose={() => setIsReadOnlyModalOpen(false)}
        userAccounts={userAccounts}
      />

      {/* DYNAMIC CRUD MODAL (ADD & EDIT COUPLES) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-rose-900 to-slate-900 p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-rose-300" />
                  <div>
                    <h3 className="font-display font-bold text-sm md:text-base">
                      {editingClient ? `Editar Casal: ${editingClient.clientName}` : 'Adicionar Novo Casal SaaS'}
                    </h3>
                    <span className="text-[10px] text-rose-200 font-semibold uppercase tracking-wider block">
                      Painel Administrativo Kutxi CRUD
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveClient} className="p-6 space-y-5 text-xs text-slate-700 font-semibold">
                
                {/* Couple Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Primeiro Nome da Noiva</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sofia"
                      value={brideName}
                      onChange={e => setBrideName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-rose-800 font-medium"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Primeiro Nome do Noivo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Gabriel"
                      value={groomName}
                      onChange={e => setGroomName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-rose-800 font-medium"
                    />
                  </div>
                </div>

                {/* Email & Wedding Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">E-mail de Contato</label>
                    <input
                      type="email"
                      required
                      placeholder="Ex: noivos@exemplo.com"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-rose-800 font-medium"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Data do Casamento</label>
                    <input
                      type="date"
                      required
                      value={weddingDate}
                      onChange={e => setWeddingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-rose-800 font-mono"
                    />
                  </div>
                </div>

                {/* Plan & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Plano do Contrato</label>
                    <select
                      value={selectedPlan}
                      onChange={e => setSelectedPlan(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-rose-800 cursor-pointer"
                    >
                      <option value="Basic">Essencial (45.000 Kz)</option>
                      <option value="Premium">Premium (135.000 Kz)</option>
                      <option value="Luxury">Luxo VIP (225.000 Kz)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Status do Pagamento</label>
                    <select
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-rose-800 cursor-pointer font-bold"
                    >
                      <option value="Active">✓ Ativo (Pago / Liberado)</option>
                      <option value="Trial">⚠ Aguardando Pagamento (Bloqueado)</option>
                      <option value="Expired">✗ Expirado / Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Access Credentials generation field */}
                <div className="bg-slate-50/80 p-4 border border-slate-150 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-rose-800 tracking-wider font-bold flex items-center gap-1">
                      <Key className="w-3.5 h-3.5" />
                      Credenciais de Acesso (Login do Casal)
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateCredentials}
                      className="text-[9px] text-indigo-700 hover:underline flex items-center gap-1 font-sans font-bold cursor-pointer"
                      title="Gerar novas credenciais limpas baseadas nos nomes atuais"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Auto-Gerar
                    </button>
                  </div>

                  {/* Credentials 1 (Bride) */}
                  <div className="grid grid-cols-2 gap-3 pb-3.5 border-b border-slate-200/60">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Usuário Noiva / Admin 1</span>
                      <input
                        type="text"
                        required
                        value={user1Username}
                        onChange={e => setUser1Username(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-800 focus:outline-rose-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Senha de Acesso</span>
                      <input
                        type="text"
                        required
                        value={user1Pass}
                        onChange={e => setUser1Pass(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-amber-700 focus:outline-rose-800 font-bold"
                      />
                    </div>
                  </div>

                  {/* Credentials 2 (Groom) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Usuário Noivo / Admin 2</span>
                      <input
                        type="text"
                        required
                        value={user2Username}
                        onChange={e => setUser2Username(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-800 focus:outline-rose-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Senha de Acesso</span>
                      <input
                        type="text"
                        required
                        value={user2Pass}
                        onChange={e => setUser2Pass(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-amber-700 focus:outline-rose-800 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-rose-300" />
                    <span>{editingClient ? 'Salvar Alterações ✓' : 'Salvar Novo Casal (CRUD)'}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PLAN VARIABLES CONFIGURATION MODAL */}
      <AnimatePresence>
        {isPlanEditModalOpen && editingPlan && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden my-8"
            >
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">Configurar Variáveis: {editingPlan.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlanEditModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePlanVariables} className="p-6 space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider font-bold">Preço em Kwanzas (Kz)</label>
                  <input
                    type="number"
                    required
                    step="1000"
                    value={planFormPrice}
                    onChange={e => setPlanFormPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-rose-800 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Limite de Convidados</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 300 ou Ilimitado"
                      value={planFormGuestLimit}
                      onChange={e => setPlanFormGuestLimit(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase tracking-wider font-bold">Armazenamento (GB)</label>
                    <input
                      type="number"
                      required
                      step="0.5"
                      value={planFormStorage}
                      onChange={e => setPlanFormStorage(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider font-bold">Nível de Suporte</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Suporte Prioritário 24h"
                    value={planFormSupport}
                    onChange={e => setPlanFormSupport(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider font-bold">Lista de Recursos (1 por linha)</label>
                  <textarea
                    rows={4}
                    value={planFormFeatures}
                    onChange={e => setPlanFormFeatures(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPlanEditModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Salvar Tarifas ✓
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUPABASE CLOUD MANAGEMENT MODAL */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        clients={clients}
        auditLogs={auditLogs}
      />

    </div>
  );
}
