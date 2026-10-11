import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, CheckCircle, Clock, XCircle, Eye, 
  MapPin, Calendar, Compass, Shield, CreditCard,
  TrendingUp, Monitor, Sparkles, Check, Trash2, Edit2, Edit, Plus, 
  AlertTriangle, Info, PlusCircle, Car, Sliders, X, Upload, Image as ImageIcon,
  CheckSquare, Square, Printer, MessageCircle, Share2, Gift, Camera,
  Heart, BookOpen, QrCode, ArrowRight, ChevronRight, Phone
} from 'lucide-react';
import { Guest, WeddingConfig, TodoItem } from '../types';
import { getSafeImageUrl, handleImageError } from '../utils/imageFallback';

interface SaaSOverviewProps {
  guests: Guest[];
  config: WeddingConfig;
  planName: string;
  onUpdateConfig?: (config: WeddingConfig) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenPublicInvite?: () => void;
}

export default function SaaSOverview({ guests, config, planName, onUpdateConfig, onNavigateTab, onOpenPublicInvite }: SaaSOverviewProps) {
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  // Calculate analytics
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter(g => g.status === 'Confirmed');
  const pendingGuests = guests.filter(g => g.status === 'Pending');
  const declinedGuests = guests.filter(g => g.status === 'Declined');
  
  const totalSeatsConfirmed = confirmedGuests.reduce((acc, g) => acc + 1 + g.plusOnesConfirmed, 0);
  const totalSeatsPending = pendingGuests.reduce((acc, g) => acc + 1 + g.maxPlusOnes, 0);
  
  const checkedInCount = guests.filter(g => g.checkedIn).length;
  const totalViews = guests.reduce((acc, g) => acc + g.invitationViews, 0);

  // Gift registry metrics
  const registryItems = config.giftRegistry?.registryItems || [];
  const claimedGifts = registryItems.filter(i => Boolean(i.claimedBy));
  const claimedGiftTotal = claimedGifts.reduce((acc, i) => acc + (i.price || 0), 0);

  // Couple Profile Photo Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState(config.brideGroom.couplePhoto || '');
  const couplePhotoInputRef = useRef<HTMLInputElement>(null);

  // Quick Profile & Couple Names Edit Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileGroom, setProfileGroom] = useState(config.brideGroom?.groomName || '');
  const [profileBride, setProfileBride] = useState(config.brideGroom?.brideName || '');
  const [profileGroomFull, setProfileGroomFull] = useState(config.brideGroom?.groomFullName || '');
  const [profileBrideFull, setProfileBrideFull] = useState(config.brideGroom?.brideFullName || '');
  const [profileDate, setProfileDate] = useState(config.date ? config.date.split('T')[0] : '2026-09-19');
  const [profileCeremonyTime, setProfileCeremonyTime] = useState(
    config.date && config.date.includes('T') ? config.date.split('T')[1].substring(0, 5) : '16:00'
  );
  const [profileCeremony, setProfileCeremony] = useState(config.venue?.ceremonyName || '');
  const [profileAddress, setProfileAddress] = useState(config.venue?.ceremonyAddress || '');
  const [profileReception, setProfileReception] = useState(config.venue?.receptionName || '');
  const [profileReceptionAddress, setProfileReceptionAddress] = useState(config.venue?.receptionAddress || '');
  const [profileStoryTitle, setProfileStoryTitle] = useState(config.storyTitle || 'Nossa História de Amor');
  const [profileStoryContent, setProfileStoryContent] = useState(config.storyContent || '');
  const [profileCouplePhoto, setProfileCouplePhoto] = useState(config.brideGroom?.couplePhoto || config.media?.coverImage || '');
  const [profileSuccessNotice, setProfileSuccessNotice] = useState(false);

  // Keep state in sync whenever external config updates
  useEffect(() => {
    setProfileGroom(config.brideGroom?.groomName || '');
    setProfileBride(config.brideGroom?.brideName || '');
    setProfileGroomFull(config.brideGroom?.groomFullName || '');
    setProfileBrideFull(config.brideGroom?.brideFullName || '');
    setProfileDate(config.date ? config.date.split('T')[0] : '2026-09-19');
    setProfileCeremonyTime(
      config.date && config.date.includes('T') ? config.date.split('T')[1].substring(0, 5) : '16:00'
    );
    setProfileCeremony(config.venue?.ceremonyName || '');
    setProfileAddress(config.venue?.ceremonyAddress || '');
    setProfileReception(config.venue?.receptionName || '');
    setProfileReceptionAddress(config.venue?.receptionAddress || '');
    setProfileStoryTitle(config.storyTitle || 'Nossa História de Amor');
    setProfileStoryContent(config.storyContent || '');
    setProfileCouplePhoto(config.brideGroom?.couplePhoto || config.media?.coverImage || '');
    setPhotoUrlInput(config.brideGroom?.couplePhoto || '');
  }, [config]);

  const handleSaveProfile = () => {
    if (!onUpdateConfig) return;
    const groom = profileGroom.trim() || 'Gabriel';
    const bride = profileBride.trim() || 'Sofia';
    const cleanDate = profileDate || '2026-09-19';
    const cleanTime = profileCeremonyTime.trim() || '16:00';
    const fullIsoDate = `${cleanDate}T${cleanTime}:00`;
    const photo = profileCouplePhoto.trim() || config.brideGroom?.couplePhoto || config.media?.coverImage;

    const updated: WeddingConfig = {
      ...config,
      date: fullIsoDate,
      storyTitle: profileStoryTitle.trim() || 'Nossa História de Amor',
      storyContent: profileStoryContent.trim() || config.storyContent,
      brideGroom: {
        ...config.brideGroom,
        groomName: groom,
        brideName: bride,
        groomFullName: profileGroomFull.trim() || `${groom} Pureza dos Santos`,
        brideFullName: profileBrideFull.trim() || `${bride} Kiala de Oliveira`,
        couplePhoto: photo
      },
      media: {
        ...config.media,
        coverImage: photo || config.media.coverImage,
        storyImage: photo || config.media.storyImage
      },
      venue: {
        ...config.venue,
        ceremonyName: profileCeremony.trim() || config.venue.ceremonyName || 'Espaço Jardins da Welwitschia — Talatona',
        ceremonyAddress: profileAddress.trim() || config.venue.ceremonyAddress || 'Via AL 15, Condomínio Welwitschia, Talatona, Luanda, Angola',
        ceremonyTime: `${new Date(fullIsoDate).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}, às ${cleanTime}h`,
        receptionName: profileReception.trim() || config.venue.receptionName || 'Salão Nobre Luanda Prestige',
        receptionAddress: profileReceptionAddress.trim() || profileAddress.trim() || config.venue.receptionAddress || 'Via AL 15, Condomínio Welwitschia, Talatona, Luanda, Angola',
      },
      customFooter: `Com amor, sempre. — ${groom} & ${bride}`,
      giftRegistry: {
        ...config.giftRegistry,
        bankRecipient: `${groom} & ${bride}`,
        accountHolder: `${groom} & ${bride}`
      }
    };
    onUpdateConfig(updated);
    setShowProfileModal(false);
    setProfileSuccessNotice(true);
    setTimeout(() => setProfileSuccessNotice(false), 4500);
  };

  // 1. Task List States
  const todoList: TodoItem[] = config.todoList || [
    { id: 'td1', label: 'Definição de Local & Data', completed: true, urgency: 'alta' },
    { id: 'td2', label: 'Customização de Layout & Fotos de Capa', completed: true, urgency: 'media' },
    { id: 'td3', label: 'Habilitação de Trilha Sonora Exclusiva', completed: true, urgency: 'baixa' },
    { id: 'td4', label: 'Envio de Tokens Individuais de RSVP', completed: false, urgency: 'alta' },
    { id: 'td5', label: 'Cadastro da Lista de Presentes & IBAN', completed: true, urgency: 'alta' },
    { id: 'td6', label: 'Credenciamento da Equipe de Portaria', completed: false, urgency: 'media' },
  ];

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskUrgency, setNewTaskUrgency] = useState<'alta' | 'media' | 'baixa'>('media');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskUrgency, setEditingTaskUrgency] = useState<'alta' | 'media' | 'baixa'>('media');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // 2. Venue Modal & Info States
  const isVenueConfigured = config.venue && typeof config.venue.capacity === 'number' && config.venue.capacity > 0;
  const [showVenueModal, setShowVenueModal] = useState(!isVenueConfigured);
  
  // Temporary fields for venue form
  const [venueName, setVenueName] = useState(config.venue.ceremonyName || '');
  const [venueAddress, setVenueAddress] = useState(config.venue.ceremonyAddress || '');
  const [venueCapacity, setVenueCapacity] = useState<number | ''>(config.venue.capacity || '');
  const [venueHasParking, setVenueHasParking] = useState<boolean>(config.venue.hasParking ?? false);
  const [venuePhotos, setVenuePhotos] = useState<string[]>(config.venue.photos || []);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Countdown calculations
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const weddingDate = new Date(config.date).getTime();
    const now = new Date().getTime();
    const difference = weddingDate - now;
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
    setDaysLeft(days > 0 ? days : 0);
  }, [config.date]);

  // Urgent pending tasks
  const urgentPendingTasks = todoList.filter(t => !t.completed && t.urgency === 'alta');

  // Task Handlers
  const handleToggleTask = (id: string) => {
    const updated = todoList.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
  };

  const handleDeleteTask = (id: string) => {
    const updated = todoList.filter(t => t.id !== id);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: TodoItem = {
      id: 'td_' + Date.now(),
      label: newTaskText.trim(),
      completed: false,
      urgency: newTaskUrgency
    };
    const updated = [...todoList, newTask];
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
    setNewTaskText('');
    setNewTaskUrgency('media');
    setShowAddTaskForm(false);
  };

  const handleStartEdit = (task: TodoItem) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.label);
    setEditingTaskUrgency(task.urgency);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingTaskText.trim()) return;
    const updated = todoList.map(t => t.id === id ? { ...t, label: editingTaskText.trim(), urgency: editingTaskUrgency } : t);
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, todoList: updated });
    }
    setEditingTaskId(null);
  };

  // Couple Profile Photo Handlers
  const handleCouplePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result && onUpdateConfig) {
          const updated: WeddingConfig = {
            ...config,
            brideGroom: {
              ...config.brideGroom,
              couplePhoto: reader.result as string
            }
          };
          onUpdateConfig(updated);
          setShowPhotoModal(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCouplePhotoUrl = (url: string) => {
    if (onUpdateConfig) {
      const updated: WeddingConfig = {
        ...config,
        brideGroom: {
          ...config.brideGroom,
          couplePhoto: url.trim()
        }
      };
      onUpdateConfig(updated);
      setShowPhotoModal(false);
    }
  };

  // Drag and drop photo uploaders for venue
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setVenuePhotos(prev => [...prev, reader.result as string].slice(0, 3));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setVenuePhotos(prev => [...prev, reader.result as string].slice(0, 3));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setVenuePhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveVenue = () => {
    if (!venueName.trim() || !venueAddress.trim() || !venueCapacity) return;
    const updated = {
      ...config,
      venue: {
        ...config.venue,
        ceremonyName: venueName.trim(),
        ceremonyAddress: venueAddress.trim(),
        capacity: Number(venueCapacity),
        hasParking: venueHasParking,
        photos: venuePhotos
      }
    };
    if (onUpdateConfig) {
      onUpdateConfig(updated);
    }
    setShowVenueModal(false);
  };

  // Print & WhatsApp Sharing Handlers for To-Do List
  const handlePrintTasks = () => {
    window.print();
  };

  const handleShareTasksWhatsApp = () => {
    const bride = config.brideGroom?.brideName || 'Noiva';
    const groom = config.brideGroom?.groomName || 'Noivo';
    
    const altaTasks = todoList.filter(t => !t.completed && t.urgency === 'alta');
    const mediaTasks = todoList.filter(t => !t.completed && t.urgency === 'media');
    const baixaTasks = todoList.filter(t => !t.completed && t.urgency === 'baixa');
    const doneTasks = todoList.filter(t => t.completed);

    let text = `📋 *LISTA DE TAREFAS DO CASAMENTO*\n💍 *${bride} & ${groom}*\n📊 Progresso: ${taskCompletionPercentage}% (${completedTasks}/${totalTasks} concluídas)\n\n`;

    if (altaTasks.length > 0) {
      text += `🚨 *URGENTES:*\n` + altaTasks.map(t => `• ⚠️ ${t.label}`).join('\n') + `\n\n`;
    }

    if (mediaTasks.length > 0) {
      text += `⏳ *EM ANDAMENTO (Média):*\n` + mediaTasks.map(t => `• ⏳ ${t.label}`).join('\n') + `\n\n`;
    }

    if (baixaTasks.length > 0) {
      text += `☕ *A FAZER (Baixa):*\n` + baixaTasks.map(t => `• ☕ ${t.label}`).join('\n') + `\n\n`;
    }

    if (doneTasks.length > 0) {
      text += `✅ *CONCLUÍDAS:*\n` + doneTasks.map(t => `• ✅ ~${t.label}~`).join('\n') + `\n\n`;
    }

    text += `Organizado com Kutxi ❤️ Kutxi Plataforma de Casamento`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Percentage calculations
  const totalTasks = todoList.length;
  const completedTasks = todoList.filter(t => t.completed).length;
  const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Container variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 relative"
    >
      {/* ⚠️ REMINDER BANNER FOR MISSING VENUE INFORMATION */}
      {!isVenueConfigured && (
        <motion.div 
          variants={itemVariants}
          className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-amber-900"
        >
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Informações do Espaço Ausentes</h4>
              <p className="text-xs text-amber-800">
                Adicione as informações do seu local (capacidade, nome, endereço, estacionamento e fotos) para habilitar o controle exato de vagas do seu casamento.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setVenueName(config.venue.ceremonyName || '');
              setVenueAddress(config.venue.ceremonyAddress || '');
              setVenueCapacity(config.venue.capacity || '');
              setVenueHasParking(config.venue.hasParking ?? false);
              setVenuePhotos(config.venue.photos || []);
              setShowVenueModal(true);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Configurar Espaço
          </button>
        </motion.div>
      )}

      {/* 🚨 NOTIFICATION BANNER FOR URGENT PENDING TASKS */}
      {urgentPendingTasks.length > 0 && (
        <motion.div 
          variants={itemVariants}
          className="bg-rose-50 border border-rose-200/60 p-5 rounded-2xl shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h4 className="font-bold text-sm text-rose-950">Lembrete de Tarefas Urgentes</h4>
          </div>
          <p className="text-xs text-rose-800">
            Você possui {urgentPendingTasks.length} {urgentPendingTasks.length === 1 ? 'tarefa urgente' : 'tarefas urgentes'} por fazer para garantir o sucesso do evento:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {urgentPendingTasks.map(task => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-2.5 bg-white border border-rose-100 rounded-xl text-xs hover:border-rose-300 transition-all"
              >
                <div className="flex items-center gap-2.5 text-slate-800 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                  {task.label}
                </div>
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                >
                  Concluído
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 💍 HERO GREETING BANNER WITH COUPLE PROFILE PHOTO & COUNTDOWN */}
      <motion.div 
        variants={itemVariants} 
        id="overview-countdown-card"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-rose-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-rose-900/30"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/15 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {profileSuccessNotice && (
            <div className="absolute -top-12 left-0 right-0 bg-emerald-500/90 border border-emerald-400 text-white px-4 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg z-20 animate-fadeIn">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4 text-white" />
                Perfil Atualizado! Nomes, data e dados do casamento já sincronizados no site dos convidados.
              </span>
            </div>
          )}
          
          {/* Couple avatar and greeting */}
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Couple photo with interactive edit trigger */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-rose-400/60 shadow-lg bg-rose-900/40 relative">
                {config.brideGroom.couplePhoto ? (
                  <img 
                    src={config.brideGroom.couplePhoto} 
                    alt="Foto do Casal" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif text-2xl font-bold text-rose-300">
                    {(config.brideGroom.groomName ? config.brideGroom.groomName.charAt(0) : 'G')}&{config.brideGroom.brideName.charAt(0)}
                  </div>
                )}

                {/* Hover overlay to change photo */}
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                  title="Alterar foto do casal"
                >
                  <Camera className="w-5 h-5 mb-0.5 text-rose-300" />
                  <span className="text-[9px] font-bold">Alterar</span>
                </button>
              </div>

              {/* Status badge */}
              <button
                onClick={() => setShowPhotoModal(true)}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 border border-white/40 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110"
                title="Editar foto do casal"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            {/* Couple greeting */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 border border-rose-400/30 text-rose-300">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {planName}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  Perfil Ativo
                </span>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer transition-colors"
                >
                  <Edit className="w-3 h-3 text-rose-300" />
                  <span>Editar Dados dos Noivos</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-light tracking-wide text-white">
                Olá, <span className="font-serif italic font-normal text-rose-200">{config.brideGroom.groomName} & {config.brideGroom.brideName}!</span> 💍
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                Bem-vindos ao seu cockpit de casamento no espaço <strong className="text-white">{config.venue.ceremonyName}</strong>. Acompanhe os convidados, lista de presentes e portaria.
              </p>

              {/* Direct Quick Action Buttons for the Couple */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {onOpenPublicInvite && (
                  <button
                    type="button"
                    onClick={onOpenPublicInvite}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Convite dos Convidados</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const link = `${origin}/?invite=convite&clientId=${config.clientId || 'client_1'}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(link);
                    }
                    setCopiedInviteLink(true);
                    setTimeout(() => setCopiedInviteLink(false), 3000);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>{copiedInviteLink ? 'Link Copiado! ✓' : 'Copiar Link do Convite'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-rose-300" />
                  <span>Editar Dados do Casal</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Countdown & Venue widget */}
          <div className="flex items-center gap-4 bg-white/10 border border-white/15 p-4 rounded-2xl backdrop-blur-md shrink-0 shadow-lg">
            <div className="text-center min-w-[70px]">
              <div className="text-3xl md:text-4xl font-display font-bold text-rose-400">{daysLeft}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Dias Restantes</div>
            </div>
            <div className="h-10 w-px bg-white/20"></div>
            <div className="text-slate-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-100">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                {new Date(config.date).toLocaleDateString('pt-BR', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {config.venue.ceremonyName || 'Espaço Jardins da Welwitschia — Talatona'}
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 🚀 SUBMENU DE ACESSO RÁPIDO AOS MÓDULOS DOS NOIVOS */}
      <motion.div 
        variants={itemVariants}
        className="space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Submenu de Acesso Rápido</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Navegue diretamente pelos módulos de gestão</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Lista de Presentes & Cotas */}
          <div 
            onClick={() => onNavigateTab && onNavigateTab('gifts')}
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-rose-300 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Gift className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-100">
                  {registryItems.length} Itens
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-rose-900 transition-colors">
                  Lista de Presentes & Cotas
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  Gerencie itens do enxoval, cotas de lua de mel e dados bancários (IBAN / Multicaixa Express).
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-800">
              <span>{claimedGiftTotal > 0 ? `${claimedGiftTotal.toLocaleString('pt-AO')} Kz arrecadados` : 'Configurar Lista'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Gestão de Convidados & RSVP */}
          <div 
            onClick={() => onNavigateTab && onNavigateTab('guests')}
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                  {totalGuests} Convites
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-900 transition-colors">
                  Lista de Convidados & RSVP
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  Envie links personalizados de WhatsApp com tokens individuais e acompanhe respostas.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>{confirmedGuests.length} Confirmados</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Personalizar Convite Interativo */}
          <div 
            onClick={() => onNavigateTab && onNavigateTab('editor')}
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100">
                  Editor Visual
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-900 transition-colors">
                  Personalizar Convite & Música
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  Customize a paleta de cores, tipografia, fotos do casal, trilha sonora e detalhes da cerimônia.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-800">
              <span>Editar Convite</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Álbum de Fotos & Mensagens */}
          <div 
            onClick={() => onNavigateTab && onNavigateTab('album')}
            className="p-5 bg-white rounded-2xl border border-slate-200/90 hover:border-amber-300 hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                  Mural Interativo
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-900 transition-colors">
                  Álbum & Mural de Mensagens
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  Receba fotos tiradas pelos convidados durante a recepção e leia votos de felicidades.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-800">
              <span>Acessar Álbum</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            id: "kpi-total",
            title: 'Assentos em Confirmação', 
            value: `${totalSeatsConfirmed} / ${totalSeatsConfirmed + totalSeatsPending}`, 
            sub: `${totalGuests} convites únicos na lista`, 
            icon: Users, 
            color: 'text-slate-700 bg-slate-100 dark:bg-slate-800' 
          },
          { 
            id: "kpi-confirmed",
            title: 'Convidados Confirmados', 
            value: totalSeatsConfirmed, 
            sub: `${confirmedGuests.length} convites aceitos`, 
            icon: CheckCircle, 
            color: 'text-emerald-700 bg-emerald-50 border border-emerald-100' 
          },
          { 
            id: "kpi-pending",
            title: 'Convidados Pendentes', 
            value: totalSeatsPending, 
            sub: `${pendingGuests.length} sem resposta`, 
            icon: Clock, 
            color: 'text-amber-700 bg-amber-50 border border-amber-100' 
          },
          { 
            id: "kpi-checked-in",
            title: 'Check-In Efetuado', 
            value: `${checkedInCount} / ${confirmedGuests.length}`, 
            sub: `${Math.round((checkedInCount / (confirmedGuests.length || 1)) * 100)}% de chegada à recepção`, 
            icon: Compass, 
            color: 'text-sky-700 bg-sky-50 border border-sky-100' 
          }
        ].map((card, i) => (
          <motion.div 
            key={i} 
            id={card.id}
            variants={itemVariants}
            className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-medium tracking-wider uppercase">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</div>
              <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: RSVP Stats & Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RSVP Chart / Visual representation */}
        <motion.div 
          variants={itemVariants}
          id="overview-rsvp-breakdown"
          className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-6"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900">Estatísticas de Presença (RSVP)</h3>
              <p className="text-xs text-slate-400">Taxa de respostas e status em tempo real</p>
            </div>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Atualizações ao Vivo
            </span>
          </div>

          {/* Graphical Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span className="font-medium text-slate-700">Presença Confirmada</span>
                <span className="font-bold text-slate-900">{totalSeatsConfirmed} assento(s) ({Math.round((confirmedGuests.length / (totalGuests || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{ width: `${(confirmedGuests.length / (totalGuests || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span className="font-medium text-slate-700">Pendentes de Resposta</span>
                <span className="font-bold text-slate-900">{totalSeatsPending} assento(s) ({Math.round((pendingGuests.length / (totalGuests || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: `${(pendingGuests.length / (totalGuests || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span className="font-medium text-slate-700">Declinaram Convite</span>
                <span className="font-bold text-slate-900">{declinedGuests.length} convidado(s) ({Math.round((declinedGuests.length / (totalGuests || 1)) * 100)}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full" style={{ width: `${(declinedGuests.length / (totalGuests || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>

          {/* Quick Metrics grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center">
            <div>
              <div className="text-xs text-slate-400 font-medium">Convites Enviados</div>
              <div className="text-lg font-bold text-slate-800">{totalGuests}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Visualizações do Convite</div>
              <div className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                <Eye className="w-4 h-4 text-slate-400" />
                {totalViews}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Visualizações Médias</div>
              <div className="text-lg font-bold text-slate-800">
                {(totalViews / (totalGuests || 1)).toFixed(1)}x
              </div>
            </div>
          </div>
        </motion.div>

        {/* 🏢 VENUE SPACE & CAPACITY MANAGEMENT CARD */}
        <motion.div 
          variants={itemVariants}
          id="overview-venue-card"
          className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between"
        >
          {isVenueConfigured ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900">Gestão de Capacidade</h3>
                  <p className="text-xs text-slate-400">Controle exato de vagas do local</p>
                </div>
                <button
                  onClick={() => setShowVenueModal(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Editar informações do espaço"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Photos slideshow/preview */}
              {config.venue.photos && config.venue.photos.length > 0 ? (
                <div className="relative h-28 w-full rounded-xl overflow-hidden shadow-xs border border-slate-100">
                  <img 
                    src={config.venue.photos[0]} 
                    alt="Espaço do evento" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] text-white font-medium">
                    {config.venue.photos.length} {config.venue.photos.length === 1 ? 'Foto' : 'Fotos'}
                  </div>
                </div>
              ) : (
                <div className="h-28 w-full rounded-xl bg-stone-50 border border-stone-200/60 border-dashed flex flex-col items-center justify-center text-stone-400">
                  <ImageIcon className="w-6 h-6 stroke-[1.2] text-stone-300" />
                  <span className="text-[10px] font-medium mt-1">Sem Fotos do Espaço</span>
                </div>
              )}

              {/* Venue details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                  <span className="font-medium text-slate-400">Nome do Espaço:</span>
                  <span className="font-bold text-slate-800 text-right">{config.venue.ceremonyName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                  <span className="font-medium text-slate-400">Localização:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[140px] truncate" title={config.venue.ceremonyAddress}>
                    {config.venue.ceremonyAddress}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 text-slate-700">
                  <span className="font-medium text-slate-400">Estacionamento:</span>
                  <span className={`font-bold inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    config.venue.hasParking 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                    <Car className="w-3 h-3" />
                    {config.venue.hasParking ? 'Estacionamento Próprio' : 'Sem Vagas Internas'}
                  </span>
                </div>
              </div>

              {/* Occupancy details */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span className="font-semibold text-slate-700">Lotação do Espaço</span>
                  <span className="font-bold text-slate-900">
                    {totalSeatsConfirmed} / {config.venue.capacity} Lugares
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalSeatsConfirmed > config.venue.capacity 
                        ? 'bg-rose-500' 
                        : (totalSeatsConfirmed / config.venue.capacity) > 0.85 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (totalSeatsConfirmed / config.venue.capacity) * 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {Math.max(0, config.venue.capacity - totalSeatsConfirmed)} assentos disponíveis
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {Math.round((totalSeatsConfirmed / config.venue.capacity) * 100)}% ocupado
                  </span>
                </div>

                {totalSeatsConfirmed > config.venue.capacity && (
                  <div className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Atenção: A capacidade máxima do espaço foi excedida!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-6 text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-full border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
                <MapPin className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900 text-sm">Informações de Espaço Pendentes</h4>
                <p className="text-xs text-slate-400 px-4 leading-relaxed">
                  Insira o local do evento e a quantidade de convidados que o espaço alberga para fazer a gestão de assentos exata.
                </p>
              </div>
              <button
                onClick={() => setShowVenueModal(true)}
                className="px-4 py-2 bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Adicionar Espaço
              </button>
            </div>
          )}
        </motion.div>

      </div>

      {/* 📝 INTERACTIVE WEDDING TO-DO TASK LIST CARD */}
      <motion.div 
        variants={itemVariants}
        id="overview-checklist-milestones"
        className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900">Lista de Tarefas do Casamento</h3>
            <p className="text-xs text-slate-400">Adicione, edite, conclua e compartilhe tarefas organizadas por urgência</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {taskCompletionPercentage}% Concluído ({completedTasks}/{totalTasks})
            </span>
            
            {/* WhatsApp Share Button */}
            <button
              onClick={handleShareTasksWhatsApp}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Partilhar lista de tarefas formatada via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrintTasks}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Imprimir lista de tarefas do casamento"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Add Task Button */}
            <button
              onClick={() => setShowAddTaskForm(prev => !prev)}
              className="px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Tarefa
            </button>
          </div>
        </div>

        {/* Dynamic add form */}
        <AnimatePresence>
          {showAddTaskForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddTask}
              className="p-4 bg-stone-50 border border-stone-200/50 rounded-xl space-y-3 overflow-hidden text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700">Título da Tarefa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Contratar o buffet de frios"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-rose-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nível de Urgência</label>
                  <select
                    value={newTaskUrgency}
                    onChange={e => setNewTaskUrgency(e.target.value as 'alta' | 'media' | 'baixa')}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-rose-800 font-semibold"
                  >
                    <option value="alta" className="text-rose-700 font-bold">Alta Urgência 🚨</option>
                    <option value="media" className="text-amber-700 font-bold">Média Urgência ⚠️</option>
                    <option value="baixa" className="text-slate-600 font-bold">Baixa Urgência ☕</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-lg cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Task Grid items list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todoList.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400 font-medium">
              Sua lista de tarefas está vazia. Comece adicionando etapas importantes!
            </div>
          ) : (
            todoList.map(task => {
              const isEditing = editingTaskId === task.id;
              
              const urgencyLabels = {
                alta: { text: 'Alta Urgência', bg: 'bg-rose-50 border-rose-100 text-rose-700 animate-pulse' },
                media: { text: 'Média', bg: 'bg-amber-50 border-amber-100 text-amber-700' },
                baixa: { text: 'Baixa', bg: 'bg-slate-50 border-slate-150 text-slate-600' }
              };

              return (
                <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    task.completed 
                      ? 'bg-slate-50/55 border-slate-100/50 hover:bg-slate-50/70' 
                      : 'bg-white border-slate-100 hover:shadow-xs hover:border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Toggle check */}
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className={`cursor-pointer transition-colors shrink-0 ${
                        task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'
                      }`}
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 stroke-[2]" />
                      ) : (
                        <Square className="w-5 h-5 stroke-[1.5]" />
                      )}
                    </button>

                    {/* Task details or edit inputs */}
                    {isEditing ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingTaskText}
                          onChange={e => setEditingTaskText(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-stone-200 rounded-md focus:outline-rose-800 font-semibold"
                        />
                        <select
                          value={editingTaskUrgency}
                          onChange={e => setEditingTaskUrgency(e.target.value as 'alta' | 'media' | 'baixa')}
                          className="px-1.5 py-1 text-[10px] font-bold border border-stone-200 rounded-md focus:outline-rose-800"
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                        <button
                          onClick={() => handleSaveEdit(task.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-semibold block truncate ${
                          task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                        }`}>
                          {task.label}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-bold border px-2 py-0.2 rounded-full uppercase tracking-wider ${
                            urgencyLabels[task.urgency].bg
                          }`}>
                            {urgencyLabels[task.urgency].text}
                          </span>
                          {task.completed && (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded-full uppercase">
                              Concluído
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => handleStartEdit(task)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar tarefa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Guest Activity List / Recent RSVPs */}
      <motion.div 
        variants={itemVariants}
        id="overview-recent-rsvps"
        className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-900">Interações Recentes dos Convidados</h3>
            <p className="text-xs text-slate-400">Últimas atividades registradas na plataforma</p>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('guests')}
            className="text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Todos os Convidados</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {guests.filter(g => g.lastViewedAt || g.confirmedAt).slice(0, 4).map((guest, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs ${
                  guest.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                  guest.status === 'Declined' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                }`}>
                  {guest.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{guest.name}</div>
                  <div className="text-[10px] text-slate-400">{guest.group} • {guest.email}</div>
                </div>
              </div>

              <div className="text-right">
                {guest.confirmedAt ? (
                  <div>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                      guest.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {guest.status === 'Confirmed' ? 'Presença Confirmada' : 'Não Comparecerá'}
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Respondido em {new Date(guest.confirmedAt).toLocaleDateString()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                      Visualizou o Site
                    </span>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Último acesso em {new Date(guest.lastViewedAt!).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 🖼️ MODAL: EDIT COUPLE PROFILE PHOTO */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative space-y-5"
            >
              <button
                onClick={() => setShowPhotoModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-800 border border-rose-100">
                  <Camera className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-serif text-xl text-slate-900 font-bold">Foto de Perfil dos Noivos</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Personalize a foto do casal exibida na página inicial e no cabeçalho do painel.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Upload via local file */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Carregar do Computador / Celular</label>
                  <div
                    onClick={() => couplePhotoInputRef.current?.click()}
                    className="border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/30 hover:bg-rose-50/60 p-4 rounded-2xl text-center cursor-pointer transition-all"
                  >
                    <input 
                      type="file" 
                      ref={couplePhotoInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleCouplePhotoFileChange}
                    />
                    <Upload className="w-6 h-6 text-rose-500 mx-auto stroke-[1.5]" />
                    <span className="text-xs font-bold text-slate-700 block mt-1">
                      Clique para selecionar foto
                    </span>
                    <span className="text-[10px] text-slate-400">
                      JPG, PNG ou WebP
                    </span>
                  </div>
                </div>

                {/* Preset romantic portraits */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 block">Ou escolha uma foto de demonstração</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Elegante', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=400' },
                      { label: 'Romântico', url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=400' },
                      { label: 'Pôr do Sol', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=400' },
                      { label: 'Praia', url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&q=80&w=400' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSaveCouplePhotoUrl(preset.url)}
                        className="relative rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-rose-500 transition-all cursor-pointer group"
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white py-0.5 text-center font-semibold">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL input */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ou informe a URL da Imagem</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={photoUrlInput}
                      onChange={e => setPhotoUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCouplePhotoUrl(photoUrlInput)}
                      className="px-3.5 py-2 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏢 POPUP DIALOGUE FOR FIRST-TIME VENUE SETUP */}
      <AnimatePresence>
        {showVenueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-stone-150 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowVenueModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-800 border border-rose-100">
                  <MapPin className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-serif text-2xl text-stone-900 font-bold">Onde será realizado o Evento?</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Configure os dados do espaço contratado para o seu casamento. Essas informações ajudam a calcular vagas exatas e guiar os convidados.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nome do Espaço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Salão de Festas Clássico"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 focus:bg-white transition-all font-semibold"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Endereço / Localização</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Av. Deolinda Rodrigues, Luanda, Angola"
                    value={venueAddress}
                    onChange={e => setVenueAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Capacity */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Capacidade Máxima (Pessoas)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ex: 300"
                      value={venueCapacity}
                      onChange={e => setVenueCapacity(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  {/* Parking */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Vaga de Estacionamento?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVenueHasParking(true)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          venueHasParking 
                            ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs' 
                            : 'bg-slate-50 border-stone-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Sim, Possui Vagas
                      </button>
                      <button
                        type="button"
                        onClick={() => setVenueHasParking(false)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          !venueHasParking 
                            ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold' 
                            : 'bg-slate-50 border-stone-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Não Possui
                      </button>
                    </div>
                  </div>
                </div>

                {/* Photos Drag & Drop */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Carregar Fotos do Espaço (Máx 3)</label>
                  
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      dragOver 
                        ? 'border-rose-800 bg-rose-50/20' 
                        : 'border-stone-200 hover:border-rose-800/60 hover:bg-stone-50/50'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple 
                      onChange={handleFileChange}
                    />
                    <Upload className="w-6 h-6 text-stone-400 mx-auto stroke-[1.5]" />
                    <span className="text-[10px] font-semibold text-stone-600 block mt-1.5">
                      Arraste imagens aqui ou clique para selecionar
                    </span>
                    <span className="text-[9px] text-stone-400 block mt-0.5">
                      Arquivos JPEG, PNG compatíveis com navegador
                    </span>
                  </div>

                  {/* Render uploaded thumbnails */}
                  {venuePhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {venuePhotos.map((photo, index) => (
                        <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-stone-200 shadow-xs group">
                          <img 
                            src={photo} 
                            alt="Visual de teste" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(index);
                            }}
                            className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-rose-600 text-white p-0.5 rounded-full transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowVenueModal(false)}
                  className="flex-1 py-3 border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Adicionar Mais Tarde
                </button>
                <button
                  onClick={handleSaveVenue}
                  disabled={!venueName.trim() || !venueAddress.trim() || !venueCapacity}
                  className="flex-1 py-3 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-xl text-xs transition-all disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed cursor-pointer shadow-md text-center"
                >
                  Salvar Informações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK PROFILE EDIT MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-600 fill-rose-600/20" />
                  <h3 className="font-serif font-bold text-slate-800 text-base">Editar Perfil dos Noivos & Casamento</h3>
                </div>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
                {/* Couple Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Nome do Noivo (Ele) *</label>
                    <input
                      type="text"
                      value={profileGroom}
                      onChange={e => setProfileGroom(e.target.value)}
                      placeholder="Ex: Gabriel"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Nome da Noiva (Ela) *</label>
                    <input
                      type="text"
                      value={profileBride}
                      onChange={e => setProfileBride(e.target.value)}
                      placeholder="Ex: Sofia"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                {/* Full Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Nome Completo do Noivo</label>
                    <input
                      type="text"
                      value={profileGroomFull}
                      onChange={e => setProfileGroomFull(e.target.value)}
                      placeholder="Ex: Gabriel Pureza dos Santos"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Nome Completo da Noiva</label>
                    <input
                      type="text"
                      value={profileBrideFull}
                      onChange={e => setProfileBrideFull(e.target.value)}
                      placeholder="Ex: Sofia Kiala de Oliveira"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Data do Casamento *</label>
                    <input
                      type="date"
                      value={profileDate}
                      onChange={e => setProfileDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Horário da Cerimónia</label>
                    <input
                      type="time"
                      value={profileCeremonyTime}
                      onChange={e => setProfileCeremonyTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Ceremony Venue */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Local da Cerimónia</span>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Nome do Local da Cerimónia</label>
                    <input
                      type="text"
                      value={profileCeremony}
                      onChange={e => setProfileCeremony(e.target.value)}
                      placeholder="Ex: Espaço Jardins da Welwitschia — Talatona"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Endereço da Cerimónia</label>
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={e => setProfileAddress(e.target.value)}
                      placeholder="Ex: Via AL 15, Condomínio Welwitschia, Talatona, Luanda, Angola"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                {/* Reception Venue */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Copo de Água / Festa (Recepção)</span>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Nome do Salão da Recepção</label>
                    <input
                      type="text"
                      value={profileReception}
                      onChange={e => setProfileReception(e.target.value)}
                      placeholder="Ex: Salão Nobre Luanda Prestige"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Endereço da Recepção</label>
                    <input
                      type="text"
                      value={profileReceptionAddress}
                      onChange={e => setProfileReceptionAddress(e.target.value)}
                      placeholder="Ex: Via AL 15, Talatona, Luanda"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                {/* Love Story & Message */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">História & Mensagem aos Convidados</span>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Título da História</label>
                    <input
                      type="text"
                      value={profileStoryTitle}
                      onChange={e => setProfileStoryTitle(e.target.value)}
                      placeholder="Ex: Nossa História de Amor"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">Resumo da História / Votos de Boas-Vindas</label>
                    <textarea
                      rows={3}
                      value={profileStoryContent}
                      onChange={e => setProfileStoryContent(e.target.value)}
                      placeholder="Compartilhe como vocês se conheceram e uma mensagem carinhosa para os seus convidados..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                {/* Couple Photo URL */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">Foto Principal do Casal / Capa do Convite</span>
                  <div className="space-y-1">
                    <label className="block text-slate-600 font-semibold">URL da Imagem ou Foto</label>
                    <input
                      type="text"
                      value={profileCouplePhoto}
                      onChange={e => setProfileCouplePhoto(e.target.value)}
                      placeholder="https://... (ou altere pelo botão da foto no topo do painel)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  ✓ As alterações salvas são refletidas instantaneamente em todo o site dos convidados, no bilhete digital, no cronograma e no formulário de confirmação de presença (RSVP).
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 py-2.5 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
