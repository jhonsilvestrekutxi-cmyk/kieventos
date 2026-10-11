import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Users, QrCode, Sliders, Shield, CreditCard, 
  Sparkles, Check, ArrowRight, BookOpen, Music, 
  Laptop, ShieldAlert, LogIn, LogOut, CheckCircle2, ChevronRight, Menu, X, UserCheck, Gift, Lock,
  Database
} from 'lucide-react';

// Types and defaultConfig
import { Guest, WeddingConfig, ClientWeddingSaaS, SystemAuditLog } from './types';
import { 
  INITIAL_WEDDING_CONFIG, INITIAL_GUESTS, 
  INITIAL_CLIENTS, INITIAL_AUDIT_LOGS 
} from './data/defaultConfig';

// Dashboard & Visual modules
import SaaSOverview from './components/SaaSOverview';
import VisualEditor from './components/VisualEditor';
import GuestManager from './components/GuestManager';
import GiftRegistry from './components/GiftRegistry';
import QRCheckIn from './components/QRCheckIn';
import SharedAlbumManager from './components/SharedAlbumManager';
import SuperAdmin from './components/SuperAdmin';
import PublicInvite from './components/PublicInvite';
import GatekeeperPortal from './components/GatekeeperPortal';
import Login from './components/Login';
import AuthModal from './components/AuthModal';
import SupabaseModal from './components/SupabaseModal';
import { safeSetItem, safeGetItem, sanitizeClientsList, freeUpLocalStorageSpace } from './utils/storage';
import { isSupabaseConfigured } from './services/supabase';
import { dbService } from './services/dbService';

// Run cleanup immediately on script execution to ensure any existing bloated quota is freed
freeUpLocalStorageSpace();

type AppPersona = 'saas-landing' | 'super-admin' | 'client-dashboard' | 'public-invite' | 'gatekeeper-portal';
type ClientTab = 'overview' | 'editor' | 'guests' | 'gifts' | 'album' | 'checkin';

