import { Guest, WeddingConfig, ClientWeddingSaaS, SystemAuditLog, WeddingRegistryItem } from '../types';
import { INITIAL_WEDDING_CONFIG, INITIAL_GUESTS, INITIAL_CLIENTS, INITIAL_AUDIT_LOGS } from '../data/defaultConfig';
import { safeSetItem, safeGetItem, sanitizeClientsList, sanitizeConfigForStorage } from '../utils/storage';
import { 
  isSupabaseConfigured, 
  supabaseSyncWeddingConfig, 
  supabaseFetchWeddingConfig,
  supabaseSyncGuests, 
  supabaseFetchGuests, 
  supabaseUpdateGuest,
  supabaseSyncClients, 
  supabaseFetchClients, 
  supabaseSyncAuditLogs, 
  supabaseFetchAuditLogs,
  getSupabaseClient
} from './supabase';

/**
 * Kutxi Database Adapter & Service Architecture
 * 
 * Multi-tenant cloud-first database abstraction with seamless Supabase synchronization
 * and resilient local-first offline fallback.
 */

export type DatabaseDriver = 'supabase' | 'local';

export interface DatabaseConfig {
  driver: DatabaseDriver;
}

export const DB_CONFIG: DatabaseConfig = {
  get driver() {
    return isSupabaseConfigured() ? 'supabase' : 'local';
  }
};

/**
 * Universal text normalizer for search and lookup
 */
export const normalizeText = (text: string): string => {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // remove punctuation/dashes/spaces
};

