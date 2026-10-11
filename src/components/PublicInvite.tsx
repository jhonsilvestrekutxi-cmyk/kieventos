import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Calendar, MapPin, Clock, Music, Gift, 
  HelpCircle, Sparkles, AlertCircle, CheckCircle, XCircle,
  Copy, Smartphone, MessageSquare, Compass, Info, Check,
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Volume2, VolumeX, Sparkle, FileText, X, Camera, Video,
  Lock, LockKeyhole, Download, Printer, QrCode, ShieldCheck, Upload, Users, Share2, CheckCircle2, ArrowRight, ExternalLink,
  MessageCircle
} from 'lucide-react';
import { WeddingConfig, Guest, WeddingRegistryItem, GiftContributor } from '../types';
import { INITIAL_GUESTS } from '../data/defaultConfig';
import { compressImage, compressAvatar } from '../utils/imageCompressor';
import { downloadWeddingPdf, sendInviteViaWhatsApp } from '../utils/pdfGenerator';
import { dbService } from '../services/dbService';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { getSafeImageUrl, handleImageError } from '../utils/imageFallback';
import { generateQrDataUrl } from '../utils/qrCodeHelper';

interface PublicInviteProps {
  config: WeddingConfig;
  simulatedOnly?: boolean;
  visibleBlocks?: {
    story: boolean;
    timeline: boolean;
    venue: boolean;
    dressCode: boolean;
    registry: boolean;
    playlist: boolean;
    faq: boolean;
    guestCheckIn: boolean;
  };
  guestToken?: string;
  onGuestRsvpSubmit?: (
    token: string, 
    status: 'Confirmed' | 'Declined', 
    companions: number, 
    dietary: string, 
    notes: string,
    extraGuest?: Partial<Guest>
  ) => void;
  allGuests?: Guest[];
  onSwitchClient?: (clientId: string) => void;
  onUpdateConfig?: (config: WeddingConfig) => void;
}

// Particle interface for falling petals/glitter
interface Petal {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  spin: number;
  opacity: number;
}