export default function App() {
  // --- STATE PERSISTENCE IN LOCAL STORAGE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('kutxi_is_authenticated') || localStorage.getItem('vowsflow_is_authenticated');
    return saved === 'true';
  });
  const [isPortariaLocked, setIsPortariaLocked] = useState(false);
  const [isInviteLocked, setIsInviteLocked] = useState(false);

  const [persona, setPersona] = useState<AppPersona>(() => new URLSearchParams(window.location.search).get('view') === 'invite' ? 'public-invite' : 'saas-landing');
  const [clientTab, setClientTab] = useState<ClientTab>('overview');
  const [urlGuestToken, setUrlGuestToken] = useState('');

  // Active Tenant ID and dynamic user accounts
  const [activeClientId, setActiveClientId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlClientId = params.get('clientId');
    if (urlClientId) return urlClientId;
    const portaria = params.get('portaria');
    if (portaria && portaria !== 'true') return portaria;
    
    // Proactively look for invite token matching across all storage partitions
    const invite = params.get('invite');
    if (invite) {
      try {
        const normToken = (invite || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const allKeys = Object.keys(localStorage);
        const guestKeys = allKeys.filter(k => k.startsWith('kutxi_guests_') || k.startsWith('vowsflow_guests_') || k === 'kutxi_guests' || k === 'vowsflow_guests');
        for (const k of guestKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((g: any) => {
                  const gt = (g.rsvpToken || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                  const gn = (g.name || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                  return gt === normToken || gn === normToken || gt.includes(normToken) || normToken.includes(gt);
                });
                if (found) {
                  const cid = k.includes('_guests_') ? k.split('_guests_')[1] : 'client_1';
                  safeSetItem('kutxi_active_client_id', cid);
                  return cid;
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
    
    return localStorage.getItem('kutxi_active_client_id') || localStorage.getItem('vowsflow_active_client_id') || 'client_1';
  });

  const isInitialMount = useRef(true);

  const [activeUser, setActiveUser] = useState<string>(() => {
    return localStorage.getItem('kutxi_active_user') || localStorage.getItem('vowsflow_active_user') || 'admin';
  });

  const [userAccounts, setUserAccounts] = useState<{ username: string; pass: string; clientId: string; clientName: string }[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_user_accounts') || localStorage.getItem('vowsflow_user_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse user accounts:", e);
    }
    return [
      { username: 'admin', pass: '0315', clientId: 'client_1', clientName: 'João & Alice' }
    ];
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  
  const [weddingConfig, setWeddingConfig] = useState<WeddingConfig>(() => {
    try {
      const cid = (new URLSearchParams(window.location.search).get('clientId')) || 
                  localStorage.getItem('kutxi_active_client_id') || 'client_1';
      const directSaved = localStorage.getItem(`kutxi_wedding_config_${cid}`) || 
                          (cid === 'client_1' ? localStorage.getItem('kutxi_wedding_config') : null);
      if (directSaved) return JSON.parse(directSaved);
      const savedClients = localStorage.getItem('kutxi_clients');
      if (savedClients) {
        const list = JSON.parse(savedClients);
        const match = list.find((c: any) => c.id === cid || c.config?.id === cid);
        if (match?.config) return match.config;
      }
    } catch (e) {}
    return INITIAL_WEDDING_CONFIG;
  });

  const [guests, setGuests] = useState<Guest[]>(() => {
    try {
      const cid = (new URLSearchParams(window.location.search).get('clientId')) || 
                  localStorage.getItem('kutxi_active_client_id') || 'client_1';
      const saved = localStorage.getItem(`kutxi_guests_${cid}`) || 
                    (cid === 'client_1' ? localStorage.getItem('kutxi_guests') : null);
      if (saved) return JSON.parse(saved);
      if (cid === 'client_1') return INITIAL_GUESTS;
    } catch (e) {}
    return [];
  });

  const [clients, setClients] = useState<ClientWeddingSaaS[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_clients') || localStorage.getItem('vowsflow_clients');
      return saved ? sanitizeClientsList(JSON.parse(saved)) : INITIAL_CLIENTS;
    } catch (e) {
      return INITIAL_CLIENTS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('kutxi_audit_logs') || localStorage.getItem('vowsflow_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch (e) {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Removed restrictive redirect so administrators and couples can freely access Painel dos Noivos

  // Save changes to LocalStorage on updates
  useEffect(() => {
    safeSetItem('kutxi_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  useEffect(() => {
    safeSetItem('kutxi_active_client_id', activeClientId);
  }, [activeClientId]);

  useEffect(() => {
    safeSetItem('kutxi_active_user', activeUser);
  }, [activeUser]);

  // Robust token comparison helper to completely eliminate typos or mismatch issues
  const normalizeToken = (t: string) => {
    return (t || '')
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ""); // remove dashes, spaces, punctuation
  };

  // Synchronize dynamic client config and guest list when activeClientId changes
  useEffect(() => {
    const savedClients = localStorage.getItem('kutxi_clients') || localStorage.getItem('vowsflow_clients');
    const clientsList: ClientWeddingSaaS[] = savedClients ? JSON.parse(savedClients) : INITIAL_CLIENTS;
    
    // Allow lookup by SaaS client ID or Wedding Config ID
    const currentClient = clientsList.find(c => c.id === activeClientId || c.config?.id === activeClientId);
    
    let resolvedClientId = activeClientId;
    if (currentClient && currentClient.id !== activeClientId) {
      resolvedClientId = currentClient.id;
    }

    // Always prioritize the most recent config saved by the couple
    let resolvedConfig: WeddingConfig | null = null;
    const directSaved = localStorage.getItem(`kutxi_wedding_config_${resolvedClientId}`) || localStorage.getItem(`vowsflow_wedding_config_${resolvedClientId}`);
    if (directSaved) {
      try { resolvedConfig = JSON.parse(directSaved); } catch (e) {}
    }
    if (!resolvedConfig && currentClient?.config) {
      resolvedConfig = currentClient.config;
    } else if (!resolvedConfig && resolvedClientId === 'client_1') {
      const savedConfig = localStorage.getItem('kutxi_wedding_config_client_1') || localStorage.getItem('kutxi_wedding_config');
      resolvedConfig = savedConfig ? JSON.parse(savedConfig) : INITIAL_WEDDING_CONFIG;
    }

    if (resolvedConfig) {
      setWeddingConfig(resolvedConfig);
      safeSetItem('kutxi_wedding_config', JSON.stringify(resolvedConfig));
    }

    const savedGuests = localStorage.getItem(`kutxi_guests_${resolvedClientId}`) || localStorage.getItem(`vowsflow_guests_${resolvedClientId}`);
    if (savedGuests) {
      setGuests(JSON.parse(savedGuests));
    } else if (resolvedClientId === 'client_1') {
      const savedConfigGuests = localStorage.getItem('kutxi_guests_client_1') || localStorage.getItem('kutxi_guests');
      setGuests(savedConfigGuests ? JSON.parse(savedConfigGuests) : INITIAL_GUESTS);
    } else {
      // Clean default demo guests list for newly created clients (as requested, all info is reset)
      setGuests([]);
    }
  }, [activeClientId]);

  // Auto save weddingConfig inside dynamic client's state and localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (activeClientId) {
      safeSetItem(`kutxi_wedding_config_${activeClientId}`, JSON.stringify(weddingConfig));
      safeSetItem('kutxi_wedding_config', JSON.stringify(weddingConfig));
      // Instantly synchronize with clients state as requested to prevent stale dashboard loads
      setClients(prev => {
        const updated = prev.map(c => {
          if (c.id === activeClientId || c.config?.id === activeClientId) {
            return {
              ...c,
              clientName: `${weddingConfig.brideGroom?.groomName || 'Noivo'} & ${weddingConfig.brideGroom?.brideName || 'Noiva'}`,
              weddingDate: weddingConfig.date ? weddingConfig.date.split('T')[0] : c.weddingDate,
              config: weddingConfig
            };
          }
          return c;
        });
        safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(updated)));
        return updated;
      });
    }
  }, [weddingConfig, activeClientId]);

  // Save guests when guests state changes under their respective client ID
  useEffect(() => {
    if (isInitialMount.current) return;
    if (activeClientId) {
      safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(guests));
      if (activeClientId === 'client_1') {
        safeSetItem('kutxi_guests', JSON.stringify(guests));
      }
    }
  }, [guests, activeClientId]);

  useEffect(() => {
    safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(clients)));
  }, [clients]);

  useEffect(() => {
    safeSetItem('kutxi_audit_logs', JSON.stringify(auditLogs.slice(0, 20)));
  }, [auditLogs]);

  // Track page views simulation
  useEffect(() => {
    if (persona === 'public-invite') {
      // Simulate incrementing view count for guest of Sofia & Gabriel
      setGuests(prev => prev.map(g => {
        if (g.rsvpToken === 'eleanor-m-tahoe') {
          return { ...g, invitationViews: g.invitationViews + 1, lastViewedAt: new Date().toISOString() };
        }
        return g;
      }));
    }
  }, [persona]);

  // URL routing parse logic on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portaria = params.get('portaria');
    const invite = params.get('invite');
    let urlClientId = params.get('clientId');

    // Robust proactive search for client ID from invite token
    if (invite) {
      try {
        const normToken = (invite || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const allKeys = Object.keys(localStorage);
        const guestKeys = allKeys.filter(k => k.startsWith('kutxi_guests_') || k.startsWith('vowsflow_guests_') || k === 'kutxi_guests' || k === 'vowsflow_guests');
        for (const k of guestKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((g: any) => {
                  const gt = (g.rsvpToken || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                  const gn = (g.name || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                  return gt === normToken || gn === normToken || gt.includes(normToken) || normToken.includes(gt);
                });
                if (found) {
                  const cid = k.includes('_guests_') ? k.split('_guests_')[1] : 'client_1';
                  urlClientId = cid;
                  break;
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.warn("Failed to lookup client via invite token:", e);
      }
    }

    if (portaria && portaria !== 'true') {
      urlClientId = portaria;
    }

    if (urlClientId) {
      try {
        const savedClients = localStorage.getItem('kutxi_clients') || localStorage.getItem('vowsflow_clients');
        const clientsList = savedClients ? JSON.parse(savedClients) : [];
        if (Array.isArray(clientsList)) {
          const found = clientsList.find(c => c.id === urlClientId || c.config?.id === urlClientId);
          if (found) {
            urlClientId = found.id;
          }
        }
      } catch (err) {}
      safeSetItem('kutxi_active_client_id', urlClientId);
      setActiveClientId(urlClientId);
    }

    if (portaria) {
      setPersona('gatekeeper-portal');
      setIsPortariaLocked(true);
      addAuditLog('Portaria', 'Acesso via Link Direto', `Portaria do casamento acessada usando link seguro de convidado para o cliente ${urlClientId || 'padrão'}.`);
    } else if (invite) {
      setPersona('public-invite');
      setIsInviteLocked(true);
      setUrlGuestToken(invite);
      addAuditLog('Convidado', 'Acesso via Token Único', `Site público de convite acessado usando o token: ${invite}`);
    }
  }, []);

  // --- LOG WRITER UTILITY ---
  const addAuditLog = (actor: string, action: string, details: string) => {
    const newLog: SystemAuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
      ip: '192.168.1.' + Math.floor(Math.random() * 255)
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // --- HANDLERS ---
  const handleUpdateWeddingConfig = (updated: WeddingConfig) => {
    setWeddingConfig(updated);
    if (activeClientId) {
      safeSetItem(`kutxi_wedding_config_${activeClientId}`, JSON.stringify(updated));
      safeSetItem('kutxi_wedding_config', JSON.stringify(updated));
      dbService.weddingConfig.save(activeClientId, updated).catch(() => {});

      // Immediately synchronize with clients state
      setClients(prev => {
        const next = prev.map(c => {
          if (c.id === activeClientId || c.config?.id === activeClientId || (activeClientId === 'client_1' && c.id === 'client_1')) {
            return {
              ...c,
              clientName: `${updated.brideGroom?.groomName || 'Noivo'} & ${updated.brideGroom?.brideName || 'Noiva'}`,
              weddingDate: updated.date ? updated.date.split('T')[0] : c.weddingDate,
              config: updated
            };
          }
          return c;
        });
        safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(next)));
        return next;
      });

      // Synchronize user accounts display name
      setUserAccounts(prev => {
        const next = prev.map(acc => {
          if (acc.clientId === activeClientId) {
            return {
              ...acc,
              clientName: `${updated.brideGroom?.groomName || 'Noivo'} & ${updated.brideGroom?.brideName || 'Noiva'}`
            };
          }
          return acc;
        });
        safeSetItem('kutxi_user_accounts', JSON.stringify(next));
        return next;
      });

      // Broadcast update across the whole site for guests and previews
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kutxi_wedding_config_changed', {
          detail: { clientId: activeClientId, config: updated }
        }));
      }
    }
    addAuditLog(`${updated.brideGroom?.groomName || 'Gabriel'} & ${updated.brideGroom?.brideName || 'Sofia'}`, 'Site de Casamento Atualizado', 'Variáveis de estilo visual e seções salvas no criador de páginas em tempo real.');
  };

  const handleFirstLoginSubmit = (groom: string, bride: string, date: string) => {
    const updatedConfig: WeddingConfig = {
      ...weddingConfig,
      isFirstLogin: false,
      date: date + 'T16:00:00',
      brideGroom: {
        ...weddingConfig.brideGroom,
        groomName: groom,
        groomFullName: `${groom} Pureza dos Santos`,
        brideName: bride,
        brideFullName: `${bride} Kiala de Oliveira`,
      },
      customFooter: `Com amor, sempre. — ${groom} & ${bride}`
    };
    
    handleUpdateWeddingConfig(updatedConfig);
    addAuditLog(`${groom} & ${bride}`, 'Configuração Inicial Concluída', `Nomes dos noivos e data do casamento salvos com sucesso.`);
  };

  const handleAddGuest = (guest: Guest) => {
    setGuests(prev => {
      const next = [guest, ...prev];
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    addAuditLog(`${weddingConfig.brideGroom?.groomName || 'Gabriel'} & ${weddingConfig.brideGroom?.brideName || 'Sofia'}`, 'Convidado Criado', `Convidado "${guest.name}" adicionado manualmente à lista.`);
  };

  const handleUpdateGuest = (updated: Guest) => {
    setGuests(prev => {
      const next = prev.map(g => g.id === updated.id ? updated : g);
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    addAuditLog(`${weddingConfig.brideGroom?.groomName || 'Gabriel'} & ${weddingConfig.brideGroom?.brideName || 'Sofia'}`, 'Convidado Atualizado', `Parâmetros e contatos do convidado "${updated.name}" modificados.`);
  };

  const handleDeleteGuest = (id: string) => {
    const guest = guests.find(g => g.id === id);
    setGuests(prev => {
      const next = prev.filter(g => g.id !== id);
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    if (guest) {
      addAuditLog(`${weddingConfig.brideGroom?.groomName || 'Gabriel'} & ${weddingConfig.brideGroom?.brideName || 'Sofia'}`, 'Convidado Excluído', `Convidado "${guest.name}" removido da mesa e do painel.`);
    }
  };

  const handleBulkStatusUpdate = (ids: string[], status: 'Confirmed' | 'Pending' | 'Declined') => {
    const pStatus = status === 'Confirmed' ? 'Confirmado' : status === 'Declined' ? 'Recusado' : 'Pendente';
    setGuests(prev => {
      const next = prev.map(g => ids.includes(g.id) ? { ...g, status, confirmedAt: status === 'Confirmed' ? new Date().toISOString() : undefined } : g);
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(next));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(next));
        }
      }
      return next;
    });
    addAuditLog(`${weddingConfig.brideGroom?.groomName || 'Gabriel'} & ${weddingConfig.brideGroom?.brideName || 'Sofia'}`, 'Atualização de Status em Lote', `Atualizado status de RSVP de ${ids.length} convidados para "${pStatus}".`);
  };

  const handleDoorCheckIn = (guestId: string, plusOnesCount: number) => {
    setGuests(prev => prev.map(g => g.id === guestId ? {
      ...g,
      checkedIn: true,
      plusOnesConfirmed: plusOnesCount,
      checkedInAt: new Date().toISOString()
    } : g));
    
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      addAuditLog('Scanner de Portaria', 'Check-In Efetuado', `Convidado "${guest.name}" realizou check-in na portaria. Grupo: 1 + ${plusOnesCount} acompanhantes.`);
    }
  };

  const handleAddClient = (client: ClientWeddingSaaS, accountsToAdd?: { username: string; pass: string }[]) => {
    setClients(prev => [...prev, client]);
    
    if (accountsToAdd && accountsToAdd.length > 0) {
      setUserAccounts(prev => [
        ...prev,
        ...accountsToAdd.map(acc => ({
          username: acc.username,
          pass: acc.pass,
          clientId: client.id,
          clientName: client.clientName
        }))
      ]);
    } else {
      const cleanName = client.clientName.toLowerCase().replace(/\s+/g, '');
      setUserAccounts(prev => [
        ...prev,
        {
          username: `noiva.${cleanName}`,
          pass: `vows.123`,
          clientId: client.id,
          clientName: client.clientName
        }
      ]);
    }
    
    addAuditLog('Super Admin', 'Inquilino Ativado', `Nova assinatura SaaS iniciada para "${client.clientName}" no plano ${client.plan}.`);
  };

  const handleUpdateClient = (updated: ClientWeddingSaaS, updatedAccounts?: { username: string; pass: string }[]) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    
    if (updated.config) {
      safeSetItem(`kutxi_wedding_config_${updated.id}`, JSON.stringify(updated.config));
      dbService.weddingConfig.save(updated.id, updated.config).catch(() => {});
      if (activeClientId === updated.id || (activeClientId === 'client_1' && updated.id === 'client_1')) {
        setWeddingConfig(updated.config);
        safeSetItem('kutxi_wedding_config', JSON.stringify(updated.config));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kutxi_wedding_config_changed', {
          detail: { clientId: updated.id, config: updated.config }
        }));
      }
    }
    
    if (updatedAccounts && updatedAccounts.length > 0) {
      setUserAccounts(prev => {
        const filtered = prev.filter(acc => acc.clientId !== updated.id);
        return [
          ...filtered,
          ...updatedAccounts.map(acc => ({
            username: acc.username,
            pass: acc.pass,
            clientId: updated.id,
            clientName: updated.clientName
          }))
        ];
      });
    } else {
      setUserAccounts(prev => prev.map(acc => 
        acc.clientId === updated.id 
          ? { ...acc, clientName: updated.clientName } 
          : acc
      ));
    }
    
    addAuditLog('Super Admin', 'Inquilino Atualizado', `Inquilino "${updated.clientName}" atualizado no plano ${updated.plan}.`);
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    setClients(prev => prev.filter(c => c.id !== clientId));
    setUserAccounts(prev => prev.filter(acc => acc.clientId !== clientId));
    
    addAuditLog('Super Admin', 'Inquilino Excluído', `Assinatura e contas de acesso de "${client.clientName}" foram excluídas permanentemente.`);
  };

  const handleGuestRsvpFromInvite = (
    token: string, 
    status: 'Confirmed' | 'Declined', 
    companions: number, 
    dietary: string, 
    notes: string,
    extraGuest?: Partial<Guest>
  ) => {
    let targetGuestName = extraGuest?.name || token;
    let nextGuests: Guest[] = [];

    setGuests(prev => {
      const existingIndex = prev.findIndex(g => 
        normalizeToken(g.rsvpToken) === normalizeToken(token) ||
        (extraGuest?.name && normalizeToken(g.name) === normalizeToken(extraGuest.name))
      );

      if (existingIndex >= 0) {
        nextGuests = prev.map((g, idx) => {
          if (idx === existingIndex) {
            targetGuestName = g.name;
            return {
              ...g,
              status,
              plusOnesConfirmed: companions,
              dietaryRequirements: dietary || g.dietaryRequirements,
              notes: notes || g.notes,
              confirmedAt: new Date().toISOString()
            };
          }
          return g;
        });
      } else {
        // Create new guest registration automatically
        const newGuestObj: Guest = {
          id: 'guest_' + Date.now(),
          name: extraGuest?.name || (token.startsWith('reserva-') ? 'Convidado Confirmado' : token),
          email: extraGuest?.email || '',
          phone: extraGuest?.phone || '',
          group: extraGuest?.group || 'Friends',
          tableNumber: extraGuest?.tableNumber || 'Mesa Convidados',
          maxPlusOnes: Math.max(companions, 1),
          plusOnesConfirmed: companions,
          status,
          dietaryRequirements: dietary,
          notes,
          rsvpToken: token,
          invitationViews: 1,
          lastViewedAt: new Date().toISOString(),
          confirmedAt: new Date().toISOString(),
          checkedIn: false
        };
        targetGuestName = newGuestObj.name;
        nextGuests = [newGuestObj, ...prev];
      }

      // Immediate local cache persistence
      if (activeClientId) {
        safeSetItem(`kutxi_guests_${activeClientId}`, JSON.stringify(nextGuests));
        if (activeClientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(nextGuests));
        }
        dbService.guests.saveAll(activeClientId, nextGuests).catch(() => {});
      }

      return nextGuests;
    });

    // Notify other components via window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kutxi_guest_list_updated', {
        detail: { clientId: activeClientId, token, status }
      }));
    }

    const resp = status === 'Confirmed' ? 'Confirmado' : 'Recusado';
    addAuditLog(targetGuestName, 'RSVP Enviado pelo Convidado', `Confirmação de presença gravada no sistema. Status: ${resp}, acompanhantes: ${companions}.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* SaaS Premium Backoffice Header (Replaces the raw prototype switcher) */}
      {!isPortariaLocked && !isInviteLocked && (
        <header className="bg-slate-950 border-b border-slate-800 text-slate-100 z-45 sticky top-0 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              
              {/* Left branding */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 shadow-md">
                  <Heart className="w-4 h-4 text-white fill-white/20 animate-pulse" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm tracking-wider text-white uppercase flex items-center gap-1">João <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline animate-pulse" /> Alice</span>
                  <span className="text-[9px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded ml-2 border border-rose-500/15">SaaS Portal</span>
                </div>
              </div>

              {/* Middle navigation tabs */}
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { id: 'saas-landing', label: 'Início', icon: Sparkles, public: true },
                  { id: 'client-dashboard', label: 'Painel dos Noivos', icon: Heart, public: false },
                  { id: 'super-admin', label: 'Super Administrador', icon: Shield, public: false },
                  { id: 'gatekeeper-portal', label: 'Portaria & Scanner', icon: QrCode, public: false },
                  { id: 'public-invite', label: 'Visualizar Convite', icon: BookOpen, public: true }
                ].filter(item => {
                  // Non-admin users should NOT see super-admin console
                  if (item.id === 'super-admin') {
                    return isAuthenticated && activeUser === 'Ki-eventos';
                  }
                  return true;
                }).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (!isAuthenticated && !item.public) {
                          setSelectedPackage(null);
                          setAuthTab('login');
                          setShowAuthModal(true);
                          addAuditLog('Segurança', 'Acesso Bloqueado', `Tentativa de navegar para "${item.label}" sem login.`);
                        } else {
                          setPersona(item.id as AppPersona);
                          addAuditLog('Acesso de Menu', 'Navegação de Tela', `Usuário navegou para a tela ${item.label}`);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        persona === item.id 
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                      {!isAuthenticated && !item.public && <span className="text-[10px] text-stone-500 ml-1">🔒</span>}
                    </button>
                  );
                })}
              </nav>

              {/* Right panel profile & logout */}
              <div className="flex items-center gap-2.5">
                {/* Supabase Cloud Connection Status Button */}
                <button
                  type="button"
                  onClick={() => setShowSupabaseModal(true)}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSupabaseConfigured()
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Configurar Banco de Dados Supabase"
                >
                  <Database className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden md:inline">{isSupabaseConfigured() ? 'Supabase Conectado' : 'Supabase'}</span>
                  <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                </button>

                {isAuthenticated ? (
                  <>
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-xs font-bold text-white">
                        {activeUser === 'Ki-eventos' ? 'Painel Administrativo' : activeUser}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-medium">
                        {activeUser === 'Ki-eventos' ? 'Parceiro Homologado' : 'Noivos Kutxi ❤️ Kutxi'}
                      </span>
                    </div>
                    
                    <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

                    <button
                      onClick={() => {
                        setIsAuthenticated(false);
                        safeSetItem('kutxi_is_authenticated', 'false');
                        safeSetItem('vowsflow_is_authenticated', 'false');
                        setActiveUser('Ki-eventos');
                        setActiveClientId('client_1');
                        setPersona('saas-landing');
                        addAuditLog('Segurança', 'Logout Realizado', 'Encerramento seguro da sessão.');
                      }}
                      className="p-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-xs"
                      title="Sair do Backoffice"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Sair</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPackage(null);
                      setAuthTab('login');
                      setShowAuthModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Entrar / Cadastrar</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Mobile Navigation Bar */}
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 bg-slate-950/95 overflow-x-auto">
            {[
              { id: 'saas-landing', label: 'Início', icon: Sparkles, public: true },
              { id: 'client-dashboard', label: 'Noivos', icon: Heart, public: false },
              { id: 'super-admin', label: 'Admin', icon: Shield, public: false },
              { id: 'gatekeeper-portal', label: 'Portaria', icon: QrCode, public: false },
              { id: 'public-invite', label: 'Convite', icon: BookOpen, public: true }
            ].filter(item => {
              if (item.id === 'super-admin') {
                return isAuthenticated && activeUser === 'Ki-eventos';
              }
              return true;
            }).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isAuthenticated && !item.public) {
                      setSelectedPackage(null);
                      setAuthTab('login');
                      setShowAuthModal(true);
                    } else {
                      setPersona(item.id as AppPersona);
                    }
                  }}
                  className={`flex flex-col items-center p-1 rounded transition-all text-[9px] font-semibold cursor-pointer ${
                    persona === item.id ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mb-0.5" />
                  <span className="flex items-center">
                    {item.label}
                    {!isAuthenticated && !item.public && <span className="text-[8px] text-stone-600 ml-0.5">🔒</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </header>
      )}

      {/* RENDER ACTIVE SCREEN */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          
          {/* VIEW: SAAS LANDING HOMEPAGE (AMBIENTE DE BOAS VINDAS INTEGRADO) */}
          {persona === 'saas-landing' && (
            <motion.div
              key="saas-landing-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 pb-24"
              id="saas-landing-page"
            >
              {/* Welcome Dashboard Hero Header */}
              <section className="relative overflow-hidden pt-12 md:pt-16 px-6 max-w-7xl mx-auto text-center space-y-6">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-2xl -z-10"></div>

                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-800 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Sessão Operacional Ativa • Olá, Painel Administrativo!
                  </span>
                  <h1 className="text-3xl md:text-5xl font-display tracking-tight text-slate-900 font-light leading-tight">
                    Bem-vindo ao Cockpit <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-950 via-rose-800 to-amber-900 font-serif italic">de Planejamento de Casamentos</span>
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                    Você está logado na consola operacional do <strong>Kutxi ❤️ Kutxi</strong>. Daqui você pode gerenciar casamentos, configurar convites responsivos e testar leitores de portaria.
                  </p>
                </div>

                {/* Quick Access Cockpit Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-6 text-left">
                  {isAuthenticated && activeUser === 'Ki-eventos' ? (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-rose-150 transition-all group">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center">
                          <Users className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-all" />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-xs">Gestão de Casais & Clientes</h3>
                        <p className="text-[11px] text-slate-400">Administração central de noivos, status de subscrições, limites de convidados e aprovação de planos.</p>
                      </div>
                      <button
                        onClick={() => setPersona('super-admin')}
                        className="mt-4 flex items-center justify-between text-xs font-semibold text-rose-800 hover:text-rose-950 transition-all cursor-pointer"
                      >
                        Gerenciar Casais
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-rose-150 transition-all group">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center">
                          <Heart className="w-4 h-4 text-rose-600 fill-rose-600/10 group-hover:scale-110 transition-all" />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-xs">Painel dos Noivos</h3>
                        <p className="text-[11px] text-slate-400">Espaço de planejamento de {weddingConfig?.brideGroom?.groomName || 'Gabriel'} & {weddingConfig?.brideGroom?.brideName || 'Sofia'}. Gerencie a lista de convidados e envie o RSVP.</p>
                      </div>
                      <button
                        onClick={() => {
                          setPersona('client-dashboard');
                          setClientTab('overview');
                        }}
                        className="mt-4 flex items-center justify-between text-xs font-semibold text-rose-800 hover:text-rose-950 transition-all cursor-pointer"
                      >
                        Aceder ao Painel
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isAuthenticated && activeUser === 'Ki-eventos' && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all group">
                      <div className="space-y-2">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-all" />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-xs">Super Administrador</h3>
                        <p className="text-[11px] text-slate-400">Consola de faturamento ARR, logs auditáveis e gerenciamento de todos os casamentos locatários.</p>
                      </div>
                      <button
                        onClick={() => setPersona('super-admin')}
                        className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-800 hover:text-slate-950 transition-all cursor-pointer"
                      >
                        Aceder à Consola
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-emerald-150 transition-all group">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-all" />
                      </div>
                      <h3 className="font-semibold text-slate-800 text-xs">Portaria & Concierge</h3>
                      <p className="text-[11px] text-slate-400">Scanner de convites para equipe de segurança e recepcionistas. Evite penetras com segurança.</p>
                    </div>
                    <button
                      onClick={() => setPersona('gatekeeper-portal')}
                      className="mt-4 flex items-center justify-between text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-all cursor-pointer"
                    >
                      Abrir Portaria
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Como Funciona Section */}
              <section className="bg-slate-900 py-16 px-6 text-white border-y border-slate-850">
                <div className="max-w-7xl mx-auto space-y-12">
                  <div className="text-center space-y-3">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-rose-400 font-bold">Fluxo Operacional do SaaS</span>
                    <h2 className="text-2xl md:text-3xl font-display font-medium text-white">Como Funciona a Kutxi</h2>
                    <p className="text-xs text-slate-400 max-w-lg mx-auto">Nossa arquitetura encurta caminhos e blinda casamentos de ponta a ponta.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    {[
                      { step: '01', title: 'Cadastro Inicial', desc: 'O casal ou cerimonial cadastra as informações básicas e define o plano.', icon: BookOpen },
                      { step: '02', title: 'Personalização do Site', desc: 'Noivos customizam o convite, trilha musical e história no editor interativo.', icon: Sliders },
                      { step: '03', title: 'RSVP de Segurança', desc: 'Convites são gerados com tokens encriptados individuais para travar penetras.', icon: Heart },
                      { step: '04', title: 'Acreditação Portaria', desc: 'Equipes escaneiam o QR Code na entrada, computando check-in no ato.', icon: QrCode }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-4 relative">
                        <div className="absolute top-4 right-4 text-3xl font-serif italic text-slate-850 font-bold leading-none select-none">{item.step}</div>
                        <div className="p-2 bg-rose-500/10 text-rose-300 rounded-xl w-9 h-9 flex items-center justify-center">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-white text-xs">{item.title}</h3>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Pricing Section featuring the Plano Grátis */}
              <section className="px-6 max-w-7xl mx-auto text-center space-y-10">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-rose-700 font-bold">Investimento Sob Medida</span>
                  <h2 className="text-2xl md:text-3xl font-display font-medium text-slate-900">Planos de Assinatura Comercial</h2>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">Planos modulares para atender mini-weddings charmosos até festas monumentais de gala.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left text-xs">
                  {[
                    { 
                      name: 'Plano Grátis', 
                      price: '0,00 Kz', 
                      desc: 'Para testar os recursos ou comemorações íntimas no civil.', 
                      features: ['Até 15 convidados na lista', 'Formulário básico de RSVP', 'Envio manual de links padrão', 'Tema clássico pré-configurado'],
                      cta: 'Ativar Plano Teste',
                      highlight: false
                    },
                    { 
                      name: 'Plano Essencial', 
                      price: '45.000,00 Kz', 
                      desc: 'Perfeito para mini-weddings intimistas.', 
                      features: ['Até 100 convidados na lista', '1 GB de mídias e fotos', 'Paleta de cores selecionável', 'Suporte comercial por e-mail'],
                      cta: 'Comprar Plano Essencial',
                      highlight: false
                    },
                    { 
                      name: 'Plano Premium', 
                      price: '135.000,00 Kz', 
                      desc: 'O mais querido para cerimônias tradicionais.', 
                      features: ['Até 300 convidados na lista', '5 GB de fotos em alta resolução', 'Trilha sonora e música ambiente', 'Suporte prioritário em 24 horas'],
                      cta: 'Comprar Plano Premium',
                      highlight: false
                    },
                    { 
                      name: 'Plano Luxo', 
                      price: '225.000,00 Kz', 
                      desc: 'A experiência suprema, ilimitada e impecável.', 
                      features: ['Convidados ilimitados na lista', '15 GB de armazenamento', 'Editor visual avançado ativo', 'Portaria inteligente via QR Code', 'Suporte Hot-line VIP WhatsApp'],
                      cta: 'Iniciar com Luxo',
                      highlight: true
                    }
                  ].map((tier, idx) => (
                    <div 
                      key={idx} 
                      className={`bg-white p-5 rounded-2xl border flex flex-col justify-between transition-all hover:shadow-md ${
                        tier.highlight 
                          ? 'border-rose-400 ring-2 ring-rose-500/15 scale-102 lg:scale-105 shadow-sm' 
                          : 'border-slate-200/70 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-slate-400 text-[10px] block uppercase tracking-wider">{tier.name}</span>
                            <strong className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{tier.price}</strong>
                            <span className="text-[9px] text-slate-400 font-mono"> / único</span>
                          </div>
                          {tier.highlight && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[10px] leading-relaxed min-h-[30px]">{tier.desc}</p>
                        <ul className="space-y-2 pt-3 border-t border-slate-50">
                          {tier.features.map((feat, fidx) => (
                            <li key={fidx} className="flex items-center gap-1.5 text-slate-600 text-[10px]">
                              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            setSelectedPackage(tier.name);
                            setAuthTab('register');
                            setShowAuthModal(true);
                            addAuditLog('SaaS Landing', 'Iniciar Inscrição', `Casal iniciou inscrição para o plano "${tier.name}"`);
                          } else {
                            // If they are logged in, we let them view their dashboard as simulate upgrade
                            setPersona('client-dashboard');
                            setClientTab('overview');
                            addAuditLog('Upgrade de Assinatura', 'Mudança de Plano', `Noivo simulou adesão ao "${tier.name}".`);
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold transition-all text-center mt-6 cursor-pointer text-[11px] ${
                          tier.highlight 
                            ? 'bg-rose-800 text-white hover:bg-rose-900 shadow-sm' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isAuthenticated ? 'Ver no Painel' : tier.cta}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* VIEW: SUPER ADMIN DASHBOARD */}
          {persona === 'super-admin' && (
            isAuthenticated && activeUser === 'Ki-eventos' ? (
              <motion.div
                key="super-admin-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 md:px-8 py-6 space-y-6 max-w-7xl mx-auto"
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-150">
                  <div>
                    <h1 className="text-xl md:text-2xl font-display font-medium text-slate-900">Kutxi Platform - Super Administrador</h1>
                    <p className="text-xs text-slate-400">Métricas de saúde do servidor, faturamento ARR, gerenciamento de locatários e auditoria de logs com IP.</p>
                  </div>
                  <button
                    onClick={() => setPersona('saas-landing')}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 bg-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair do Painel
                  </button>
                </div>

                <SuperAdmin 
                  clients={clients}
                  userAccounts={userAccounts}
                  auditLogs={auditLogs}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              </motion.div>
            ) : (
              <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-serif text-slate-900 font-semibold">Acesso Restrito</h2>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">Esta área requer credenciais autorizadas de nível de sistema.</p>
                <button
                  onClick={() => setPersona('saas-landing')}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Voltar ao Início
                </button>
              </div>
            )
          )}

          {/* VIEW: CLIENT DASHBOARD (BRIDE & GROOM PLANNERS) */}
          {persona === 'client-dashboard' && (
            isAuthenticated ? (
              <motion.div
                key="client-dashboard-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 md:px-8 py-6 space-y-6 max-w-7xl mx-auto"
              >
                {/* Client header and tabs swapper */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-800 font-bold font-mono">
                      {(weddingConfig.brideGroom.groomName ? weddingConfig.brideGroom.groomName.charAt(0) : 'N') + '&' + weddingConfig.brideGroom.brideName.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-slate-900">Painel de {weddingConfig.brideGroom.groomName || 'Noivo'} & {weddingConfig.brideGroom.brideName || 'Noiva'}</h1>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Casamento: {new Date(weddingConfig.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Dashboard Tab Buttons */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    {[
                      { id: 'overview', label: 'Estatísticas', icon: Users },
                      { id: 'editor', label: 'Personalizar Convite', icon: Sliders },
                      { id: 'guests', label: 'Lista de Convidados', icon: Users },
                      { id: 'gifts', label: 'Lista de Presentes', icon: Gift },
                      { id: 'album', label: 'Álbum & Mensagens', icon: Heart },
                      { id: 'checkin', label: 'Scanner de Portaria', icon: QrCode }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setClientTab(tab.id as ClientTab)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          clientTab === tab.id 
                            ? 'bg-white text-rose-800 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RENDER CHOSEN TAB */}
                <div className="min-h-[60vh]">
                  {activeUser !== 'Ki-eventos' && clients.find(c => c.id === activeClientId)?.status === 'Trial' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        <span><strong>Espaço dos Noivos Ativo:</strong> Todas as ferramentas de personalização de convite, lista de convidados e RSVP em tempo real estão disponíveis.</span>
                      </div>
                      <span className="text-[10px] bg-amber-200/60 px-2 py-0.5 rounded font-mono font-bold">Acesso Liberado</span>
                    </div>
                  )}

                  {activeUser !== 'Ki-eventos' && (weddingConfig.brideGroom.groomName === 'Parceiro(a)' || weddingConfig.isFirstLogin) ? (
                    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-150 shadow-md space-y-6 text-slate-800" id="first-login-setup">
                      <div className="text-center space-y-2">
                        <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full inline-block font-bold uppercase tracking-wider">Configuração Inicial Obrigatória</span>
                        <h2 className="text-lg font-serif text-slate-900 font-semibold">✨ Bem-vindos à Kutxi!</h2>
                        <p className="text-xs text-slate-500">
                          Para começarmos a moldar o seu site de casamento exclusivo, por favor informe o nome do noivo e da noiva que irá ser atualizado ao site automaticamente.
                        </p>
                      </div>

                      <div className="space-y-4 text-xs font-semibold">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-medium">Nome do Noivo (Ele)</label>
                            <input
                              type="text"
                              id="setup-groom-name"
                              placeholder="Ex: Gabriel"
                              defaultValue={weddingConfig.brideGroom.groomName !== 'Parceiro(a)' ? weddingConfig.brideGroom.groomName : ''}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-500 bg-slate-50 text-slate-800 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-slate-500 font-medium">Nome da Noiva (Ela)</label>
                            <input
                              type="text"
                              id="setup-bride-name"
                              placeholder="Ex: Sofia"
                              defaultValue={weddingConfig.brideGroom.brideName}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-500 bg-slate-50 text-slate-800 font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-500 font-medium">Data do Casamento</label>
                          <input
                            type="date"
                            id="setup-wedding-date"
                            defaultValue={weddingConfig.date ? weddingConfig.date.split('T')[0] : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-500 bg-slate-50 text-slate-800 font-medium"
                          />
                        </div>

                        <button
                          onClick={() => {
                            const groomVal = (document.getElementById('setup-groom-name') as HTMLInputElement)?.value.trim() || 'Gabriel';
                            const brideVal = (document.getElementById('setup-bride-name') as HTMLInputElement)?.value.trim() || 'Sofia';
                            const dateVal = (document.getElementById('setup-wedding-date') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];

                            handleFirstLoginSubmit(groomVal, brideVal, dateVal);
                          }}
                          className="w-full py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                        >
                          <span>Iniciar Painel de Controle ✓</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {clientTab === 'overview' && (
                        <SaaSOverview 
                          guests={guests}
                          config={weddingConfig}
                          planName={activeClientId === 'client_1' ? 'Plano Luxo (Luxury Plan)' : 'Plano Comercial Ativo'}
                          onUpdateConfig={handleUpdateWeddingConfig}
                          onNavigateTab={(tab) => setClientTab(tab as ClientTab)}
                          onOpenPublicInvite={() => setPersona('public-invite')}
                        />
                      )}
                      {clientTab === 'editor' && (
                        <VisualEditor 
                          config={weddingConfig}
                          onSave={handleUpdateWeddingConfig}
                        />
                      )}
                      {clientTab === 'guests' && (
                        <GuestManager 
                          guests={guests}
                          clientId={activeClientId}
                          config={weddingConfig}
                          onAddGuest={handleAddGuest}
                          onUpdateGuest={handleUpdateGuest}
                          onDeleteGuest={handleDeleteGuest}
                          onBulkStatusUpdate={handleBulkStatusUpdate}
                        />
                      )}
                      {clientTab === 'gifts' && (
                        <GiftRegistry 
                          config={weddingConfig}
                          onUpdateConfig={handleUpdateWeddingConfig}
                        />
                      )}
                      {clientTab === 'album' && (
                        <SharedAlbumManager 
                          config={weddingConfig}
                        />
                      )}
                      {clientTab === 'checkin' && (
                        <QRCheckIn 
                          guests={guests}
                          onCheckIn={handleDoorCheckIn}
                          clientId={activeClientId}
                        />
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-800 border border-rose-200 mb-4 animate-pulse">
                  <Heart className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-serif text-slate-900 font-semibold">Painel de Controle dos Noivos</h2>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">Organize mesas, envie convites elegantes com RSVP em tempo real e controle a portaria do seu casamento.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthTab('login'); }}
                    className="px-5 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Fazer Login de Casal
                  </button>
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthTab('register'); }}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Criar Nova Conta
                  </button>
                </div>
              </div>
            )
          )}

          {/* VIEW: GATEKEEPER PORTAL (FOR PORTARIA DOOR SCANNER STAFF) */}
          {persona === 'gatekeeper-portal' && (
            <motion.div
              key="gatekeeper-portal-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen bg-slate-900"
            >
              <GatekeeperPortal 
                guests={guests}
                onCheckIn={handleDoorCheckIn}
                clientName={`${weddingConfig.brideGroom.groomName} & ${weddingConfig.brideGroom.brideName}`}
                onExitPortal={() => setPersona('client-dashboard')}
                isLocked={isPortariaLocked}
              />
            </motion.div>
          )}

          {/* VIEW: PUBLIC GUEST INVITATION SITE (FULLSCREEN PREVIEW MODE) */}
          {persona === 'public-invite' && (
            <motion.div
              key="public-invite-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white min-h-screen"
              id="public-wedding-invitation-view"
            >
              <PublicInvite 
                config={weddingConfig}
                simulatedOnly={false}
                guestToken={urlGuestToken || undefined}
                allGuests={guests}
                onGuestRsvpSubmit={handleGuestRsvpFromInvite}
                onSwitchClient={(cid) => {
                  setActiveClientId(cid);
                  safeSetItem('kutxi_active_client_id', cid);
                }}
                onUpdateConfig={handleUpdateWeddingConfig}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* SaaS Bottom Sticky Signature */}
      {!isPortariaLocked && !isInviteLocked && (
        <footer className="bg-white border-t border-slate-200/50 py-4 px-6 text-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
          Kutxi Convite Digital João & Alice • VowsFlow
        </footer>
      )}

      {/* DYNAMIC MULTI-TENANT AUTH & REGISTRATION MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialTab={authTab}
            selectedPackage={selectedPackage}
            userAccounts={userAccounts}
            onLoginSuccess={(username, clientId) => {
              setIsAuthenticated(true);
              safeSetItem('kutxi_is_authenticated', 'true');
              safeSetItem('vowsflow_is_authenticated', 'true');
              setActiveUser(username);
              setActiveClientId(clientId);
              
              // Direct their dashboard tab
              setPersona(clientId === 'client_1' && username === 'Ki-eventos' ? 'super-admin' : 'client-dashboard');
              setClientTab('overview');
              addAuditLog(username, 'Login Bem-Sucedido', `Usuário "${username}" entrou no espaço de trabalho associado ao cliente ID: ${clientId}.`);
            }}
            onRegisterSuccess={(newClient, user1, user2) => {
              // Add client to system clients
              handleAddClient(newClient);
              
              // Register both newly generated accounts to the authentication list
              setUserAccounts(prev => [
                ...prev,
                { username: user1.username, pass: user1.pass, clientId: newClient.id, clientName: newClient.clientName },
                { username: user2.username, pass: user2.pass, clientId: newClient.id, clientName: newClient.clientName }
              ]);

              addAuditLog('SaaS Platform', 'Inscrição de Casal Realizada', `Conta criada para "${newClient.clientName}" com usuários gerados: [${user1.username}, ${user2.username}].`);
            }}
          />
        )}
      </AnimatePresence>

      {/* GLOBAL SUPABASE CLOUD MANAGEMENT MODAL */}
      <SupabaseModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        clients={clients}
        weddingConfig={weddingConfig}
        guests={guests}
        auditLogs={auditLogs}
        onDataSynced={() => {
          // Sync any new state
        }}
      />

    </div>
  );
}