export const extractCleanToken = (raw: string): string => {
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

/**
 * Database Service facade
 */
export const dbService = {
  /**
   * WEDDING CONFIG OPERATIONS
   */
  weddingConfig: {
    async get(clientId: string): Promise<WeddingConfig> {
      // 1. Try local cache first for instant render
      try {
        const key = `kutxi_wedding_config_${clientId}`;
        const saved = safeGetItem(key) || 
                      (clientId === 'client_1' ? safeGetItem('kutxi_wedding_config') : null);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Async background sync with Supabase if configured
          if (isSupabaseConfigured()) {
            supabaseFetchWeddingConfig(clientId).then(cloudConfig => {
              if (cloudConfig) {
                safeSetItem(key, JSON.stringify(cloudConfig));
              }
            }).catch(() => {});
          }
          return parsed;
        }

        // Check clients list snapshot
        const savedClients = safeGetItem('kutxi_clients');
        if (savedClients) {
          const list: ClientWeddingSaaS[] = JSON.parse(savedClients);
          const found = list.find(c => c.id === clientId || c.config?.id === clientId);
          if (found?.config) return found.config;
        }
      } catch (e) {
        console.warn('[dbService.weddingConfig.get] Local cache read error:', e);
      }

      // 2. If not in local cache, attempt Supabase fetch
      if (isSupabaseConfigured()) {
        try {
          const cloudConfig = await supabaseFetchWeddingConfig(clientId);
          if (cloudConfig) {
            safeSetItem(`kutxi_wedding_config_${clientId}`, JSON.stringify(cloudConfig));
            return cloudConfig;
          }
        } catch (e) {
          console.warn('[dbService.weddingConfig.get] Supabase fetch error:', e);
        }
      }

      return INITIAL_WEDDING_CONFIG;
    },

    async save(clientId: string, config: WeddingConfig): Promise<void> {
      try {
        const sanitized = sanitizeConfigForStorage(config) || config;
        safeSetItem(`kutxi_wedding_config_${clientId}`, JSON.stringify(sanitized));
        if (clientId === 'client_1') {
          safeSetItem('kutxi_wedding_config', JSON.stringify(sanitized));
        }

        // Keep clients record synced
        const savedClients = safeGetItem('kutxi_clients');
        if (savedClients) {
          try {
            const list: ClientWeddingSaaS[] = JSON.parse(savedClients);
            const updated = list.map(c => {
              if (c.id === clientId || c.config?.id === clientId) {
                return {
                  ...c,
                  clientName: `${config.brideGroom?.groomName || 'Noivo'} & ${config.brideGroom?.brideName || 'Noiva'}`,
                  weddingDate: config.date ? config.date.split('T')[0] : c.weddingDate,
                  config: sanitized
                };
              }
              return c;
            });
            safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(updated)));
          } catch (e) {}
        }

        // Sync to Supabase in background
        if (isSupabaseConfigured()) {
          supabaseSyncWeddingConfig(clientId, sanitized).catch(err => {
            console.warn('[dbService.weddingConfig.save] Supabase sync error:', err);
          });
        }
      } catch (e) {
        console.warn('[dbService.weddingConfig.save] Error:', e);
      }
    }
  },

  /**
   * GUESTS REPOSITORY & UNIVERSAL SEARCH
   */
  guests: {
    async getAll(clientId: string): Promise<Guest[]> {
      // 1. Check local cache
      try {
        const saved = safeGetItem(`kutxi_guests_${clientId}`) || 
                      (clientId === 'client_1' ? safeGetItem('kutxi_guests') : null);
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list) && list.length > 0) {
            // Background sync from Supabase if configured
            if (isSupabaseConfigured()) {
              supabaseFetchGuests(clientId).then(cloudGuests => {
                if (cloudGuests && cloudGuests.length > 0) {
                  safeSetItem(`kutxi_guests_${clientId}`, JSON.stringify(cloudGuests));
                }
              }).catch(() => {});
            }
            return list;
          }
        }
      } catch (e) {
        console.warn('[dbService.guests.getAll] Cache error:', e);
      }

      // 2. Fetch from Supabase
      if (isSupabaseConfigured()) {
        try {
          const cloudGuests = await supabaseFetchGuests(clientId);
          if (cloudGuests && cloudGuests.length > 0) {
            safeSetItem(`kutxi_guests_${clientId}`, JSON.stringify(cloudGuests));
            return cloudGuests;
          }
        } catch (e) {
          console.warn('[dbService.guests.getAll] Supabase fetch error:', e);
        }
      }

      if (clientId === 'client_1') return INITIAL_GUESTS;
      return [];
    },

    async saveAll(clientId: string, guests: Guest[]): Promise<void> {
      try {
        safeSetItem(`kutxi_guests_${clientId}`, JSON.stringify(guests));
        if (clientId === 'client_1') {
          safeSetItem('kutxi_guests', JSON.stringify(guests));
        }

        // Sync to Supabase
        if (isSupabaseConfigured()) {
          supabaseSyncGuests(clientId, guests).catch(err => {
            console.warn('[dbService.guests.saveAll] Supabase sync error:', err);
          });
        }
      } catch (e) {
        console.warn('[dbService.guests.saveAll] Error:', e);
      }
    },

    async add(clientId: string, guest: Guest): Promise<Guest[]> {
      const current = await this.getAll(clientId);
      const updated = [guest, ...current];
      await this.saveAll(clientId, updated);
      return updated;
    },

    async update(clientId: string, updatedGuest: Guest): Promise<Guest[]> {
      const current = await this.getAll(clientId);
      const updated = current.map(g => g.id === updatedGuest.id ? updatedGuest : g);
      await this.saveAll(clientId, updated);

      if (isSupabaseConfigured()) {
        supabaseUpdateGuest(updatedGuest.id, updatedGuest).catch(() => {});
      }
      return updated;
    },

    async delete(clientId: string, guestId: string): Promise<Guest[]> {
      const current = await this.getAll(clientId);
      const updated = current.filter(g => g.id !== guestId);
      await this.saveAll(clientId, updated);
      return updated;
    },

    /**
     * Highly tolerant search matching token, full name, single word (first/last), or token digits
     */
    async findByQuery(query: string, preferredClientId?: string): Promise<{ guest: Guest; clientId: string; config?: WeddingConfig } | null> {
      if (!query || !query.trim()) return null;

      const cleanToken = extractCleanToken(query);
      const normToken = normalizeText(cleanToken);
      const normRaw = normalizeText(query);
      const digitsInQuery = query.replace(/[^0-9]/g, '');
      const rawWords = query.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2);

      const isMatch = (g: Guest): boolean => {
        if (!g) return false;
        const gToken = g.rsvpToken || '';
        const gName = g.name || '';
        const gEmail = g.email || '';
        const gPhone = (g.phone || '').replace(/[^0-9]/g, '');
        const gId = g.id || '';

        const normGToken = normalizeText(gToken);
        const normGName = normalizeText(gName);
        const normGEmail = normalizeText(gEmail);

        // 1. Direct or normalized token match
        if (gToken.toLowerCase() === cleanToken.toLowerCase() || gToken.toLowerCase() === query.trim().toLowerCase()) return true;
        if (normGToken && (normGToken === normToken || normGToken === normRaw)) return true;
        if (gId === cleanToken || gId === query.trim()) return true;

        // 2. Name full match
        if (normGName && (normGName === normRaw || normGName === normToken)) return true;

        // 3. Name contains query or query contains name
        if (normGName && normRaw.length >= 3 && (normGName.includes(normRaw) || normRaw.includes(normGName))) return true;

        // 4. Token contains query or query contains token
        if (normGToken && normToken.length >= 3 && (normGToken.includes(normToken) || normToken.includes(normGToken))) return true;

        // 5. Individual word match in guest's name (e.g. searching "Arthur" matches "Sr. Arthur Jenkins")
        if (rawWords.length > 0) {
          const guestNameWords = gName.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
          const anyWordMatched = rawWords.some(rw => guestNameWords.some(gw => gw.includes(rw) || rw.includes(gw)));
          if (anyWordMatched && normRaw.length >= 3) return true;
        }

        // 6. Token numeric suffix match (e.g. user enters the 4-digit code)
        if (digitsInQuery.length >= 4 && normGToken.includes(digitsInQuery)) return true;

        // 7. Email match
        if (normGEmail && (normGEmail === normRaw || normGEmail === normToken)) return true;

        // 8. Phone match
        if (gPhone && digitsInQuery.length >= 6 && gPhone.includes(digitsInQuery)) return true;

        return false;
      };

      // 1. Check preferred client first if provided
      if (preferredClientId) {
        const preferredGuests = await this.getAll(preferredClientId);
        const match = preferredGuests.find(isMatch);
        if (match) {
          return { guest: match, clientId: preferredClientId };
        }
      }

      // 2. Search across ALL local guest partitions dynamically
      try {
        if (typeof localStorage !== 'undefined') {
          const allKeys = Object.keys(localStorage);
          const guestKeys = allKeys.filter(k => k.startsWith('kutxi_guests_') || k.startsWith('vowsflow_guests_') || k === 'kutxi_guests' || k === 'vowsflow_guests');

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
                  const found = list.find(isMatch);
                  if (found) {
                    return { guest: found, clientId: cid };
                  }
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        console.warn('[dbService.guests.findByQuery] Local storage scan error:', e);
      }

      // 3. If Supabase is connected, query Supabase
      if (isSupabaseConfigured()) {
        try {
          const client = getSupabaseClient();
          if (client) {
            const { data } = await client
              .from('kutxi_guests')
              .select('*')
              .or(`rsvp_token.ilike.%${cleanToken}%,name.ilike.%${cleanToken}%`)
              .limit(5);

            if (data && data.length > 0) {
              const row = data[0];
              const guest: Guest = {
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                group: (row.group_name as any) || 'Geral',
                tableNumber: row.table_number || '',
                rsvpToken: row.rsvp_token,
                status: row.status,
                maxPlusOnes: row.max_plus_ones || 0,
                plusOnesConfirmed: row.plus_ones_confirmed || 0,
                dietaryRequirements: row.dietary || '',
                notes: row.notes || '',
                invitationViews: row.invitation_views || 0,
                checkedIn: Boolean(row.checked_in),
                checkedInAt: row.checked_in_at || undefined
              };
              return { guest, clientId: row.client_id };
            }
          }
        } catch (e) {}
      }

      // 4. Check INITIAL_GUESTS fallback (contains pedro-pureza-8170, eleanor-m-tahoe, etc.)
      const initialMatch = INITIAL_GUESTS.find(isMatch);
      if (initialMatch) {
        const config = await dbService.weddingConfig.get('client_1');
        return { guest: initialMatch, clientId: 'client_1', config };
      }

      return null;
    }
  },

  /**
   * CLIENTS / TENANTS REPOSITORY
   */
  clients: {
    async getAll(): Promise<ClientWeddingSaaS[]> {
      try {
        const saved = safeGetItem('kutxi_clients');
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list) && list.length > 0) {
            // Background sync with Supabase
            if (isSupabaseConfigured()) {
              supabaseFetchClients().then(cloudClients => {
                if (cloudClients && cloudClients.length > 0) {
                  safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(cloudClients)));
                }
              }).catch(() => {});
            }
            return list;
          }
        }
      } catch (e) {
        console.warn('[dbService.clients.getAll] Error:', e);
      }

      // Fetch from Supabase
      if (isSupabaseConfigured()) {
        try {
          const cloudClients = await supabaseFetchClients();
          if (cloudClients && cloudClients.length > 0) {
            safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(cloudClients)));
            return cloudClients;
          }
        } catch (e) {}
      }

      return INITIAL_CLIENTS;
    },

    async save(client: ClientWeddingSaaS): Promise<void> {
      const current = await this.getAll();
      const exists = current.some(c => c.id === client.id);
      const updated = exists ? current.map(c => c.id === client.id ? client : c) : [client, ...current];
      safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(updated)));

      if (isSupabaseConfigured()) {
        supabaseSyncClients(updated).catch(() => {});
      }
    }
  },

  /**
   * AUDIT LOGS REPOSITORY
   */
  audit: {
    async getLogs(): Promise<SystemAuditLog[]> {
      try {
        const saved = safeGetItem('kutxi_audit_logs');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('[dbService.audit.getLogs] Error:', e);
      }

      if (isSupabaseConfigured()) {
        try {
          const cloudLogs = await supabaseFetchAuditLogs();
          if (cloudLogs && cloudLogs.length > 0) {
            safeSetItem('kutxi_audit_logs', JSON.stringify(cloudLogs.slice(0, 30)));
            return cloudLogs;
          }
        } catch (e) {}
      }

      return INITIAL_AUDIT_LOGS;
    },

    async log(actor: string, action: string, details: string): Promise<void> {
      try {
        const current = await this.getLogs();
        const newEntry: SystemAuditLog = {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString(),
          actor,
          action,
          details,
          ip: '102.214.34.' + Math.floor(Math.random() * 250 + 1)
        };
        const updated = [newEntry, ...current].slice(0, 30);
        safeSetItem('kutxi_audit_logs', JSON.stringify(updated));

        if (isSupabaseConfigured()) {
          supabaseSyncAuditLogs(updated).catch(() => {});
        }
      } catch (e) {
        console.warn('[dbService.audit.log] Error:', e);
      }
    }
  },

  /**
   * FULL SYSTEM BACKUP / SYNC UTILITIES
   */
  sync: {
    async pushAllToSupabase(clients: ClientWeddingSaaS[], currentConfig: WeddingConfig, currentGuests: Guest[], logs: SystemAuditLog[]): Promise<{ success: boolean; message: string }> {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Supabase não está configurado. Insira a URL e a Anon Key nas configurações.' };
      }

      try {
        await supabaseSyncClients(clients);
        await supabaseSyncWeddingConfig(currentConfig.clientId || 'client_1', currentConfig);
        await supabaseSyncGuests(currentConfig.clientId || 'client_1', currentGuests);
        await supabaseSyncAuditLogs(logs);

        return {
          success: true,
          message: 'Todos os clientes, convidados, configurações e logs foram sincronizados com o Supabase com sucesso!'
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Falha na sincronização: ${err?.message || 'Erro desconhecido'}`
        };
      }
    },

    async pullAllFromSupabase(): Promise<{
      clients: ClientWeddingSaaS[] | null;
      config: WeddingConfig | null;
      guests: Guest[] | null;
      logs: SystemAuditLog[] | null;
    }> {
      if (!isSupabaseConfigured()) {
        return { clients: null, config: null, guests: null, logs: null };
      }

      const [clients, config, guests, logs] = await Promise.all([
        supabaseFetchClients(),
        supabaseFetchWeddingConfig('client_1'),
        supabaseFetchGuests('client_1'),
        supabaseFetchAuditLogs()
      ]);

      if (clients) safeSetItem('kutxi_clients', JSON.stringify(sanitizeClientsList(clients)));
      if (config) safeSetItem('kutxi_wedding_config_client_1', JSON.stringify(config));
      if (guests) safeSetItem('kutxi_guests_client_1', JSON.stringify(guests));
      if (logs) safeSetItem('kutxi_audit_logs', JSON.stringify(logs.slice(0, 30)));

      return { clients, config, guests, logs };
    }
  }
};