export default function PublicInvite({ 
  config: initialConfig, 
  simulatedOnly = false,
  visibleBlocks = {
    story: true,
    timeline: true,
    venue: true,
    dressCode: true,
    registry: true,
    playlist: true,
    faq: true,
    guestCheckIn: true,
  },
  guestToken = '',
  onGuestRsvpSubmit,
  allGuests = [],
  onSwitchClient,
  onUpdateConfig
}: PublicInviteProps) {
  // Live reactive wedding configuration state (instantly reflects edits across the entire site)
  const [config, setConfig] = useState<WeddingConfig>(initialConfig);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [rsvpToast, setRsvpToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setRsvpToast({ show: true, message, type });
    setTimeout(() => setRsvpToast(null), 4500);
  };

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail?.config) {
        setConfig(e.detail.config);
      }
    };
    window.addEventListener('kutxi_wedding_config_changed', handleConfigChange);
    return () => window.removeEventListener('kutxi_wedding_config_changed', handleConfigChange);
  }, []);

  // Robust string cleaning for tokens, names, and pasted URLs
  const normalizeStr = (t: string) => {
    return (t || '')
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ""); // remove dashes, spaces, punctuation
  };

  const extractTokenFromInput = (raw: string): string => {
    let text = (raw || '').trim();
    if (text.includes('invite=')) {
      const match = text.match(/[?&]invite=([^&#\s]+)/i);
      if (match && match[1]) {
        text = decodeURIComponent(match[1]);
      }
    }
    if (text.toLowerCase().startsWith('rsvp:')) {
      text = text.substring(5);
    }
    return text.trim();
  };

  // Universal finder that matches across token, name, email, phone, and all localStorage partitions
  const findGuestAcrossAllSources = (rawQuery: string): { guest: Guest; clientId?: string; config?: WeddingConfig } | null => {
    if (!rawQuery || !rawQuery.trim()) return null;
    const extracted = extractTokenFromInput(rawQuery);
    const normExtracted = normalizeStr(extracted);
    const normRaw = normalizeStr(rawQuery);
    const digitsQuery = rawQuery.replace(/[^0-9]/g, '');

    const queryWords = rawQuery
      .toLowerCase()
      .trim()
      .split(/[\s-]+/)
      .map(w => normalizeStr(w))
      .filter(w => w.length >= 2);

    const matchGuest = (g: Guest): boolean => {
      if (!g) return false;
      const gToken = g.rsvpToken || '';
      const gName = g.name || '';
      const gEmail = g.email || '';
      const gPhone = g.phone || '';
      const gId = g.id || '';

      const normGToken = normalizeStr(gToken);
      const normGName = normalizeStr(gName);
      const normGEmail = normalizeStr(gEmail);
      const normGPhone = (gPhone || '').replace(/[^0-9]/g, '');

      // 1. Direct token match
      if (gToken.toLowerCase() === extracted.toLowerCase() || gToken.toLowerCase() === rawQuery.toLowerCase().trim()) return true;
      if (normGToken && (normGToken === normExtracted || normGToken === normRaw)) return true;
      if (gId === extracted || gId === rawQuery.trim()) return true;

      // 2. Token partial match / contains
      if (normGToken && normRaw.length >= 3 && (normGToken.includes(normRaw) || normRaw.includes(normGToken))) return true;
      if (normGToken && normExtracted.length >= 3 && (normGToken.includes(normExtracted) || normExtracted.includes(normGToken))) return true;

      // 3. Name matching (full & partial)
      if (normGName && (normGName === normRaw || normGName === normExtracted)) return true;
      if (normGName && normRaw.length >= 3 && (normGName.includes(normRaw) || normRaw.includes(normGName))) return true;

      // 4. Word-by-word match (e.g. searching "Pedro" or "Pureza" matches "Pedro Pureza" or token "pedro-pureza-8170")
      if (queryWords.length > 0) {
        const guestCombined = normalizeStr(gName) + ' ' + normGToken;
        const matchesAnyWord = queryWords.some(qw => guestCombined.includes(qw));
        if (matchesAnyWord) return true;
      }

      // 5. Digits match (e.g. "8170" matches "pedro-pureza-8170")
      if (digitsQuery.length >= 4 && normGToken.includes(digitsQuery)) return true;

      // 6. Email match
      if (normGEmail && (normGEmail === normRaw || normGEmail === normExtracted)) return true;

      // 7. Phone match
      if (normGPhone && digitsQuery.length >= 6 && normGPhone.includes(digitsQuery)) return true;

      return false;
    };

    // 1. Check current allGuests list
    const inCurrent = (allGuests || []).find(matchGuest);
    if (inCurrent) {
      return { guest: inCurrent, clientId: config.clientId || 'client_1', config };
    }

    // 2. Check across ALL localStorage guest partitions dynamically
    try {
      const allKeys = Object.keys(localStorage);
      const guestKeys = allKeys.filter(k => 
        k.startsWith('kutxi_guests_') || 
        k.startsWith('vowsflow_guests_') || 
        k === 'kutxi_guests' || 
        k === 'vowsflow_guests'
      );

      for (const key of guestKeys) {
        let cid = 'client_1';
        if (key.includes('_guests_')) {
          cid = key.split('_guests_')[1];
        }
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const list: Guest[] = JSON.parse(raw);
            if (Array.isArray(list)) {
              const found = list.find(matchGuest);
              if (found) {
                let clientConfig: WeddingConfig | undefined;
                try {
                  const savedConf = safeGetItem(`kutxi_wedding_config_${cid}`) || 
                                    (cid === 'client_1' ? safeGetItem('kutxi_wedding_config') : null);
                  if (savedConf) clientConfig = JSON.parse(savedConf);
                } catch (e) {}
                return { guest: found, clientId: cid, config: clientConfig || config };
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Storage guest search error:", e);
    }

    // 3. Check client configurations snapshots in kutxi_clients
    try {
      const savedClients = safeGetItem('kutxi_clients') || safeGetItem('vowsflow_clients');
      if (savedClients) {
        const list = JSON.parse(savedClients);
        if (Array.isArray(list)) {
          for (const c of list) {
            const clientGuests = safeGetItem(`kutxi_guests_${c.id}`);
            if (clientGuests) {
              const parsed = JSON.parse(clientGuests);
              if (Array.isArray(parsed)) {
                const found = parsed.find(matchGuest);
                if (found) return { guest: found, clientId: c.id, config: c.config || config };
              }
            }
          }
        }
      }
    } catch (e) {}

    // 4. Fallback: check INITIAL_GUESTS (always available, ensures pedro-pureza-8170 and demo guests resolve)
    const initialFound = INITIAL_GUESTS.find(matchGuest);
    if (initialFound) {
      let clientConfig: WeddingConfig | undefined;
      try {
        const savedConf = safeGetItem(`kutxi_wedding_config_${config.clientId || 'client_1'}`) || safeGetItem('kutxi_wedding_config');
        if (savedConf) clientConfig = JSON.parse(savedConf);
      } catch (e) {}
      return { guest: initialFound, clientId: config.clientId || 'client_1', config: clientConfig || config };
    }

    return null;
  };
  
  // View Layout Modes
  // 'ticket' = Dual Column VIP Ticket & Digital Invitation (Requested layout)
  // 'scroller' = Luxury scrolling web page
  // 'video-invite' = Reverse-engineered animated mobile video invitation (9:16)
  const [viewMode, setViewMode] = useState<'ticket' | 'scroller' | 'video-invite'>('ticket');

  // Menu dos Noivos custom tab controls
  const [noivosSubTab, setNoivosSubTab] = useState<'photos' | 'video' | 'info'>('photos');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Background Audio Controller
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active scene inside Video Invite Slide System
  const [currentScene, setCurrentScene] = useState(0);
  const [autoPlayVideo, setAutoPlayVideo] = useState(true);

  // RSVP Form States
  const [tokenInput, setTokenInput] = useState(guestToken || '');
  const [validatedGuest, setValidatedGuest] = useState<Guest | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<'Confirmed' | 'Declined'>('Confirmed');
  const [companionsCount, setCompanionsCount] = useState(0);
  const [dietaryInfo, setDietaryInfo] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [rsvpCompleted, setRsvpCompleted] = useState(false);

  // Self-Registration & Quick Guest Finder State
  const [showSelfRegisterForm, setShowSelfRegisterForm] = useState(false);
  const [selfRegName, setSelfRegName] = useState('');
  const [selfRegPhone, setSelfRegPhone] = useState('');
  const [selfRegGroup, setSelfRegGroup] = useState<GuestGroup>('Friends');
  const [selfRegCompanions, setSelfRegCompanions] = useState(0);
  const [selfRegStatus, setSelfRegStatus] = useState<'Confirmed' | 'Declined'>('Confirmed');
  const [selfRegDietary, setSelfRegDietary] = useState('');
  const [selfRegNotes, setSelfRegNotes] = useState('');
  const [claimedRegistry, setClaimedRegistry] = useState<string[]>([]);
  const [showPixCopied, setShowPixCopied] = useState(false);
  const [showIbanCopied, setShowIbanCopied] = useState(false);
  const [showMcxCopied, setShowMcxCopied] = useState(false);
  const [showPhoneCopied, setShowPhoneCopied] = useState(false);
  const [showAmountCopied, setShowAmountCopied] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Saved Donor Profile in localStorage (Persistent donor information)
  const [savedDonorProfile, setSavedDonorProfile] = useState<{ name: string; photo?: string; phone?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('kutxi_donor_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isEditingDonorDetails, setIsEditingDonorDetails] = useState(false);

  // Gift registry interactive states
  const [activeGiftCategory, setActiveGiftCategory] = useState<string>('all');
  const [selectedGiftModal, setSelectedGiftModal] = useState<WeddingRegistryItem | null>(null);
  const [selectedGiftSubscribersModal, setSelectedGiftSubscribersModal] = useState<WeddingRegistryItem | null>(null);
  const [giftDonorName, setGiftDonorName] = useState(() => savedDonorProfile?.name || '');
  const [giftDonorPhoto, setGiftDonorPhoto] = useState<string>(() => savedDonorProfile?.photo || '');
  const [giftDonorPhone, setGiftDonorPhone] = useState<string>(() => savedDonorProfile?.phone || '');
  const [giftContributionAmount, setGiftContributionAmount] = useState<number>(0);
  const [giftCustomAmount, setGiftCustomAmount] = useState<string>('');
  const [giftProofPhoto, setGiftProofPhoto] = useState<string>('');
  const [giftDonorMessage, setGiftDonorMessage] = useState('');
  const [giftPaymentMethod, setGiftPaymentMethod] = useState<'multicaixa' | 'iban' | 'pix'>('multicaixa');
  const [giftSuccessPopup, setGiftSuccessPopup] = useState<{ name: string; item: string; amount?: number; photo?: string } | null>(null);

  // Collective Photo Album state
  const [sharedPhotos, setSharedPhotos] = useState<{ id: string; guestName: string; imageUrl: string; timestamp: string; caption?: string; approved?: boolean }[]>(() => {
    const saved = localStorage.getItem(`kutxi_photos_${config.id}`) || localStorage.getItem(`vowsflow_photos_${config.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    // Default mock shared photos to look stunning out of the box
    return [
      { id: 'ph_1', guestName: 'Madrinha Isabella', imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600', timestamp: '19/09/2026 18:24', caption: 'O casal mais lindo de Luanda! Que energia!', approved: true },
      { id: 'ph_2', guestName: 'Lucas Vance', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600', timestamp: '19/09/2026 19:10', caption: 'Festa simplesmente inesquecível!', approved: true },
    ];
  });

  // Save photos to localStorage whenever they change
  useEffect(() => {
    safeSetItem(`kutxi_photos_${config.id}`, JSON.stringify(sharedPhotos));
  }, [sharedPhotos, config.id]);

  // Shared Album Tabs & Comment states
  const [albumTab, setAlbumTab] = useState<'photos' | 'wishes'>('photos');
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  
  const [affectionMessages, setAffectionMessages] = useState<{ id: string; clientName: string; text: string; timestamp: string }[]>(() => {
    const saved = localStorage.getItem(`kutxi_affection_msgs_${config.id}`) || localStorage.getItem(`vowsflow_affection_msgs_${config.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      { id: 'msg_1', clientName: 'Madrinha Isabella', text: 'Queridos noivos, que alegria ver a união de vocês! Que Deus abençoe ricamente cada passo desta nova jornada.', timestamp: '19/09/2026 18:30' },
      { id: 'msg_2', clientName: 'Lucas Vance', text: 'Parabéns ao casal! Que festa maravilhosa e que amor inspirador!', timestamp: '19/09/2026 19:15' },
      { id: 'msg_3', clientName: 'Tia Eleonora', text: 'Meus afilhados amados, meu coração transborda de felicidade por vocês hoje.', timestamp: '19/09/2026 19:45' }
    ];
  });

  // Save affectionMessages to localStorage whenever they change
  useEffect(() => {
    safeSetItem(`kutxi_affection_msgs_${config.id}`, JSON.stringify(affectionMessages));
  }, [affectionMessages, config.id]);

  useEffect(() => {
    if (validatedGuest) {
      setNewCommentName(validatedGuest.name);
    }
  }, [validatedGuest]);

  // Auto-validate guestToken when passed
  useEffect(() => {
    if (guestToken) {
      const matchResult = findGuestAcrossAllSources(guestToken);
      
      if (matchResult?.clientId && onSwitchClient) {
        onSwitchClient(matchResult.clientId);
      }

      if (matchResult?.config) {
        setConfig(matchResult.config);
        if (onUpdateConfig) {
          onUpdateConfig(matchResult.config);
        }
      }

      if (matchResult?.guest) {
        const matched = matchResult.guest;
        setValidatedGuest(matched);
        setTokenInput(matched.rsvpToken);
        setRsvpStatus(matched.status === 'Pending' ? 'Confirmed' : (matched.status as 'Confirmed' | 'Declined'));
        setCompanionsCount(matched.plusOnesConfirmed || 0);
        setDietaryInfo(matched.dietaryRequirements || '');
        setGuestNotes(matched.notes || '');
        
        // Land guest on their personalized digital ticket
        setViewMode('ticket');
      }
    }
  }, [guestToken, allGuests]);

  // Keep validatedGuest state in sync with updated allGuests list to prevent stale data/cache issues
  useEffect(() => {
    if (validatedGuest) {
      const latest = allGuests.find(g => g.id === validatedGuest.id || normalizeStr(g.rsvpToken) === normalizeStr(validatedGuest.rsvpToken));
      if (latest && (
        latest.status !== validatedGuest.status ||
        latest.plusOnesConfirmed !== validatedGuest.plusOnesConfirmed ||
        latest.dietaryRequirements !== validatedGuest.dietaryRequirements ||
        latest.notes !== validatedGuest.notes ||
        latest.name !== validatedGuest.name
      )) {
        setValidatedGuest(latest);
        setRsvpStatus(latest.status as 'Confirmed' | 'Declined');
        setCompanionsCount(latest.plusOnesConfirmed || 0);
        setDietaryInfo(latest.dietaryRequirements || '');
        setGuestNotes(latest.notes || '');
      }
    }
  }, [allGuests, validatedGuest]);

  // Offline vector/canvas QR Code generator for validated guest passes
  useEffect(() => {
    if (validatedGuest?.rsvpToken) {
      generateQrDataUrl(`rsvp:${validatedGuest.rsvpToken}`, 220)
        .then(url => setQrCodeDataUrl(url))
        .catch(() => {});
    } else {
      setQrCodeDataUrl('');
    }
  }, [validatedGuest?.rsvpToken]);

  // Helper to determine if collective album/comments are accessible (wedding day and day after)
  const isAlbumAccessible = () => {
    try {
      const weddingDate = new Date(config.date);
      if (isNaN(weddingDate.getTime())) return true; // Safe fallback

      // Start of wedding day (00:00:00)
      const startOfWeddingDay = new Date(weddingDate);
      startOfWeddingDay.setHours(0, 0, 0, 0);

      // End of next day (23:59:59)
      const endOfNextDay = new Date(weddingDate);
      endOfNextDay.setDate(endOfNextDay.getDate() + 1);
      endOfNextDay.setHours(23, 59, 59, 999);

      const now = new Date();
      return now >= startOfWeddingDay && now <= endOfNextDay;
    } catch (e) {
      return true; // Safe fallback
    }
  };

  const albumActive = isAlbumAccessible();

  const getAlbumDateRangeString = () => {
    try {
      const weddingDate = new Date(config.date);
      if (isNaN(weddingDate.getTime())) return 'na data do casamento';
      const day1 = weddingDate.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const nextDay = new Date(weddingDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const day2 = nextDay.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return `${day1} a ${day2}`;
    } catch (e) {
      return 'na data do casamento e no dia seguinte';
    }
  };

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Generate Falling Petals State
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    // Generate randomized falling petals / golden glitters
    const list: Petal[] = Array.from({ length: 18 }, (_, idx) => ({
      id: idx,
      left: Math.random() * 100, // percentage
      delay: Math.random() * 12, // seconds delay
      duration: 6 + Math.random() * 8, // seconds falling
      size: 8 + Math.random() * 14, // px
      spin: Math.random() * 360, // degrees
      opacity: 0.3 + Math.random() * 0.5
    }));
    setPetals(list);
  }, []);

  // Timer loop
  useEffect(() => {
    const target = new Date(config.date).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.date]);

  // Autoplay scenes interval for video simulation
  useEffect(() => {
    let interval: any;
    if (viewMode === 'video-invite' && autoPlayVideo) {
      interval = setInterval(() => {
        setCurrentScene(prev => (prev + 1) % 6);
      }, 5500); // 5.5 seconds per story scene
    }
    return () => clearInterval(interval);
  }, [viewMode, autoPlayVideo]);

  // Sound handler
  const toggleAudio = () => {
    if (!audioRef.current) {
      // Elegant, soft classical piano romance soundtrack
      audioRef.current = new Audio('https://assets.mixkit.co/music/preview/mixkit-warm-light-1130.mp3');
      audioRef.current.loop = true;
    }
    
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(err => console.log("Audio autoplay restriction: ", err));
      setIsPlayingAudio(true);
    }
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle Token verification
  const handleVerifyToken = (e: FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setErrorMsg('');
    const matchResult = findGuestAcrossAllSources(tokenInput);

    if (!matchResult?.guest) {
      setErrorMsg('Código de convite ou nome não encontrado. Verifique a ortografia ou consulte os noivos.');
      return;
    }

    if (matchResult.clientId && onSwitchClient) {
      onSwitchClient(matchResult.clientId);
    }

    if (matchResult.config) {
      setConfig(matchResult.config);
      if (onUpdateConfig) {
        onUpdateConfig(matchResult.config);
      }
    }

    const matched = matchResult.guest;

    if (matched.status !== 'Pending') {
      // Permite rever/editar, mas avisa elegantemente
      setValidatedGuest(matched);
      setRsvpStatus(matched.status as 'Confirmed' | 'Declined');
      setCompanionsCount(matched.plusOnesConfirmed || 0);
      setDietaryInfo(matched.dietaryRequirements || '');
      setGuestNotes(matched.notes || '');
      setViewMode('ticket');
      return;
    }

    setValidatedGuest(matched);
    setCompanionsCount(0);
    setRsvpStatus('Confirmed');
    setViewMode('ticket');
  };

  const handleRsvpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validatedGuest) return;

    if (onGuestRsvpSubmit) {
      onGuestRsvpSubmit(
        validatedGuest.rsvpToken,
        rsvpStatus,
        companionsCount,
        dietaryInfo,
        guestNotes,
        validatedGuest
      );
    }

    setRsvpCompleted(true);
    showToast(
      rsvpStatus === 'Confirmed'
        ? `✓ Presença e reserva confirmadas com sucesso, ${validatedGuest.name}! Seu bilhete de acesso foi gerado.`
        : `✓ Agradecemos por nos informar, ${validatedGuest.name}.`,
      'success'
    );
  };

  const handleSelfRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = selfRegName.trim();
    if (!cleanName) return;

    const slug = cleanName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 20);
    const token = `reserva-${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newGuestObj: Guest = {
      id: 'guest_' + Date.now(),
      name: cleanName,
      email: '',
      phone: selfRegPhone.trim(),
      group: selfRegGroup,
      tableNumber: 'Mesa Especial Convidados',
      maxPlusOnes: Math.max(selfRegCompanions, 2),
      plusOnesConfirmed: selfRegCompanions,
      status: selfRegStatus,
      dietaryRequirements: selfRegDietary.trim(),
      notes: selfRegNotes.trim(),
      rsvpToken: token,
      invitationViews: 1,
      lastViewedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      checkedIn: false
    };

    setValidatedGuest(newGuestObj);
    setRsvpStatus(selfRegStatus);
    setCompanionsCount(selfRegCompanions);
    setDietaryInfo(selfRegDietary);
    setGuestNotes(selfRegNotes);
    setRsvpCompleted(true);
    setShowSelfRegisterForm(false);

    if (onGuestRsvpSubmit) {
      onGuestRsvpSubmit(
        token,
        selfRegStatus,
        selfRegCompanions,
        selfRegDietary,
        selfRegNotes,
        newGuestObj
      );
    }

    showToast(
      selfRegStatus === 'Confirmed'
        ? `✓ Reserva confirmada para ${cleanName}! Bilhete VIP gerado com sucesso.`
        : `✓ Resposta de ausência registrada com sucesso para ${cleanName}.`,
      'success'
    );
  };

  const handleClaimRegistryItem = (itemId: string) => {
    if (claimedRegistry.includes(itemId)) return;
    setClaimedRegistry(prev => [...prev, itemId]);
  };

  // Dedicated function for deep linking to Multicaixa Express
  const handleOpenMulticaixaApp = () => {
    try {
      // 1. Attempt standard deep link URL scheme for Multicaixa Express (EMIS)
      window.location.href = 'mcx://open';
      
      // 2. Android intent scheme fallback
      setTimeout(() => {
        // If not opened or on Android, try intent or Play Store fallback
        const isAndroid = /android/i.test(navigator.userAgent);
        if (isAndroid) {
          window.location.href = 'intent://open#Intent;scheme=mcx;package=ao.emis.mcx;end';
        }
      }, 500);
    } catch (e) {
      console.warn("Deep link MCX error:", e);
    }
  };

  // Helper to process photo from device upload with compression
  const handleFileUpload = async (file: File, callback: (base64: string) => void) => {
    try {
      if (!file) return;
      const compressed = await compressImage(file, 1000, 0.82);
      if (compressed) {
        callback(compressed);
      }
    } catch (e) {
      console.warn("handleFileUpload error:", e);
    }
  };

  // Process and save gift contribution with social proof and persistent donor profile
  const handleConfirmGiftContribution = () => {
    if (!selectedGiftModal) return;

    const donorName = giftDonorName.trim() || (validatedGuest ? validatedGuest.name : 'Convidado Especial');
    const amountToGive = Number(giftContributionAmount) > 0 
      ? Number(giftContributionAmount) 
      : (Number(giftCustomAmount) > 0 ? Number(giftCustomAmount) : selectedGiftModal.price);

    const newContributor: GiftContributor = {
      id: 'contrib_' + Date.now(),
      name: donorName,
      amount: amountToGive,
      date: new Date().toLocaleDateString('pt-AO'),
      avatarUrl: giftDonorPhoto || undefined,
      message: giftDonorMessage.trim() || undefined,
      phone: giftDonorPhone.trim() || undefined,
      proofUrl: giftProofPhoto || undefined,
    };

    // Persist donor profile for future gifts so guest is not prompted again
    const donorProfileData = {
      name: donorName,
      photo: giftDonorPhoto || undefined,
      phone: giftDonorPhone.trim() || undefined,
    };
    try {
      safeSetItem('kutxi_donor_profile', JSON.stringify(donorProfileData));
    } catch (e) {
      console.warn("Failed to persist donor profile:", e);
    }
    setSavedDonorProfile(donorProfileData);
    setIsEditingDonorDetails(false);

    // Calculate new total collected
    const existingTotal = selectedGiftModal.totalCollected || (selectedGiftModal.contributors?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0);
    const newTotal = existingTotal + amountToGive;
    const isNowClaimed = newTotal >= selectedGiftModal.price;

    const updatedItem: WeddingRegistryItem = {
      ...selectedGiftModal,
      totalCollected: newTotal,
      claimedBy: isNowClaimed ? (selectedGiftModal.claimedBy || donorName) : selectedGiftModal.claimedBy,
      contributors: [...(selectedGiftModal.contributors || []), newContributor]
    };

    // Update weddingConfig registry
    const updatedRegistryItems = config.giftRegistry.registryItems.map(item => 
      item.id === selectedGiftModal.id ? updatedItem : item
    );

    const updatedConfig: WeddingConfig = {
      ...config,
      giftRegistry: {
        ...config.giftRegistry,
        registryItems: updatedRegistryItems
      }
    };

    // Save to storage immediately
    try {
      safeSetItem(`kutxi_config_${config.id}`, JSON.stringify(updatedConfig));
    } catch (e) {
      console.warn("Storage save error:", e);
    }

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }

    // Mark as locally claimed if fully covered
    if (isNowClaimed) {
      handleClaimRegistryItem(selectedGiftModal.id);
    }

    // Save message to collective affection wall if provided
    if (giftDonorMessage.trim()) {
      const newMsg = {
        id: 'msg_' + Date.now(),
        clientName: donorName,
        text: `[Presente: ${selectedGiftModal.name} (${amountToGive.toLocaleString('pt-AO')} Kz)] ${giftDonorMessage.trim()}`,
        timestamp: new Date().toLocaleDateString('pt-AO') + ' ' + new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
      };
      setAffectionMessages(prev => [newMsg, ...prev]);
    }

    setGiftSuccessPopup({
      name: donorName,
      item: selectedGiftModal.name,
      amount: amountToGive,
      photo: giftDonorPhoto
    });

    setSelectedGiftModal(null);
    setGiftDonorMessage('');
    setGiftProofPhoto('');
    setGiftContributionAmount(0);
    setGiftCustomAmount('');
    // Note: We intentionally retain giftDonorName and giftDonorPhoto in state and localStorage so the user is never asked again!
  };

  // Styling helper classes matching active config theme
  const getThemeStyles = () => {
    const theme = config.theme;
    return {
      primaryColorText: { color: theme.primaryColor },
      primaryBg: { backgroundColor: theme.primaryColor },
      accentText: { color: theme.accentColor },
      accentBg: { backgroundColor: theme.accentColor },
      cardBg: theme.glassEffect ? 'backdrop-blur-md bg-white/90 border border-amber-200/30' : 'bg-white border border-stone-100',
      headingFont: theme.fontHeading === 'serif' ? 'font-serif font-light' : theme.fontHeading === 'display' ? 'font-sans tracking-tight' : 'font-sans',
      bodyFont: theme.fontBody === 'serif' ? 'font-serif' : 'font-sans',
      btnRound: theme.buttonStyle === 'rounded-full' ? 'rounded-full' : theme.buttonStyle === 'rounded-md' ? 'rounded-lg' : 'rounded-none',
      spacingClass: theme.spacing === 'compact' ? 'py-8' : theme.spacing === 'relaxed' ? 'py-14' : 'py-20',
    };
  };

  const s = getThemeStyles();

  // Mapping English groups to Portuguese
  const translateGroup = (group: string) => {
    const mapping: Record<string, string> = {
      'Family': 'Família',
      'Friends': 'Amigos',
      'VIP': 'Convidado de Honra (VIP)',
      'Bride Side': 'Família da Noiva',
      'Groom Side': 'Família do Noivo',
      'Children': 'Crianças',
      'Corporate': 'Trabalho / Corporativo'
    };
    return mapping[group] || group;
  };

  return (
    <div className={`min-h-screen ${s.bodyFont} text-stone-800 relative select-none overflow-x-hidden`} style={{ backgroundColor: config.theme.bgColor }}>
      
      {/* REAL FLOATING ROSE PETALS (ANIMATION DECORATION) */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {petals.map(petal => (
          <div
            key={petal.id}
            className="absolute bg-rose-300/30 rounded-full blur-xs"
            style={{
              left: `${petal.left}%`,
              top: `-40px`,
              width: `${petal.size}px`,
              height: `${petal.size * 0.85}px`,
              transform: `rotate(${petal.spin}deg)`,
              animation: `fall ${petal.duration}s linear infinite`,
              animationDelay: `${petal.delay}s`,
              opacity: petal.opacity,
            }}
          />
        ))}
      </div>

      {/* CSS KEYFRAMES FOR THE CHOSEN FALLING PETALS ACCENTS */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
          }
          50% {
            transform: translateY(50vh) rotate(180deg) translateX(50px);
          }
          100% {
            transform: translateY(105vh) rotate(360deg) translateX(-30px);
          }
        }
        .gold-border {
          border-image: linear-gradient(to right, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c) 1;
        }
        .text-gold {
          background: linear-gradient(to right, #bf953f, #aa771c, #b38728, #bf953f);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* FLOAT BAR FOR MUSIC AND DESIGN SELECTION */}
      <div className="bg-stone-950 text-white py-3 px-4 flex items-center justify-between gap-3 sticky top-0 z-40 shadow-xl border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <div>
            <div className="text-[11px] font-bold text-stone-300 leading-none">Kutxi LUXO • REVERSÃO DE PRODUTO</div>
            <div className="text-[9px] text-stone-400 font-mono tracking-wider">Inspirado em Convite Animado Interativo WhatsApp do Etsy</div>
          </div>
        </div>

        {/* Music Controls (Equalizer & Sound Controller) */}
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
              isPlayingAudio ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>MÚSICA ATIVA</span>
                {/* Visual bouncing audio equalizer bars */}
                <span className="flex items-end gap-0.5 h-2.5 w-3.5 overflow-hidden ml-1">
                  <span className="w-0.5 bg-stone-950 rounded-full animate-[bounce_1s_infinite_0.1s]"></span>
                  <span className="w-0.5 bg-stone-950 rounded-full animate-[bounce_1.2s_infinite_0.3s]"></span>
                  <span className="w-0.5 bg-stone-950 rounded-full animate-[bounce_0.8s_infinite_0.5s]"></span>
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                <span>PLAY SOUNDTRACK</span>
              </>
            )}
          </button>

          {/* Toggle between Ticket pass, 9:16 vertical slideshow and scrolled web content */}
          <div className="bg-stone-900 border border-stone-800 p-0.5 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('ticket')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'ticket' 
                  ? 'bg-amber-500 text-stone-950 shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Bilhete Digital</span>
            </button>
            <button
              onClick={() => setViewMode('video-invite')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'video-invite' 
                  ? 'bg-amber-500 text-stone-950 shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Heart className="w-3 h-3 text-red-400" />
              <span>Menu dos Noivos</span>
            </button>
            <button
              onClick={() => setViewMode('scroller')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'scroller' 
                  ? 'bg-amber-500 text-stone-950 shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Site Completo</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- RENDER OPTION C: DUAL COLUMN VIP TICKET & DIGITAL INVITATION --- */}
      {viewMode === 'ticket' && (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (5 Columns): Elegant Wedding Invitation Cover */}
            <div className="lg:col-span-5 bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-xl flex flex-col relative">
              <div className="absolute top-4 left-4 z-10 bg-amber-500/90 text-stone-950 font-bold text-[9px] uppercase px-3 py-1 rounded-full shadow-md tracking-wider">
                Convite Oficial
              </div>
              
              {/* Couple Cover Photo */}
              <div className="aspect-[4/5] bg-stone-100 relative overflow-hidden">
                <img 
                  src={getSafeImageUrl(config.brideGroom.couplePhoto || config.media.coverImage, 'cover')} 
                  alt={`${config.brideGroom.groomName} e ${config.brideGroom.brideName}`} 
                  onError={(e) => handleImageError(e, 'cover')}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"></div>
                
                {/* Couple Names on top of picture */}
                <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                  <p className="font-serif tracking-widest text-xs sm:text-sm uppercase text-amber-300 font-semibold mb-1">Casamento de</p>
                  <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-white drop-shadow-md">
                    {config.brideGroom.groomName} & {config.brideGroom.brideName}
                  </h1>
                </div>
              </div>

              {/* Ceremony / Invitation Text Details */}
              <div className="p-6 sm:p-8 text-left space-y-6 bg-stone-50">
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-500 uppercase tracking-widest">A Cerimónia & Recepção</h4>
                  <p className="font-serif text-2xl sm:text-3xl text-stone-900 leading-snug font-medium">{config.venue.ceremonyName}</p>
                  <p className="text-sm sm:text-base text-stone-600 font-medium leading-relaxed">{config.venue.ceremonyAddress}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-stone-200/80 pt-5 text-sm">
                  <div>
                    <span className="text-stone-500 block font-medium text-xs sm:text-sm">Data do Casamento</span>
                    <strong className="text-stone-900 block mt-1 text-base sm:text-lg font-bold">
                      {new Date(config.date).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block font-medium text-xs sm:text-sm">Horário</span>
                    <strong className="text-amber-900 block mt-1 text-base sm:text-lg font-bold">
                      {new Date(config.date).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })} Horas
                    </strong>
                  </div>
                </div>

                {/* PDF & WHATSAPP ACTION BUTTONS */}
                <div className="pt-2 flex flex-col gap-2">
                  {config.pdfUrl && (
                    <button
                      onClick={() => setShowPdfModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer text-center"
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      Visualizar Convite Impresso (PDF)
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadWeddingPdf(config, validatedGuest || undefined)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Baixar PDF
                    </button>
                    <button
                      onClick={() => sendInviteViaWhatsApp(config, validatedGuest || undefined)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (7 Columns): VIP Personalized Ticket Stub */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* If guest is NOT validated yet, show code access card */}
              {!validatedGuest ? (
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-200/80 shadow-xl text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-800 border border-rose-100">
                    <Heart className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-medium">Aceda ao seu Bilhete Digital</h2>
                    <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                      Insira o seu nome completo ou o código exclusivo do convite (Token) para ver a sua mesa reservada e confirmar a sua presença no casamento.
                    </p>
                  </div>

                  {!showSelfRegisterForm ? (
                    <>
                      <form onSubmit={handleVerifyToken} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Pedro Pureza ou pedro-pureza-8170"
                          value={tokenInput}
                          onChange={e => setTokenInput(e.target.value)}
                          className="flex-1 px-4 py-3.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-rose-800 bg-white shadow-2xs"
                        />
                        <button
                          type="submit"
                          className="px-6 py-3.5 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-sm cursor-pointer transition-all shadow-md shrink-0"
                        >
                          Aceder Bilhete
                        </button>
                      </form>

                      {/* Guest suggestions when typing */}
                      {tokenInput.trim().length >= 2 && (
                        <div className="max-w-md mx-auto space-y-1.5 text-left bg-stone-50 p-3 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                            Convidados Encontrados na Lista (clique para aceder):
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {allGuests
                              .filter(g =>
                                g.name.toLowerCase().includes(tokenInput.toLowerCase()) ||
                                g.rsvpToken.toLowerCase().includes(tokenInput.toLowerCase())
                              )
                              .slice(0, 6)
                              .map(g => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    setTokenInput(g.rsvpToken);
                                    setValidatedGuest(g);
                                    setRsvpStatus(g.status === 'Pending' ? 'Confirmed' : (g.status as 'Confirmed' | 'Declined'));
                                    setCompanionsCount(g.plusOnesConfirmed || 0);
                                    setDietaryInfo(g.dietaryRequirements || '');
                                    setGuestNotes(g.notes || '');
                                  }}
                                  className="px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-2xs"
                                >
                                  <span>{g.name}</span>
                                  <span className="text-[10px] text-amber-700 font-mono">({g.tableNumber})</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl max-w-md mx-auto text-left">
                          <p className="text-xs text-rose-800 font-semibold">{errorMsg}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSelfRegisterForm(true);
                            setSelfRegName(tokenInput);
                          }}
                          className="text-xs text-rose-800 hover:text-rose-950 font-bold underline cursor-pointer"
                        >
                          Não encontrou seu nome na lista? Confirmar Nova Reserva / Presença →
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Self-registration form */
                    <form onSubmit={handleSelfRegisterSubmit} className="max-w-md mx-auto space-y-4 text-left p-5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <h4 className="font-serif font-bold text-stone-900 text-sm">Confirmar Nova Reserva de Assento</h4>
                        <button
                          type="button"
                          onClick={() => setShowSelfRegisterForm(false)}
                          className="text-stone-400 hover:text-stone-600 font-bold"
                        >
                          Voltar à busca
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-stone-600 font-semibold">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={selfRegName}
                          onChange={e => setSelfRegName(e.target.value)}
                          placeholder="Ex: Carlos Alberto Silva"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-rose-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-stone-600 font-semibold">Telefone / WhatsApp</label>
                          <input
                            type="tel"
                            value={selfRegPhone}
                            onChange={e => setSelfRegPhone(e.target.value)}
                            placeholder="+244 9..."
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-rose-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-stone-600 font-semibold">Família / Categoria</label>
                          <select
                            value={selfRegGroup}
                            onChange={e => setSelfRegGroup(e.target.value as GuestGroup)}
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-rose-800"
                          >
                            <option value="Friends">Amigos</option>
                            <option value="Bride Side">Família da Noiva</option>
                            <option value="Groom Side">Família do Noivo</option>
                            <option value="Family">Família</option>
                            <option value="VIP">Convidado VIP</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-stone-600 font-semibold">Confirmação de Presença</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelfRegStatus('Confirmed')}
                            className={`py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer text-center ${
                              selfRegStatus === 'Confirmed'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-stone-600 border-stone-200'
                            }`}
                          >
                            Sim, Comparecerei! ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelfRegStatus('Declined')}
                            className={`py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer text-center ${
                              selfRegStatus === 'Declined'
                                ? 'bg-stone-800 text-white border-stone-800'
                                : 'bg-white text-stone-600 border-stone-200'
                            }`}
                          >
                            Não poderei ir ✗
                          </button>
                        </div>
                      </div>

                      {selfRegStatus === 'Confirmed' && (
                        <>
                          <div className="space-y-1">
                            <label className="block text-stone-600 font-semibold">Acompanhantes com você</label>
                            <select
                              value={selfRegCompanions}
                              onChange={e => setSelfRegCompanions(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                            >
                              <option value={0}>Apenas eu (0 acompanhantes)</option>
                              <option value={1}>+1 Acompanhante</option>
                              <option value={2}>+2 Acompanhantes</option>
                              <option value={3}>+3 Acompanhantes</option>
                              <option value={4}>+4 Acompanhantes</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-stone-600 font-semibold">Restrições Alimentares / Alergias</label>
                            <input
                              type="text"
                              value={selfRegDietary}
                              onChange={e => setSelfRegDietary(e.target.value)}
                              placeholder="Ex: Vegetariano, Sem lactose..."
                              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="block text-stone-600 font-semibold">Mensagem aos Noivos (Opcional)</label>
                        <textarea
                          rows={2}
                          value={selfRegNotes}
                          onChange={e => setSelfRegNotes(e.target.value)}
                          placeholder="Deixe um recado afetuoso para os noivos..."
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-rose-900 hover:bg-rose-950 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all"
                      >
                        Confirmar Reserva & Emitir Bilhete VIP ✓
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* PERSONALIZED VIP TICKET PASS */
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xl overflow-hidden relative">
                  
                  {/* Decorative Ticket Notch Border */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-stone-100 rounded-full border border-stone-200/40 z-10 -translate-y-1/2" style={{ backgroundColor: config.theme.bgColor }}></div>
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-stone-100 rounded-full border border-stone-200/40 z-10 -translate-y-1/2" style={{ backgroundColor: config.theme.bgColor }}></div>
                  
                  {/* Ticket Header */}
                  <div className="bg-stone-950 text-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-dashed border-stone-800">
                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-900 px-3 py-1 rounded-full">
                          Passe de Entrada Exclusivo
                        </span>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      </div>
                      <h3 className="font-serif text-2xl sm:text-3xl text-white font-medium">Olá, {validatedGuest.name}!</h3>
                    </div>
                    
                    {/* Active Status Tag */}
                    <div className="shrink-0">
                      {validatedGuest.status === 'Confirmed' ? (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Presença Confirmada
                        </span>
                      ) : validatedGuest.status === 'Declined' ? (
                        <span className="bg-stone-900 text-stone-400 border border-stone-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          Ausência Informada
                        </span>
                      ) : (
                        <span className="bg-amber-950 text-amber-400 border border-amber-900/60 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Aguardando RSVP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ticket Body: QR Code and Place Details */}
                  <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* QR Code Column */}
                    <div className="md:col-span-5 text-center space-y-3">
                      <div className="w-40 h-40 bg-white border-2 border-dashed border-stone-200/80 p-2.5 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                        <img 
                          src={qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=rsvp:${validatedGuest.rsvpToken}`}
                          alt="QR Code do Passe"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-stone-400 font-medium block">Código do Passe</span>
                        <strong className="text-xs font-mono text-stone-900 uppercase tracking-widest">{validatedGuest.rsvpToken}</strong>
                      </div>
                    </div>

                    {/* Seat and Table Designations Column */}
                    <div className="md:col-span-7 space-y-5 text-left md:border-l md:border-stone-100 md:pl-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 shadow-2xs">
                          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Mesa Designada</span>
                          <strong className="text-stone-900 text-base sm:text-lg font-mono font-bold mt-1 block">
                            {validatedGuest.tableNumber || "Mesa de Honra"}
                          </strong>
                        </div>
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 shadow-2xs">
                          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Grupo / Categoria</span>
                          <strong className="text-stone-900 text-sm sm:text-base font-bold mt-1 block truncate">
                            {translateGroup(validatedGuest.group)}
                          </strong>
                        </div>
                      </div>

                      <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100 flex items-start gap-3">
                        <Info className="w-5 h-5 text-rose-800 mt-0.5 shrink-0" />
                        <div className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                          Este passe é pessoal e intransmissível. Permite a entrada do titular e acompanhantes autorizados no cerimonial.
                        </div>
                      </div>

                      {/* Map Shortcuts */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-stone-400 font-semibold uppercase block">GPS / Rotas para a Portaria</span>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={config.venue.ceremonyMapsUrl || "https://maps.google.com"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1 py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-bold transition-all"
                          >
                            <MapPin className="w-3.5 h-3.5 text-rose-800" />
                            Google Maps
                          </a>
                          <a
                            href={`https://waze.com/ul?q=${encodeURIComponent(config.venue.ceremonyAddress)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1 py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-bold transition-all"
                          >
                            <Compass className="w-3.5 h-3.5 text-indigo-700" />
                            Waze GPS
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive RSVP Update Form inside Ticket */}
                  <div className="bg-stone-50 p-6 border-t border-stone-100 space-y-4 text-left">
                    <h4 className="font-semibold text-stone-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Atualizar Status de Presença (RSVP)
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRsvpStatus('Confirmed')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          rsvpStatus === 'Confirmed' 
                            ? 'bg-rose-800 text-white border-rose-800 shadow-sm' 
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        Vou Comparecer ✓
                      </button>
                      <button
                        onClick={() => setRsvpStatus('Declined')}
                        className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          rsvpStatus === 'Declined' 
                            ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        Não poderei ir ✗
                      </button>
                    </div>

                    {rsvpStatus === 'Confirmed' && validatedGuest.maxPlusOnes > 0 && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="block text-stone-500 text-[10px]">Acompanhantes Confirmados (Máx: {validatedGuest.maxPlusOnes})</label>
                        <select
                          value={companionsCount}
                          onChange={e => setCompanionsCount(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs"
                        >
                          {Array.from({ length: validatedGuest.maxPlusOnes + 1 }, (_, i) => (
                            <option key={i} value={i}>{i} Acompanhante{i !== 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-stone-500 text-[10px]">Restrições Alimentares / Alergias</label>
                        <input
                          type="text"
                          placeholder="Ex: Vegetariano, Sem glúten..."
                          value={dietaryInfo}
                          onChange={e => setDietaryInfo(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-stone-500 text-[10px]">Recado para os Noivos (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Envie uma mensagem carinhosa..."
                          value={guestNotes}
                          onChange={e => setGuestNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        handleRsvpSubmit(e);
                        // Update original guest object in memory instantly
                        const updated = {
                          ...validatedGuest,
                          status: rsvpStatus,
                          plusOnesConfirmed: companionsCount,
                          dietaryRequirements: dietaryInfo,
                          notes: guestNotes
                        };
                        setValidatedGuest(updated);
                        
                        if (rsvpStatus === 'Declined') {
                          showToast('Seu RSVP foi gravado (Não poderei ir). Agradecemos por nos informar! ✓', 'info');
                        } else {
                          showToast('Presença Confirmada com Sucesso! Bem-vindo ao site do casamento. ✓', 'success');
                        }
                        setViewMode('scroller');
                      }}
                      className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center block shadow-md uppercase tracking-wider ${
                        rsvpStatus === 'Confirmed' 
                          ? 'bg-rose-800 hover:bg-rose-900 text-white' 
                          : 'bg-stone-800 hover:bg-stone-900 text-white'
                      }`}
                    >
                      {rsvpStatus === 'Confirmed' ? 'Confirmar Presença & Avançar para o Site' : 'Confirmar Ausência & Avançar para o Site'}
                    </button>

                    {validatedGuest.status === 'Confirmed' && (
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowVoucherModal(true)}
                          className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          Descarregar Comprovativo de Presença (Voucher VIP)
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('scroller')}
                          className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center block border border-stone-200"
                        >
                          Avançar Diretamente para o Site Completo →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLLECTIVE PHOTO ALBUM COMPONENT (Requested Feature) */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xl space-y-6 text-left" id="collective-album-section">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-[10px] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                      Álbum Coletivo & Mensagens de Carinho
                    </div>
                    <h3 className="font-serif text-lg text-stone-900">Deixe os noivos sentirem o seu carinho...</h3>
                  </div>

                  {/* Tab Selector */}
                  <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/40 shrink-0 self-start md:self-center">
                    <button
                      onClick={() => setAlbumTab('photos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        albumTab === 'photos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Mural de Fotos
                    </button>
                    <button
                      onClick={() => setAlbumTab('wishes')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        albumTab === 'wishes' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      Mensagens de Carinho
                    </button>
                  </div>
                </div>

                {/* Wedding Day Restriction Banner */}
                {!albumActive && (
                  <div className="bg-amber-50/70 border border-amber-250 p-4 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                    <LockKeyhole className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <strong className="font-semibold block">Acesso Fechado (Disponível Apenas no Evento)</strong>
                      <p className="text-amber-800 leading-relaxed text-[11px] font-medium">
                        O Álbum Coletivo e o painel de Mensagens de Carinho estarão abertos para novos envios exclusivamente no dia do casamento e no dia seguinte (<span className="underline font-bold font-mono">{getAlbumDateRangeString()}</span>). Aproveite para apreciar os exemplos de demonstração abaixo!
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 1: PHOTO ALBUM */}
                {albumTab === 'photos' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400 font-medium">Fotos compartilhadas pelos convidados</span>
                      
                      {albumActive ? (
                        <label className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shrink-0">
                          <Camera className="w-4 h-4 text-white" />
                          Tirar Foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    const photoGuestName = validatedGuest ? validatedGuest.name : 'Convidado';
                                    const captionText = prompt('Adicione uma legenda curta para a sua foto (Opcional):');
                                    const newPhoto = {
                                      id: 'ph_' + Date.now(),
                                      guestName: photoGuestName,
                                      imageUrl: reader.result,
                                      timestamp: new Date().toLocaleDateString('pt-AO') + ' ' + new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
                                      caption: captionText || 'Momento incrível!',
                                      approved: false // Starts as unapproved / pending moderation
                                    };
                                    setSharedPhotos(prev => [newPhoto, ...prev]);
                                    showToast('Sua foto foi enviada com sucesso! Ela passará pela moderação dos noivos antes de ficar visível no mural. ✓', 'success');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-400 rounded-lg text-xs font-semibold cursor-not-allowed border border-stone-200">
                          <Lock className="w-3 h-3" />
                          Tirar Foto (Bloqueado)
                        </div>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl leading-relaxed">
                      ✨ <strong>Moderação de Fotos Ativa:</strong> Para garantir a segurança de todos, as fotos tiradas pelos convidados são enviadas para aprovação prévia dos noivos antes de ficarem públicas para os convidados.
                    </p>

                    {/* Shared Photos Wall */}
                    {sharedPhotos.filter(photo => photo.approved === true).length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-6">Nenhuma foto aprovada no mural ainda. Seja o primeiro a eternizar um momento!</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {sharedPhotos.filter(photo => photo.approved === true).map(photo => (
                          <div key={photo.id} className="group bg-stone-50 rounded-2xl border border-stone-100 overflow-hidden shadow-xs hover:shadow-md transition-all">
                            <div className="aspect-square bg-stone-200 relative overflow-hidden">
                              <img 
                                src={photo.imageUrl} 
                                alt={`Por ${photo.guestName}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-all"
                              />
                            </div>
                            <div className="p-3 space-y-1">
                              <div className="flex items-center justify-between gap-1 text-[8px] text-stone-400">
                                <span className="font-semibold text-stone-600 truncate">{photo.guestName}</span>
                                <span className="font-mono">{photo.timestamp}</span>
                              </div>
                              {photo.caption && (
                                <p className="text-[10px] text-stone-500 line-clamp-2 leading-snug">{photo.caption}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: AFFECTION MESSAGES (COMMENTS) */}
                {albumTab === 'wishes' && (
                  <div className="space-y-6">
                    
                    {/* Add comment Form */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
                      <h4 className="font-serif font-medium text-stone-800 text-sm flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-rose-600 fill-rose-600/10" />
                        Deixe a sua Mensagem de Carinho
                      </h4>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-1 space-y-1">
                            <label className="block text-[10px] text-stone-400 uppercase font-semibold">Seu Nome</label>
                            <input 
                              type="text" 
                              placeholder="Seu nome completo"
                              disabled={!albumActive}
                              value={newCommentName}
                              onChange={e => setNewCommentName(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-rose-800 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[10px] text-stone-400 uppercase font-semibold">Sua Mensagem de Carinho</label>
                            <input 
                              type="text" 
                              placeholder="Escreva palavras doces para o casal..."
                              disabled={!albumActive}
                              value={newCommentText}
                              onChange={e => setNewCommentText(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs focus:outline-rose-800 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (!albumActive) return;
                            if (!newCommentName.trim() || !newCommentText.trim()) {
                              showToast('Por favor, preencha o seu nome e a mensagem de carinho.', 'info');
                              return;
                            }
                            const newMsg = {
                              id: 'msg_' + Date.now(),
                              clientName: newCommentName,
                              text: newCommentText,
                              timestamp: new Date().toLocaleDateString('pt-AO') + ' ' + new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
                            };
                            setAffectionMessages(prev => [newMsg, ...prev]);
                            setNewCommentText('');
                            showToast('Sua mensagem de carinho foi enviada com sucesso! Obrigado! ♥', 'success');
                          }}
                          disabled={!albumActive}
                          className="w-full sm:w-auto px-6 py-2 bg-rose-850 hover:bg-rose-900 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs inline-flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Enviar Mensagem</span>
                        </button>
                      </div>
                    </div>

                    {/* Comments Wall list */}
                    <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                      {affectionMessages.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-6">Nenhum recado de carinho ainda. Deixe o seu primeiro recado!</p>
                      ) : (
                        affectionMessages.map(msg => (
                          <div key={msg.id} className="bg-stone-50/60 p-3.5 rounded-2xl border border-stone-100 flex gap-3 items-start hover:bg-stone-50 transition-all">
                            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-100">
                              {msg.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-stone-800">{msg.clientName}</span>
                                <span className="text-[9px] text-stone-400 font-mono">{msg.timestamp}</span>
                              </div>
                              <p className="text-xs text-stone-600 leading-relaxed font-light italic">
                                "{msg.text}"
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- RENDER OPTION A: INTERACTIVE 'MENU DOS NOIVOS' (FULL PAGE LAYOUT) --- */}
      {viewMode === 'video-invite' && (
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-widest font-mono font-bold inline-block">
              Espaço Íntimo dos Noivos
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-stone-900 font-light tracking-wide leading-tight">
              O Diário de {config.brideGroom.groomName} & {config.brideGroom.brideName}
            </h2>
            <p className="text-xs text-stone-500 max-w-xl mx-auto leading-relaxed">
              Explore a galeria de recordações do casal, assista ao teaser oficial do ensaio pré-casamento e conheça os detalhes artísticos do nosso amor.
            </p>
          </div>

          {/* Majestic 3-Column Bento Grid or Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* COLUMN 1: GALERIA / CAROUSEL (4 Columns) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-mono tracking-widest text-amber-800 uppercase block font-bold">Álbum de Memórias</span>
                <h4 className="text-lg text-stone-950 font-serif font-light">Nossos Momentos Felizes</h4>
                <p className="text-xs text-stone-400">Cada clique guarda uma parte de nossa promessa.</p>
              </div>

              {/* Photo Carousel Viewer (Fuller Aspect) */}
              {(() => {
                const photosList = [config.brideGroom.couplePhoto, config.media.coverImage, config.media.storyImage, ...(config.media.photos || [])].filter(Boolean);
                const activePhoto = photosList[activePhotoIdx] || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600';
                
                return (
                  <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden group border border-stone-100 shadow-md">
                    <img 
                      src={getSafeImageUrl(activePhoto, 'gallery')} 
                      alt="Couple Moment" 
                      onError={(e) => handleImageError(e, 'gallery')}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"></div>

                    {/* Overlay Controls */}
                    <button
                      onClick={() => setActivePhotoIdx(prev => (prev - 1 + photosList.length) % photosList.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/85 transition-all cursor-pointer z-20"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActivePhotoIdx(prev => (prev + 1) % photosList.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/85 transition-all cursor-pointer z-20"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Caption index tracker */}
                    <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] font-mono text-stone-200 font-bold tracking-widest z-20">
                      MOMENTO {activePhotoIdx + 1} DE {photosList.length}
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-stone-500 font-light text-center italic leading-relaxed pt-2">
                "Cada detalhe da nossa caminhada nos trouxe até este momento mágico. Obrigado por fazer parte da nossa história."
              </p>
            </div>

            {/* COLUMN 2: TEASER VÍDEO (4 Columns) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-mono tracking-widest text-amber-800 uppercase block font-bold">Registro em Movimento</span>
                <h4 className="text-lg text-stone-950 font-serif font-light">Teaser Oficial do Casal</h4>
                <p className="text-xs text-stone-400">Assista ao nosso ensaio romântico oficial pré-casamento.</p>
              </div>

              {/* Video Player Box */}
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden border border-stone-100 bg-stone-950 flex flex-col items-center justify-center relative shadow-md">
                {config.youtubeVideoId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${config.youtubeVideoId}?rel=0`}
                    className="w-full h-full border-0 rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Love Trailer"
                  ></iframe>
                ) : (
                  <div className="p-4 text-center space-y-2.5">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-100">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-700 font-bold">Nenhum vídeo carregado</p>
                      <p className="text-[10px] text-stone-400 leading-normal max-w-[180px] mx-auto mt-0.5">Nossos noivos ainda não publicaram o teaser do ensaio pré-casamento.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center pt-2">
                <span className="text-[9px] uppercase font-mono tracking-widest text-amber-800 font-bold bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                  Teaser Cinema & Arte
                </span>
              </div>
            </div>

            {/* COLUMN 3: HISTÓRIA & INFORMAÇÕES ADICIONAIS (4 Columns) */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-1.5 text-left">
                <span className="text-[9px] font-mono tracking-widest text-amber-800 uppercase block font-bold">Sobre Nós & Detalhes</span>
                <h4 className="text-lg text-stone-950 font-serif font-light">Nossa Essência</h4>
                <p className="text-xs text-stone-400">Conheça um pouco mais sobre nós e o evento.</p>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-1 text-left">
                {/* Love Story Segment */}
                <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-1.5 text-stone-800 font-serif font-medium text-xs">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-600/10" />
                    <span>Nossa História</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-light">
                    {config.storyContent || 'O amor une dois corações em uma só batida. Estamos ansiosos para celebrar essa linda caminhada rumo ao altar ao lado dos nossos amigos e familiares mais queridos.'}
                  </p>
                </div>

                {/* Location segment */}
                <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-1.5 text-stone-800 font-mono text-[9px] uppercase tracking-wider font-bold">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>Cerimônia & Festa</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-stone-900 font-bold block">{config.venue.ceremonyName}</span>
                    <span className="text-[11px] text-stone-500 block leading-relaxed">{config.venue.ceremonyAddress}</span>
                  </div>
                </div>

                {/* Dress Code segment */}
                <div className="space-y-2 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="text-stone-800 font-mono text-[9px] uppercase tracking-wider font-bold">
                    <span>Código de Vestimenta</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-light">{config.dressCode.description}</p>
                  <div className="flex gap-2 pt-1.5">
                    {config.dressCode.colorPalette.map((color, idx) => (
                      <div key={idx} className="w-5 h-5 rounded-full border border-stone-200 shadow-xs" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="text-center pt-6 space-y-3">
            {config.pdfUrl && (
              <button
                onClick={() => setShowPdfModal(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer mx-auto"
              >
                <FileText className="w-4 h-4" />
                Abrir Versão Impressa Oficial (PDF)
              </button>
            )}

            <button
              onClick={() => {
                setViewMode('scroller');
                setTimeout(() => {
                  document.getElementById('rsvp-card-block')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-stone-400 hover:text-amber-600 text-xs font-semibold underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              Prefere pular o menu e ir direto para o RSVP do convite? Clique aqui
            </button>
          </div>
        </div>
      )}

      {/* --- RENDER OPTION B: ORIGINAL PREMIUM HIGH-END SCROLLING WEBSITE (FULLY LOCALIZED PORTUGUESE) --- */}
      {viewMode === 'scroller' && (
        <div className="relative">
          
          {/* 1. HERO COVER SECTION */}
          <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
            {/* Cover Background Image Overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src={getSafeImageUrl(config.brideGroom.couplePhoto || config.media.coverImage, 'cover')} 
                alt="Fundo do Casamento" 
                onError={(e) => handleImageError(e, 'cover')}
                className="w-full h-full object-cover scale-105 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/90"></div>
            </div>

            <div className="relative z-10 text-white max-w-2xl space-y-6 pt-12">
              <motion.span 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-xs uppercase tracking-widest font-semibold text-amber-300 block ${s.headingFont}`}
              >
                Convidam com imensa alegria para celebrar seu casamento
              </motion.span>

              <motion.h1 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className={`text-5xl md:text-7xl ${s.headingFont} font-light tracking-wide leading-tight`}
              >
                {config.brideGroom.groomName} <span className="font-serif italic font-normal text-3xl md:text-4xl block my-2 text-amber-300">&</span> {config.brideGroom.brideName}
              </motion.h1>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="h-px w-24 bg-amber-300/60 mx-auto my-4"
              ></motion.div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm md:text-base font-light tracking-wider"
              >
                {config.venue.ceremonyTime}
              </motion.p>

              {/* Luxury Floating Countdown */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto bg-black/45 backdrop-blur-md border border-white/10 p-4 rounded-xl mt-6"
              >
                {[
                  { label: 'Dias', value: timeLeft.days },
                  { label: 'Horas', value: timeLeft.hours },
                  { label: 'Minutos', value: timeLeft.minutes },
                  { label: 'Segundos', value: timeLeft.seconds }
                ].map((unit, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-xl md:text-2xl font-bold font-mono text-amber-300">{unit.value}</div>
                    <div className="text-[9px] uppercase tracking-wider text-stone-300 font-medium mt-0.5">{unit.label}</div>
                  </div>
                ))}
              </motion.div>

              {/* Floating Call to RSVP Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-6"
              >
                <a 
                  href="#rsvp-card-block" 
                  className={`inline-block px-8 py-3 text-xs uppercase tracking-widest font-semibold hover:opacity-90 transition-all text-white border border-amber-300/40`}
                  style={s.primaryBg}
                >
                  Confirmar Presença (RSVP)
                </a>
              </motion.div>
            </div>
            
            {/* Soft scrolling indicator arrow */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/50 animate-bounce">
              <Clock className="w-5 h-5 text-amber-300" />
            </div>
          </section>

          {/* 2. THE STORY SECTION */}
          {visibleBlocks.story && (
            <section className={`${s.spacingClass} px-6 max-w-4xl mx-auto text-center space-y-6`}>
              <span className={`text-[10px] tracking-widest uppercase font-bold text-stone-400 block ${s.headingFont}`}>Nossa Jornada</span>
              <h2 className={`text-3xl md:text-4xl ${s.headingFont} text-stone-900 tracking-wide font-medium`}>{config.storyTitle}</h2>
              <div className="w-16 h-0.5 mx-auto bg-stone-200"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-6 text-left">
                <div className="space-y-4">
                  <p className="text-stone-600 leading-relaxed text-sm md:text-base font-light">
                    {config.storyContent}
                  </p>
                  <div className="border-l-2 border-amber-800 pl-4 py-2 italic text-stone-500 text-xs">
                    "O amor não consiste em olhar um para o outro, mas sim em olhar juntos na mesma direção." — Antoine de Saint-Exupéry
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden shadow-lg border border-stone-100">
                  <img 
                    src={getSafeImageUrl(config.media.storyImage || config.brideGroom.couplePhoto || config.media.coverImage, 'story')} 
                    alt={`${config.brideGroom.groomName} e ${config.brideGroom.brideName}`} 
                    onError={(e) => handleImageError(e, 'story')}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </section>
          )}

          {/* PHYSICAL PDF INVITATION BANNER */}
          {config.pdfUrl && (
            <section className="px-6 py-10 max-w-4xl mx-auto">
              <div className="bg-stone-50 border border-stone-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md text-left">
                <div className="space-y-2">
                  <span className="inline-block text-[10px] tracking-widest uppercase font-bold text-amber-800 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                    Convite Clássico Impresso
                  </span>
                  <h3 className="font-serif text-xl md:text-2xl text-stone-900 font-light leading-tight">
                    Gostaria de visualizar nosso convite oficial em PDF?
                  </h3>
                  <p className="text-xs text-stone-500 max-w-md leading-normal">
                    Disponibilizamos a versão oficial de alta fidelidade impressa para que você possa conferir todos os detalhes artísticos e guardá-la como recordação.
                  </p>
                </div>
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  Visualizar PDF do Convite
                </button>
              </div>
            </section>
          )}

          {/* 3. WEDDING TIMELINE */}
          {visibleBlocks.timeline && (
            <section className={`bg-stone-50/70 border-y border-stone-200/50 ${s.spacingClass} px-6`}>
              <div className="max-w-xl mx-auto text-center space-y-4 mb-10">
                <span className={`text-[10px] tracking-widest uppercase font-bold text-stone-400 block ${s.headingFont}`}>Cronograma do Casamento</span>
                <h2 className={`text-3xl md:text-4xl ${s.headingFont} text-stone-900 tracking-wide font-medium`}>Programação do Grande Dia</h2>
                <div className="w-16 h-0.5 mx-auto bg-stone-200"></div>
              </div>

              <div className="relative max-w-lg mx-auto border-l border-stone-200 pl-6 space-y-8 text-xs">
                {config.timeline.map((event, idx) => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    {/* Visual marker */}
                    <span className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-white border-2 border-amber-800 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-800"></span>
                    </span>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-800 tracking-wider text-[10px] bg-amber-50 border border-amber-150 px-2 py-0.5 rounded">
                          {event.time}
                        </span>
                        <h3 className={`font-semibold text-stone-800 text-sm ${s.headingFont}`}>{event.title}</h3>
                      </div>
                      <p className="text-stone-500 leading-relaxed font-light pl-1">{event.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* 4. VENUE INFORMATION */}
          {visibleBlocks.venue && (
            <section className={`${s.spacingClass} px-6 max-w-4xl mx-auto space-y-8`}>
              <div className="text-center space-y-4">
                <span className={`text-[10px] tracking-widest uppercase font-bold text-stone-400 block ${s.headingFont}`}>Localização</span>
                <h2 className={`text-3xl md:text-4xl ${s.headingFont} text-stone-900 tracking-wide font-medium`}>Como Chegar aos Locais</h2>
                <div className="w-16 h-0.5 mx-auto bg-stone-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs">
                {/* Card 1: Ceremony */}
                <div className={`${s.cardBg} p-6 rounded-2xl flex flex-col justify-between space-y-4`}>
                  <div className="space-y-2">
                    <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md font-bold text-[9px] uppercase tracking-wider">A CERIMÔNIA</span>
                    <h3 className="font-bold text-stone-800 text-sm">{config.venue.ceremonyName}</h3>
                    <p className="text-stone-500 leading-relaxed">{config.venue.ceremonyAddress}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <a 
                      href={config.venue.ceremonyMapsUrl} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg font-semibold transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-800" />
                      Google Maps
                    </a>
                    <a 
                      href={config.venue.ceremonyWazeUrl} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg font-semibold transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 text-sky-600" />
                      Waze Navegar
                    </a>
                  </div>
                </div>

                {/* Card 2: Reception */}
                <div className={`${s.cardBg} p-6 rounded-2xl flex flex-col justify-between space-y-4`}>
                  <div className="space-y-2">
                    <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md font-bold text-[9px] uppercase tracking-wider">A RECEPÇÃO & FESTA</span>
                    <h3 className="font-bold text-stone-800 text-sm">{config.venue.receptionName}</h3>
                    <p className="text-stone-500 leading-relaxed">{config.venue.receptionAddress}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <a 
                      href={config.venue.receptionMapsUrl} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg font-semibold transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-800" />
                      Google Maps
                    </a>
                    <a 
                      href={config.venue.receptionWazeUrl} 
                      target="_blank" 
                      referrerPolicy="no-referrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg font-semibold transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 text-sky-600" />
                      Waze Navegar
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 5. DRESS CODE */}
          {visibleBlocks.dressCode && (
            <section className={`bg-stone-50 border-y border-stone-200/50 ${s.spacingClass} px-6`}>
              <div className="max-w-xl mx-auto text-center space-y-6">
                <span className={`text-[10px] tracking-widest uppercase font-bold text-stone-400 block ${s.headingFont}`}>Estilo do Casamento</span>
                <h2 className={`text-3xl md:text-4xl ${s.headingFont} text-stone-900 tracking-wide font-medium`}>{config.dressCode.title}</h2>
                <div className="w-16 h-0.5 mx-auto bg-stone-200"></div>
                
                <p className="text-stone-500 leading-relaxed text-xs md:text-sm font-light">
                  {config.dressCode.description}
                </p>

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {config.dressCode.colorPalette.map((color, idx) => (
                    <div key={idx} className="text-center space-y-1 font-mono text-[9px] text-stone-400">
                      <div 
                        className="w-10 h-10 rounded-full border-2 border-white shadow-md mx-auto"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span>{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 6. GIFT REGISTRY */}
          {visibleBlocks.registry && (
            <section className={`${s.spacingClass} px-6 max-w-5xl mx-auto space-y-8`} id="gift-registry-section">
              <div className="text-center space-y-3">
                <span className={`text-[10px] tracking-widest uppercase font-bold text-stone-400 block ${s.headingFont}`}>Lista de Presentes & Cotas</span>
                <h2 className={`text-3xl md:text-4xl ${s.headingFont} text-stone-900 tracking-wide font-medium`}>Presentear {config.brideGroom.groomName} & {config.brideGroom.brideName}</h2>
                <div className="w-16 h-0.5 mx-auto bg-stone-200"></div>
                <p className="text-xs text-stone-500 max-w-lg mx-auto leading-relaxed">
                  Sua presença é nosso maior presente! Caso deseje nos homenagear com um mimo ou cota de lua de mel, escolha um item abaixo ou faça sua contribuição direta via Multicaixa Express / IBAN.
                </p>
              </div>

              {/* Payment Details Banner (Multicaixa Express / IBAN / Pix) */}
              <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Pagamento Direto</span>
                      <h3 className="text-base font-bold text-white">Dados Bancários para Contribuições</h3>
                    </div>
                  </div>
                  <span className="text-[11px] text-stone-400">Titular: <strong className="text-white">{config.giftRegistry.accountHolder || `${config.brideGroom.groomName} & ${config.brideGroom.brideName}`}</strong></span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Multicaixa Express */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:border-amber-400/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Multicaixa Express</span>
                      <Smartphone className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-stone-300 text-[11px]">Número de Telefone:</div>
                    <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl font-mono text-xs text-white">
                      <span>{config.giftRegistry.multicaixaPhone || '+244 923 000 000'}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(config.giftRegistry.multicaixaPhone || '+244923000000');
                          setShowMcxCopied(true);
                          setTimeout(() => setShowMcxCopied(false), 2000);
                        }}
                        className="p-1 hover:bg-white/20 rounded-md text-amber-300 cursor-pointer transition-colors"
                        title="Copiar número"
                      >
                        {showMcxCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* IBAN Angola */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:border-amber-400/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">IBAN ({config.giftRegistry.bankName || 'Banco BAI / BFA'})</span>
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-stone-300 text-[11px]">Conta Bancária:</div>
                    <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl font-mono text-xs text-white">
                      <span className="truncate mr-2 text-[11px]">{config.giftRegistry.bankAccount || 'AO06 0040 0000 1234 5678 9012 3'}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(config.giftRegistry.bankAccount || '');
                          setShowIbanCopied(true);
                          setTimeout(() => setShowIbanCopied(false), 2000);
                        }}
                        className="p-1 hover:bg-white/20 rounded-md text-amber-300 shrink-0 cursor-pointer transition-colors"
                        title="Copiar IBAN"
                      >
                        {showIbanCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Pix ou QR Code */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:border-amber-400/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Chave Pix / Internacional</span>
                      <QrCode className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-stone-300 text-[11px]">Chave E-mail / Celular:</div>
                    <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl font-mono text-xs text-white">
                      <span className="truncate mr-2 text-[11px]">{config.giftRegistry.pixKey || 'casamento@kutxi.ao'}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(config.giftRegistry.pixKey || '');
                          setShowPixCopied(true);
                          setTimeout(() => setShowPixCopied(false), 2000);
                        }}
                        className="p-1 hover:bg-white/20 rounded-md text-amber-300 shrink-0 cursor-pointer transition-colors"
                        title="Copiar chave"
                      >
                        {showPixCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {[
                  { id: 'all', label: 'Todos os Presentes' },
                  { id: 'Lua de Mel', label: '🌴 Cotas de Lua de Mel' },
                  { id: 'Eletrodomésticos', label: '⚡ Eletrodomésticos' },
                  { id: 'Cozinha', label: '🍳 Cozinha & Mesa' },
                  { id: 'Decoração', label: '🛋️ Decoração & Conforto' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveGiftCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeGiftCategory === cat.id
                        ? 'bg-rose-900 text-white shadow-md'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Gift Registry Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {config.giftRegistry.registryItems
                  .filter(item => activeGiftCategory === 'all' || item.category === activeGiftCategory)
                  .map(item => {
                    const totalCollected = item.totalCollected || (item.contributors?.reduce((sum, c) => sum + (c.amount || 0), 0) || (item.claimedBy ? item.price : 0));
                    const progressPercent = Math.min(100, Math.round((totalCollected / (item.price || 1)) * 100));
                    const isFullyFunded = progressPercent >= 100 || !!item.claimedBy || claimedRegistry.includes(item.id);
                    const contributors = item.contributors || [];
                    const hasContributors = contributors.length > 0;

                    return (
                      <div 
                        key={item.id} 
                        className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-lg ${
                          isFullyFunded ? 'border-emerald-200/80 bg-stone-50/40' : 'border-stone-200/80 hover:border-rose-300'
                        }`}
                      >
                        <div>
                          {/* Image with category chip */}
                          <div className="relative h-48 w-full bg-stone-100 overflow-hidden group">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            
                            {item.category && (
                              <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white shadow-xs">
                                {item.category}
                              </span>
                            )}

                            {isFullyFunded && (
                              <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Concluído!</span>
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="p-5 space-y-3">
                            <div>
                              <h3 className="font-bold text-sm text-stone-900 leading-snug">{item.name}</h3>
                              {item.description && (
                                <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {/* Social Proof Progress Bar */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-stone-500 font-medium">Arrecadado:</span>
                                <span className="font-bold text-rose-950 font-mono">
                                  {totalCollected.toLocaleString('pt-AO')} / {item.price.toLocaleString('pt-AO')} Kz
                                </span>
                              </div>

                              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60 relative">
                                <div 
                                  className={`h-full transition-all duration-500 rounded-full ${
                                    isFullyFunded 
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                                      : 'bg-gradient-to-r from-rose-700 to-amber-600'
                                  }`}
                                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                                />
                              </div>

                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-stone-400 font-medium">Progresso</span>
                                <span className={`font-bold ${isFullyFunded ? 'text-emerald-700' : 'text-rose-800'}`}>
                                  {progressPercent}% Concluído
                                </span>
                              </div>
                            </div>

                            {/* Foto das Pessoas que Presentearam (3 a 4 fotos + ... Ver mais) */}
                            <div className="pt-2.5 border-t border-stone-100">
                              {hasContributors ? (
                                <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-rose-50/70 border border-rose-100">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* 3 a 4 Fotos Circulares dos Doadores */}
                                    <div className="flex -space-x-2 shrink-0">
                                      {contributors.slice(0, 4).map((contrib, cIdx) => (
                                        <button
                                          key={contrib.id || cIdx}
                                          type="button"
                                          onClick={() => setSelectedGiftSubscribersModal(item)}
                                          title={`${contrib.name} (${contrib.amount.toLocaleString('pt-AO')} Kz)`}
                                          className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-rose-200 text-rose-900 flex items-center justify-center text-[10px] font-bold shadow-xs hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                                        >
                                          {contrib.avatarUrl ? (
                                            <img 
                                              src={contrib.avatarUrl} 
                                              alt={contrib.name} 
                                              className="w-full h-full object-cover" 
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <span>{contrib.name?.charAt(0) || 'C'}</span>
                                          )}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="text-[11px] text-stone-700 min-w-0 truncate">
                                      <span className="font-bold text-rose-950">
                                        {contributors.length} {contributors.length === 1 ? 'pessoa' : 'pessoas'}
                                      </span>
                                      <span className="text-stone-500 ml-1">já presentearam</span>
                                    </div>
                                  </div>

                                  {/* Redicências + Ver Mais */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedGiftSubscribersModal(item)}
                                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-200/80 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                                  >
                                    <span>... Ver mais</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50/60 border border-amber-200/50 text-[10px] text-amber-900 font-medium">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>✨ Seja o primeiro convidado a presentear este sonho!</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Price & Action */}
                        <div className="p-5 pt-0">
                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-stone-400 block font-medium">Valor Total</span>
                              <span className="text-sm font-bold text-stone-900">
                                {item.price.toLocaleString('pt-AO')} Kz
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedGiftModal(item);
                                if (savedDonorProfile?.name) {
                                  setGiftDonorName(savedDonorProfile.name);
                                  setGiftDonorPhoto(savedDonorProfile.photo || '');
                                  setGiftDonorPhone(savedDonorProfile.phone || '');
                                  setIsEditingDonorDetails(false);
                                } else if (validatedGuest) {
                                  setGiftDonorName(validatedGuest.name);
                                  setGiftDonorPhone(validatedGuest.phone || '');
                                  setIsEditingDonorDetails(false);
                                } else {
                                  setIsEditingDonorDetails(true);
                                }
                                setGiftContributionAmount(0);
                                setGiftCustomAmount('');
                              }}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                isFullyFunded
                                  ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                                  : 'bg-rose-900 hover:bg-rose-950 text-white hover:shadow-md'
                              }`}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>{isFullyFunded ? 'Contribuir Mais' : 'Presentear'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* 7. SPOTIFY PLAYLIST INTEGRATION */}
          {visibleBlocks.playlist && config.spotifyPlaylistUrl && (
            <section className={`bg-stone-900 text-white ${s.spacingClass} px-6`}>
              <div className="max-w-xl mx-auto text-center space-y-6">
                <span className={`text-[10px] tracking-widest uppercase font-bold text-amber-300 block ${s.headingFont}`}>Trilha Sonora</span>
                <h2 className={`text-3xl md:text-4xl ${s.headingFont} tracking-wide font-medium text-white`}>Música do Casamento</h2>
                <div className="w-16 h-0.5 mx-auto bg-amber-500/50"></div>
                
                <p className="text-stone-300 leading-relaxed text-xs md:text-sm font-light">
                  Aproveite e ouça nossa playlist de casamento ou sugira suas melodias românticas favoritas para o DJ.
                </p>

                {/* Spotify iframe */}
                <div className="rounded-xl overflow-hidden shadow-2xl border border-white/5 bg-black/40 p-1 max-w-md mx-auto">
                  <iframe 
                    src={config.spotifyPlaylistUrl} 
                    width="100%" 
                    height="152" 
                    frameBorder="0" 
                    allowFullScreen={false} 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    title="Playlist de Casamento"
                    className="rounded-lg"
                  ></iframe>
                </div>
              </div>
            </section>
          )}

          {/* 8. FAQ ACCORDION */}
          {visibleBlocks.faq && (
            <section className={`${s.spacingClass} px-6 max-w-2xl mx-auto space-y-6`}>
              <div className="text-center space-y-4 mb-8">
                <span className={`text-[10px] tracking-widest uppercase font-bold text-stone-400 block ${s.headingFont}`}>Dúvidas Comuns</span>
                <h2 className={`text-3xl md:text-4xl ${s.headingFont} text-stone-900 tracking-wide font-medium`}>Perguntas Frequentes (FAQ)</h2>
                <div className="w-16 h-0.5 mx-auto bg-stone-200"></div>
              </div>

              <div className="space-y-3.5 text-xs">
                {config.faq.map(item => (
                  <details key={item.id} className="group border border-stone-200 rounded-xl p-4 bg-white shadow-2xs [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between font-semibold text-stone-800 cursor-pointer">
                      <span className="pr-4">{item.question}</span>
                      <span className="transition group-open:rotate-180">
                        <Clock className="w-4 h-4 text-stone-400" />
                      </span>
                    </summary>
                    <p className="mt-3 text-stone-500 leading-relaxed font-light border-t border-stone-100 pt-3">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* --- 9. THE RSVP CARD BLOCK (SHARED & PERSISTED FOR BOTH SCROLLER AND VIDEO MODES) --- */}
      <section className={`bg-stone-100/50 border-t border-stone-200/50 ${s.spacingClass} px-6`} id="rsvp-card-block">
        <div className="max-w-md mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-stone-200/45 text-xs text-center space-y-6">
          <Heart className="w-10 h-10 text-amber-800 mx-auto animate-pulse" />
          
          <div className="space-y-1">
            <h3 className={`text-2xl ${s.headingFont} text-stone-900 font-medium`}>Confirmação de Presença (RSVP)</h3>
            <p className="text-[11px] text-stone-400">Insira o código individual do seu convite para confirmar seu assento reservado</p>
          </div>

          <AnimatePresence mode="wait">
            {!validatedGuest ? (
              /* Phase 1: Verify token code or Self-Register */
              <div className="space-y-4">
                {!showSelfRegisterForm ? (
                  <motion.form 
                    key="verify-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleVerifyToken} 
                    className="space-y-3"
                  >
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Nome completo ou código (ex: Pedro ou pedro-pureza-8170)"
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        className="w-full text-center tracking-wide px-4 py-3 border border-stone-200 bg-stone-50 rounded-lg text-xs font-bold uppercase placeholder:font-sans placeholder:font-normal focus:outline-amber-800"
                      />
                    </div>

                    {/* Guest suggestions when typing in scroller view */}
                    {tokenInput.trim().length >= 2 && (
                      <div className="space-y-1.5 text-left bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block">
                          Convidados Encontrados na Lista (clique para confirmar):
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {allGuests
                            .filter(g =>
                              g.name.toLowerCase().includes(tokenInput.toLowerCase()) ||
                              g.rsvpToken.toLowerCase().includes(tokenInput.toLowerCase())
                            )
                            .slice(0, 6)
                            .map(g => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => {
                                  setTokenInput(g.rsvpToken);
                                  setValidatedGuest(g);
                                  setRsvpStatus(g.status === 'Pending' ? 'Confirmed' : (g.status as 'Confirmed' | 'Declined'));
                                  setCompanionsCount(g.plusOnesConfirmed || 0);
                                  setDietaryInfo(g.dietaryRequirements || '');
                                  setGuestNotes(g.notes || '');
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <span>{g.name}</span>
                                <span className="text-[10px] text-amber-700 font-mono">({g.tableNumber})</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {errorMsg && (
                      <div className="flex items-center gap-1.5 p-2.5 bg-rose-50 border border-rose-100 text-rose-900 rounded-lg text-left text-[11px] font-medium leading-normal">
                        <AlertCircle className="w-4 h-4 text-rose-800 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Aceder ao Convite & Confirmar
                    </button>

                    <div className="pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSelfRegisterForm(true);
                          setSelfRegName(tokenInput);
                        }}
                        className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      >
                        Não encontrou seu nome na lista? Cadastrar Nova Confirmação de Reserva →
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  /* Self-registration form inside scroller block */
                  <form onSubmit={handleSelfRegisterSubmit} className="space-y-4 text-left p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <h4 className="font-serif font-bold text-stone-900 text-sm">Cadastrar Confirmação de Reserva</h4>
                      <button
                        type="button"
                        onClick={() => setShowSelfRegisterForm(false)}
                        className="text-stone-400 hover:text-stone-600 font-bold"
                      >
                        Voltar à busca
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-stone-600 font-semibold">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={selfRegName}
                        onChange={e => setSelfRegName(e.target.value)}
                        placeholder="Ex: Carlos Alberto Silva"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-rose-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-stone-600 font-semibold">Telefone / WhatsApp</label>
                        <input
                          type="tel"
                          value={selfRegPhone}
                          onChange={e => setSelfRegPhone(e.target.value)}
                          placeholder="+244 9..."
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-rose-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-stone-600 font-semibold">Família / Categoria</label>
                        <select
                          value={selfRegGroup}
                          onChange={e => setSelfRegGroup(e.target.value as GuestGroup)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-medium focus:outline-rose-800"
                        >
                          <option value="Friends">Amigos</option>
                          <option value="Bride Side">Família da Noiva</option>
                          <option value="Groom Side">Família do Noivo</option>
                          <option value="Family">Família</option>
                          <option value="VIP">Convidado VIP</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-stone-600 font-semibold">Confirmação de Presença</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelfRegStatus('Confirmed')}
                          className={`py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer text-center ${
                            selfRegStatus === 'Confirmed'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-stone-600 border-stone-200'
                          }`}
                        >
                          Sim, Comparecerei! ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelfRegStatus('Declined')}
                          className={`py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer text-center ${
                            selfRegStatus === 'Declined'
                              ? 'bg-stone-800 text-white border-stone-800'
                              : 'bg-white text-stone-600 border-stone-200'
                          }`}
                        >
                          Não poderei ir ✗
                        </button>
                      </div>
                    </div>

                    {selfRegStatus === 'Confirmed' && (
                      <>
                        <div className="space-y-1">
                          <label className="block text-stone-600 font-semibold">Acompanhantes com você</label>
                          <select
                            value={selfRegCompanions}
                            onChange={e => setSelfRegCompanions(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                          >
                            <option value={0}>Apenas eu (0 acompanhantes)</option>
                            <option value={1}>+1 Acompanhante</option>
                            <option value={2}>+2 Acompanhantes</option>
                            <option value={3}>+3 Acompanhantes</option>
                            <option value={4}>+4 Acompanhantes</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-stone-600 font-semibold">Restrições Alimentares / Alergias</label>
                          <input
                            type="text"
                            value={selfRegDietary}
                            onChange={e => setSelfRegDietary(e.target.value)}
                            placeholder="Ex: Vegetariano, Sem lactose..."
                            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="block text-stone-600 font-semibold">Mensagem aos Noivos (Opcional)</label>
                      <textarea
                        rows={2}
                        value={selfRegNotes}
                        onChange={e => setSelfRegNotes(e.target.value)}
                        placeholder="Deixe um recado afetuoso para os noivos..."
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-stone-900 hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all"
                    >
                      Confirmar Reserva & Emitir Bilhete VIP ✓
                    </button>
                  </form>
                )}
              </div>
            ) : rsvpCompleted ? (
              /* Phase 3: Confirmed screen / DIGITAL EVENT PASS QR-CODE (Etsy Reverse Engineered!) */
              <motion.div 
                key="confirmed"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-5 p-2 text-center"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-6 h-6" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-semibold text-stone-900 text-sm">Sucesso, {validatedGuest.name}!</h4>
                  <p className="text-stone-500 leading-relaxed text-[11px]">
                    Sua presença foi confirmada! Reservamos <strong className="text-stone-900">{1 + companionsCount} assento(s)</strong> para sua família na <strong className="text-stone-900 font-mono">{validatedGuest.tableNumber}</strong>.
                  </p>
                </div>

                {/* REVERSE ENGINEERED WALLET/GATE PASS QR-CODE */}
                <div className="border border-amber-200/50 rounded-xl bg-amber-50/20 p-4 space-y-3 max-w-xs mx-auto text-left relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl"></div>
                  
                  <div className="flex justify-between items-center border-b border-stone-200/50 pb-2">
                    <span className="font-bold text-[9px] tracking-widest text-amber-800 uppercase">PASSE DE ENTRADA DIGITAL</span>
                    <Sparkle className="w-3.5 h-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                    <div>
                      <span className="text-stone-400 block font-medium">CONVIDADO</span>
                      <strong className="text-stone-800 block truncate">{validatedGuest.name}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block font-medium">ASSENTOS</span>
                      <strong className="text-stone-800 block">{1 + companionsCount} confirmado(s)</strong>
                    </div>
                  </div>

                  {/* QR code image representing rsvp code */}
                  <div className="bg-white border border-stone-200 p-2 rounded-lg w-24 h-24 mx-auto flex items-center justify-center mt-2">
                    <img 
                      src={qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${validatedGuest.rsvpToken}`} 
                      alt="QR Concierge" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="text-[8px] text-stone-400 text-center font-mono uppercase tracking-wider pt-1 border-t border-dashed border-stone-200">
                    Apresente na portaria para check-in
                  </div>
                </div>

                <div className="text-[10px] text-stone-400 pt-1 leading-normal">
                  Sua resposta de confirmação de presença foi transmitida com sucesso para {config.brideGroom.groomName} & {config.brideGroom.brideName}.
                </div>
              </motion.div>
            ) : (
              /* Phase 2: Detailed RSVP choices Form */
              <motion.form 
                key="rsvp-submit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleRsvpSubmit} 
                className="space-y-4 text-left"
              >
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Nome no Convite</span>
                  <strong className="text-stone-800 text-xs block">{validatedGuest.name}</strong>
                  <span className="text-[10px] text-stone-500 font-mono">Grupo: {translateGroup(validatedGuest.group)} • {validatedGuest.tableNumber}</span>
                </div>

                {/* RSVP Status Selection */}
                <div className="grid grid-cols-2 gap-2 text-center font-semibold">
                  <button
                    type="button"
                    onClick={() => setRsvpStatus('Confirmed')}
                    className={`py-2 border rounded-lg transition-all cursor-pointer text-[11px] ${
                      rsvpStatus === 'Confirmed' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold' 
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    Sim, Comparecerei! ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpStatus('Declined')}
                    className={`py-2 border rounded-lg transition-all cursor-pointer text-[11px] ${
                      rsvpStatus === 'Declined' 
                        ? 'border-rose-400 bg-rose-50/20 text-rose-800 font-bold' 
                        : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    Não poderei ir ✗
                  </button>
                </div>

                {rsvpStatus === 'Confirmed' && (
                  <>
                    {/* Companions / plus-ones count */}
                    {validatedGuest.maxPlusOnes > 0 && (
                      <div className="space-y-1">
                        <label className="block text-stone-600 font-semibold text-[10px]">
                          Quantos acompanhantes da sua lista estão confirmados com você?
                        </label>
                        <select
                          value={companionsCount}
                          onChange={e => setCompanionsCount(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-stone-200 bg-white rounded-lg text-xs"
                        >
                          {Array.from({ length: validatedGuest.maxPlusOnes + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? 'Apenas eu (0 acompanhantes)' : `Com +${i} acompanhante${i > 1 ? 's' : ''}`}
                            </option>
                          ))}
                        </select>
                        <span className="text-[9px] text-stone-400 block">
                          * Este convite permite a confirmação de no máximo {validatedGuest.maxPlusOnes} acompanhantes adicionais.
                        </span>
                      </div>
                    )}

                    {/* Dietary */}
                    <div className="space-y-1">
                      <label className="block text-stone-600 font-semibold text-[10px]">
                        Alguma restrição alimentar grave, alergias ou preferência de cardápio?
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Vegetariano, intolerância a lactose"
                        value={dietaryInfo}
                        onChange={e => setDietaryInfo(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:outline-amber-800 bg-white"
                      />
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block text-stone-600 font-semibold text-[10px]">
                    Deixe um recado carinhoso para {config.brideGroom.groomName} & {config.brideGroom.brideName}:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Muito ansiosos para comemorar com vocês este dia tão especial!"
                    value={guestNotes}
                    onChange={e => setGuestNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:outline-amber-800 bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setValidatedGuest(null)}
                    className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg font-bold cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-opacity"
                    style={s.primaryBg}
                  >
                    Confirmar RSVP ✓
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="py-12 px-6 text-center border-t border-stone-200 text-xs text-stone-400 space-y-3 bg-white">
        <p className={`font-display tracking-widest text-xs uppercase text-amber-800 font-semibold`}>
          {config.brideGroom.groomName} & {config.brideGroom.brideName}
        </p>
        <p className="font-light text-stone-600 text-sm">
          {config.customFooter?.replace(/Sofia & Gabriel/g, `${config.brideGroom.groomName} & ${config.brideGroom.brideName}`).replace(/Sofia e Gabriel/g, `${config.brideGroom.groomName} & ${config.brideGroom.brideName}`) || `Com amor, sempre. — ${config.brideGroom.groomName} & ${config.brideGroom.brideName}`}
        </p>
        <div className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
          Plataforma Kutxi • Todos os direitos reservados 2026
        </div>
      </footer>

      {/* PDF PREVIEW MODAL */}
      <AnimatePresence>
        {showPdfModal && config.pdfUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200"
            >
              {/* Modal Header */}
              <div className="bg-stone-900 text-stone-100 px-5 py-3.5 flex items-center justify-between border-b border-stone-800 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h3 className="font-serif text-sm md:text-base font-light tracking-wide">
                    Convite Oficial • {config.brideGroom.groomName} & {config.brideGroom.brideName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={config.pdfUrl}
                    download={`Convite_${config.brideGroom.groomName}_e_${config.brideGroom.brideName}.pdf`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg text-[10px] md:text-xs font-bold transition-all"
                  >
                    Baixar PDF
                  </a>
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 bg-stone-100 p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <iframe
                  src={config.pdfUrl}
                  title="Visualização do Convite"
                  className="w-full h-full rounded-xl border border-stone-200 bg-white shadow-sm"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎁 INTERACTIVE GIFT CONTRIBUTION MODAL */}
      <AnimatePresence>
        {selectedGiftModal && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden my-6 flex flex-col max-h-[92vh]"
            >
              {/* Modal Top Bar */}
              <div className="bg-rose-950 text-white px-6 py-4 flex justify-between items-center border-b border-rose-900/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-rose-300" />
                  <span className="font-bold text-xs uppercase tracking-wider text-rose-200">
                    Presentear os Noivos
                  </span>
                </div>
                <button
                  onClick={() => setSelectedGiftModal(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-5 text-xs text-left overflow-y-auto flex-1">
                {/* Item Summary */}
                <div className="flex items-center gap-4 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <img 
                    src={selectedGiftModal.imageUrl} 
                    alt={selectedGiftModal.name} 
                    className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0 shadow-2xs"
                  />
                  <div className="min-w-0 flex-1">
                    {selectedGiftModal.category && (
                      <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                        {selectedGiftModal.category}
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-stone-900 truncate">{selectedGiftModal.name}</h3>
                    <div className="text-sm font-bold text-rose-900 mt-0.5 font-mono">
                      Valor Total: {selectedGiftModal.price.toLocaleString('pt-AO')} Kz
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  
                  {/* Donor Identity Section: Persistent if previously provided */}
                  {savedDonorProfile?.name && !isEditingDonorDetails ? (
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-rose-200 border-2 border-rose-400 text-rose-900 flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                          {giftDonorPhoto ? (
                            <img src={giftDonorPhoto} alt={giftDonorName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{giftDonorName?.charAt(0) || 'C'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800">Convidado Identificado</span>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          </div>
                          <h4 className="font-bold text-xs text-stone-900 truncate">{giftDonorName}</h4>
                          <p className="text-[10px] text-stone-500 truncate">Seus dados já estão salvos e vinculados aos presentes</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingDonorDetails(true)}
                        className="px-2.5 py-1.5 bg-white hover:bg-rose-100 text-rose-950 border border-rose-200 rounded-xl text-[10px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                      >
                        Alterar
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Photo of the Donor (Upload from device for Social Proof) */}
                      <div className="space-y-1.5 p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-stone-800 block text-xs">
                            Sua Foto (Aparecerá no grupo de quem presenteou)
                          </label>
                          <span className="text-[10px] text-rose-700 font-medium">Prova Social</span>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-rose-100 border-2 border-rose-300 text-rose-900 flex items-center justify-center shrink-0 shadow-2xs">
                            {giftDonorPhoto ? (
                              <img src={giftDonorPhoto} alt="Foto do convidado" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-5 h-5 text-rose-600" />
                            )}
                          </div>

                          <div className="flex-1 space-y-1">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100/70 border border-rose-200 text-rose-950 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs">
                              <Upload className="w-3.5 h-3.5 text-rose-700" />
                              <span>{giftDonorPhoto ? 'Trocar Minha Foto' : 'Carregar Foto do Dispositivo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const compressed = await compressAvatar(file);
                                    if (compressed) setGiftDonorPhoto(compressed);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            {giftDonorPhoto && (
                              <button
                                type="button"
                                onClick={() => setGiftDonorPhoto('')}
                                className="text-[10px] text-red-600 hover:underline block"
                              >
                                Remover foto
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Donor Name & Contact */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-stone-700 block text-xs">Seu Nome Completo *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Manuel dos Santos"
                            value={giftDonorName}
                            onChange={e => setGiftDonorName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-stone-700 block text-xs">Seu Telefone / WhatsApp</label>
                          <input
                            type="tel"
                            placeholder="+244 923 000 000"
                            value={giftDonorPhone}
                            onChange={e => setGiftDonorPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 font-medium shadow-2xs"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Contribution Amount Selection (Full item or Quota) */}
                  <div className="space-y-2">
                    <label className="font-bold text-stone-700 block text-xs">
                      Valor que Deseja Presentear (em AOA / Kwanzas)
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGiftContributionAmount(selectedGiftModal.price);
                          setGiftCustomAmount('');
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          giftContributionAmount === selectedGiftModal.price && !giftCustomAmount
                            ? 'border-rose-900 bg-rose-900 text-white font-bold shadow-2xs'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span className="text-[10px] block opacity-80">Valor Total</span>
                        <span className="text-xs font-bold font-mono">
                          {selectedGiftModal.price.toLocaleString('pt-AO')} Kz
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGiftContributionAmount(25000);
                          setGiftCustomAmount('');
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          giftContributionAmount === 25000 && !giftCustomAmount
                            ? 'border-rose-900 bg-rose-900 text-white font-bold shadow-2xs'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span className="text-[10px] block opacity-80">Cota Especial</span>
                        <span className="text-xs font-bold font-mono">25.000 Kz</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGiftContributionAmount(50000);
                          setGiftCustomAmount('');
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          giftContributionAmount === 50000 && !giftCustomAmount
                            ? 'border-rose-900 bg-rose-900 text-white font-bold shadow-2xs'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span className="text-[10px] block opacity-80">Cota Ouro</span>
                        <span className="text-xs font-bold font-mono">50.000 Kz</span>
                      </button>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="pt-1">
                      <input
                        type="number"
                        placeholder="Ou digite outro valor personalizado (ex: 15000)..."
                        value={giftCustomAmount}
                        onChange={e => {
                          setGiftCustomAmount(e.target.value);
                          setGiftContributionAmount(Number(e.target.value) || 0);
                        }}
                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 font-medium font-mono"
                      />
                    </div>
                  </div>

                  {/* Loving Message */}
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block text-xs">Mensagem Carinhosa aos Noivos</label>
                    <textarea
                      rows={2}
                      placeholder="Deixe seus votos de felicidades para o casal..."
                      value={giftDonorMessage}
                      onChange={e => setGiftDonorMessage(e.target.value)}
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-rose-800 font-medium resize-none shadow-2xs"
                    />
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-2 pt-1">
                    <label className="font-bold text-stone-700 block text-xs">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGiftPaymentMethod('multicaixa')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          giftPaymentMethod === 'multicaixa' 
                            ? 'border-rose-900 bg-rose-50/60 text-rose-950 font-bold shadow-xs ring-1 ring-rose-800/30' 
                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-rose-800" />
                          <span className="text-xs">Multicaixa Express</span>
                        </div>
                        <span className="text-[10px] text-stone-500 block mt-1 font-mono truncate">
                          {config.giftRegistry.multicaixaPhone || '+244 923 456 789'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGiftPaymentMethod('iban')}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          giftPaymentMethod === 'iban' 
                            ? 'border-rose-900 bg-rose-50/60 text-rose-950 font-bold shadow-xs ring-1 ring-rose-800/30' 
                            : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-rose-800" />
                          <span className="text-xs">Transferência IBAN</span>
                        </div>
                        <span className="text-[10px] text-stone-500 block mt-1 truncate">
                          {config.giftRegistry.bankName || 'Banco BAI / BFA'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* MULTICAIXA EXPRESS DIRECT INTENT & PAYMENT DETAILS */}
                  {giftPaymentMethod === 'multicaixa' ? (
                    <div className="p-4 bg-gradient-to-br from-rose-950 to-stone-900 text-white rounded-2xl space-y-3 shadow-md border border-rose-900/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-rose-500/30 flex items-center justify-center text-rose-300">
                            <Smartphone className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-rose-200">Ação Rápida Multicaixa Express</span>
                        </div>
                        <span className="text-[10px] text-stone-300 font-mono">EMIS Angola</span>
                      </div>

                      {/* Primary Deep Link Trigger */}
                      <button
                        type="button"
                        onClick={handleOpenMulticaixaApp}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Abrir Aplicativo Multicaixa Express</span>
                        <ExternalLink className="w-3.5 h-3.5 text-rose-200 ml-1" />
                      </button>

                      {/* Quick 1-Click Copy Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(config.giftRegistry.multicaixaPhone || '+244923456789');
                            setShowPhoneCopied(true);
                            setTimeout(() => setShowPhoneCopied(false), 2000);
                          }}
                          className="flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-medium transition-colors cursor-pointer border border-white/10"
                        >
                          <span className="truncate mr-1">Telefone: {config.giftRegistry.multicaixaPhone || '+244 923...'}</span>
                          {showPhoneCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-rose-300 shrink-0" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const val = giftContributionAmount > 0 ? giftContributionAmount : selectedGiftModal.price;
                            navigator.clipboard.writeText(val.toString());
                            setShowAmountCopied(true);
                            setTimeout(() => setShowAmountCopied(false), 2000);
                          }}
                          className="flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-medium transition-colors cursor-pointer border border-white/10"
                        >
                          <span className="truncate mr-1">Valor: {(giftContributionAmount > 0 ? giftContributionAmount : selectedGiftModal.price).toLocaleString('pt-AO')} Kz</span>
                          {showAmountCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-rose-300 shrink-0" />}
                        </button>
                      </div>

                      {/* WhatsApp Direct Proof Dispatcher */}
                      <a
                        href={`https://api.whatsapp.com/send?phone=${(config.giftRegistry.multicaixaPhone || '244923456789').replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
                          `Olá ${config.brideGroom?.groomName || 'Gabriel'} & ${config.brideGroom?.brideName || 'Sofia'}! 🎁 Acabei de enviar um presente de casamento: *${selectedGiftModal.name}* no valor de *${(giftContributionAmount > 0 ? giftContributionAmount : selectedGiftModal.price).toLocaleString('pt-AO')} Kz* via Multicaixa Express!\n\n${giftDonorMessage ? `Mensagem: "${giftDonorMessage}"\n\n` : ''}Com muito carinho, ${giftDonorName || 'Convidado'}!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Validar & Enviar Comprovativo no WhatsApp</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-2 border border-stone-800">
                      <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                        Coordenadas Bancárias ({config.giftRegistry.bankName || 'Banco BAI / BFA'})
                      </div>
                      <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl font-mono text-xs text-white">
                        <span className="truncate mr-2 text-[11px]">{config.giftRegistry.bankAccount || 'AO06 0040 0000 1234 5678 9012 3'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(config.giftRegistry.bankAccount || '');
                            setShowIbanCopied(true);
                            setTimeout(() => setShowIbanCopied(false), 2000);
                          }}
                          className="p-1 hover:bg-white/20 rounded-md text-amber-300 shrink-0 cursor-pointer"
                        >
                          {showIbanCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-stone-400">
                        Titular: {config.giftRegistry.accountHolder || `${config.brideGroom.groomName} & ${config.brideGroom.brideName}`}
                      </div>
                    </div>
                  )}

                  {/* Proof Attachment (Optional) */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-stone-600 font-medium block">
                      Anexar Print do Comprovativo (Opcional)
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-[11px] font-medium cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      <span>{giftProofPhoto ? 'Comprovativo Anexado ✓' : 'Carregar Comprovativo do Telemóvel'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, base64 => setGiftProofPhoto(base64));
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedGiftModal(null)}
                  className="px-4 py-2.5 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGiftContribution}
                  className="px-5 py-2.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar & Presentear</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👥 SOCIAL PROOF MODAL: VIEW WHO ALREADY GIFTED */}
      <AnimatePresence>
        {selectedGiftSubscribersModal && (
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden my-6 flex flex-col max-h-[85vh]"
            >
              {/* Top Bar */}
              <div className="bg-rose-950 text-white px-6 py-4 flex justify-between items-center border-b border-rose-900/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-300" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-rose-200">
                    Quem Já Presenteou
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedGiftSubscribersModal(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Item Info Banner */}
              <div className="p-4 bg-stone-50 border-b border-stone-200/80 flex items-center gap-3">
                <img 
                  src={selectedGiftSubscribersModal.imageUrl} 
                  alt={selectedGiftSubscribersModal.name} 
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0" 
                />
                <div className="min-w-0 flex-1 text-left">
                  <h4 className="font-bold text-xs text-stone-900 truncate">{selectedGiftSubscribersModal.name}</h4>
                  <span className="text-[11px] font-bold text-rose-900 font-mono">
                    Total: {selectedGiftSubscribersModal.price.toLocaleString('pt-AO')} Kz
                  </span>
                </div>
              </div>

              {/* Contributors List */}
              <div className="p-5 space-y-3 overflow-y-auto flex-1 text-left text-xs">
                {(selectedGiftSubscribersModal.contributors || []).length > 0 ? (
                  (selectedGiftSubscribersModal.contributors || []).map((contrib, idx) => (
                    <div 
                      key={contrib.id || idx}
                      className="p-3.5 bg-stone-50 border border-stone-200/70 rounded-2xl space-y-2 hover:border-rose-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-rose-200 text-rose-900 font-bold text-xs flex items-center justify-center border border-rose-300 shrink-0">
                            {contrib.avatarUrl ? (
                              <img src={contrib.avatarUrl} alt={contrib.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{contrib.name?.charAt(0) || 'C'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 text-xs">{contrib.name}</div>
                            <span className="text-[10px] text-stone-400">{contrib.date}</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold font-mono text-[10px] rounded-lg">
                          + {contrib.amount.toLocaleString('pt-AO')} Kz
                        </span>
                      </div>

                      {contrib.message && (
                        <p className="text-[11px] text-stone-600 bg-white p-2.5 rounded-xl border border-stone-100 italic leading-relaxed">
                          "{contrib.message}"
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-stone-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs">Nenhum presente registrado ainda.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const item = selectedGiftSubscribersModal;
                    setSelectedGiftSubscribersModal(null);
                    setSelectedGiftModal(item);
                  }}
                  className="px-4 py-2 bg-rose-900 hover:bg-rose-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Também Quero Presentear</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎊 GIFT CONFIRMATION SUCCESS NOTIFICATION */}
      <AnimatePresence>
        {giftSuccessPopup && (
          <div className="fixed bottom-6 right-6 z-[99999] max-w-sm w-full p-4 bg-emerald-950 text-white rounded-2xl shadow-2xl border border-emerald-600 flex items-start gap-3 animate-bounce">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-500 text-white flex items-center justify-center shrink-0 border border-emerald-400">
              {giftSuccessPopup.photo ? (
                <img src={giftSuccessPopup.photo} alt={giftSuccessPopup.name} className="w-full h-full object-cover" />
              ) : (
                <Check className="w-5 h-5 stroke-[3]" />
              )}
            </div>
            <div className="space-y-1 flex-1 text-xs">
              <h4 className="font-bold text-sm text-emerald-200">Muito Obrigado! 🎉</h4>
              <p className="text-emerald-100 leading-relaxed">
                <strong>{giftSuccessPopup.name}</strong>, sua contribuição de {giftSuccessPopup.amount ? `${giftSuccessPopup.amount.toLocaleString('pt-AO')} Kz` : ''} para <strong>{giftSuccessPopup.item}</strong> foi registrada e sua foto já aparece no convite oficial dos noivos!
              </p>
            </div>
            <button
              onClick={() => setGiftSuccessPopup(null)}
              className="text-emerald-300 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* 🎟️ RSVP CONFIRMATION VOUCHER / BILHETE DE EMBARQUE VIP MODAL */}
      <AnimatePresence>
        {showVoucherModal && validatedGuest && (
          <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden my-6 flex flex-col"
            >
              {/* Modal Top Bar */}
              <div className="bg-stone-950 text-white px-6 py-4 flex justify-between items-center border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    Comprovativo Oficial de Confirmação
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Imprimir ou Salvar em PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                  <button
                    onClick={() => setShowVoucherModal(false)}
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Printable Ticket Area */}
              <div className="p-6 sm:p-8 space-y-6 text-left bg-gradient-to-b from-stone-50 via-white to-stone-50" id="printable-rsvp-voucher">
                
                {/* Couple Brand Header */}
                <div className="text-center space-y-1 pb-4 border-b border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Casamento Oficial</span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-normal">
                    {config.brideGroom.groomName} & {config.brideGroom.brideName}
                  </h2>
                  <p className="text-xs text-stone-500 font-medium">
                    {new Date(config.date).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })} às {new Date(config.date).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}h
                  </p>
                </div>

                {/* VIP Pass Card */}
                <div className="bg-stone-900 text-white p-5 rounded-2xl border border-stone-800 space-y-4 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block">Titular do Passe</span>
                      <strong className="text-lg font-bold text-white block mt-0.5">{validatedGuest.name}</strong>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                      ✓ CONFIRMADO
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-800 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Mesa / Assento:</span>
                      <strong className="text-white font-mono">{validatedGuest.tableNumber || 'Mesa Designada'}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Acompanhantes:</span>
                      <strong className="text-white">+{validatedGuest.plusOnesConfirmed ?? 0} autorizado(s)</strong>
                    </div>
                  </div>
                </div>

                {/* Venue & QR Code grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Local da Cerimónia</span>
                      <strong className="text-stone-900 block mt-0.5">{config.venue.ceremonyName}</strong>
                      <p className="text-stone-500 text-[11px] mt-0.5">{config.venue.ceremonyAddress}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Token de Validação Portaria</span>
                      <span className="font-mono text-xs text-rose-800 font-bold tracking-wider">{validatedGuest.rsvpToken}</span>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-2">
                    <img 
                      src={qrCodeDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=rsvp:${validatedGuest.rsvpToken}`}
                      alt="QR Code de Validação"
                      className="w-32 h-32 mx-auto object-contain rounded-lg border border-stone-100 p-1"
                    />
                    <span className="text-[9px] text-stone-400 font-mono block">Apresente este QR Code na portaria</span>
                  </div>
                </div>

                {/* Authenticity seal footer */}
                <div className="pt-4 border-t border-stone-200 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-stone-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Autenticado digitalmente por Kutxi Plataforma de Casamentos</span>
                  </div>
                  <p className="text-[9px] text-stone-400">
                    Documento emitido eletronicamente. Não é necessária assinatura manuscrita.
                  </p>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex justify-end gap-2">
                <button
                  onClick={() => setShowVoucherModal(false)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Comprovativo</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RSVP NATIVE TOAST FEEDBACK */}
      <AnimatePresence>
        {rsvpToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-[999999] max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              rsvpToast.type === 'error'
                ? 'bg-rose-950/95 border-rose-700 text-white'
                : rsvpToast.type === 'info'
                ? 'bg-stone-900/95 border-stone-700 text-white'
                : 'bg-emerald-950/95 border-emerald-600 text-white'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              rsvpToast.type === 'error' ? 'bg-rose-800 text-white' :
              rsvpToast.type === 'info' ? 'bg-stone-800 text-white' :
              'bg-emerald-800 text-white'
            }`}>
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1 text-xs font-medium leading-relaxed">
              {rsvpToast.message}
            </div>
            <button
              onClick={() => setRsvpToast(null)}
              className="text-stone-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
