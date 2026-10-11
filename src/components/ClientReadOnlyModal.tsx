import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Shield, Users, Calendar, MapPin, CheckCircle2, 
  Clock, AlertTriangle, Key, Copy, Check, ExternalLink, 
  Gift, ListTodo, Building, Image as ImageIcon, Phone, Mail, FileText, Lock
} from 'lucide-react';
import { ClientWeddingSaaS, Guest, WeddingConfig } from '../types';

interface ClientReadOnlyModalProps {
  client: ClientWeddingSaaS | null;
  isOpen: boolean;
  onClose: () => void;
  userAccounts?: { username: string; pass: string; clientId: string; clientName: string }[];
}

export default function ClientReadOnlyModal({ client, isOpen, onClose, userAccounts = [] }: ClientReadOnlyModalProps) {
  if (!isOpen || !client) return null;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'guests' | 'venue' | 'tasks' | 'gifts'>('summary');

  const config: WeddingConfig = client.config;
  
  // Resolve guest list for this specific client from localStorage
  const savedGuestsRaw = localStorage.getItem(`kutxi_guests_${client.id}`) || 
                         (client.id === 'client_1' ? localStorage.getItem('kutxi_guests') : null);
  const clientGuests: Guest[] = savedGuestsRaw ? JSON.parse(savedGuestsRaw) : [];

  const confirmedGuests = clientGuests.filter(g => g.status === 'Confirmed');
  const pendingGuests = clientGuests.filter(g => g.status === 'Pending');
  const declinedGuests = clientGuests.filter(g => g.status === 'Declined');
  const totalAttending = confirmedGuests.reduce((acc, g) => acc + 1 + (g.plusOnesConfirmed ?? g.maxPlusOnes ?? 0), 0);

  // Accounts for this client
  const clientCreds = userAccounts.filter(acc => acc.clientId === client.id);

  // Tasks
  const todoList = config.todoList || [];
  const urgentTasks = todoList.filter(t => t.urgency === 'alta' && !t.completed);
  const completedTasks = todoList.filter(t => t.completed);

  // Gift Registry
  const registryItems = config.giftRegistry?.registryItems || [];

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const weddingDateFormatted = new Date(client.weddingDate || config.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-4xl w-full overflow-hidden my-8 flex flex-col max-h-[90vh]"
      >
        {/* Read-Only Mode Security Banner */}
        <div className="bg-slate-900 text-slate-100 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Modo Somente Leitura (Super Administrador)</span>
            <span className="hidden sm:inline text-slate-400 font-normal ml-1">
              — Acesso de consulta irrestrita sem permissão de alteração
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Client Identity Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 p-6 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-serif font-bold text-xl">
              {config.brideGroom?.brideName?.charAt(0) || client.clientName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-display font-bold text-white">
                  {client.clientName}
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  client.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  client.status === 'Trial' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {client.status === 'Active' ? '✓ Ativo / Pago' : client.status === 'Trial' ? '⏳ Aguardando Pagamento' : '✗ Expirado'}
                </span>
              </div>
              <p className="text-xs text-rose-200/80 font-medium mt-0.5">
                Data do Casamento: {weddingDateFormatted} • Plano Contratado: <strong>{client.plan}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`?clientId=${client.id}&invite=preview`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-300" />
              Ver Convite Público
            </a>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          {[
            { id: 'summary', label: 'Visão Geral & Login', icon: FileText },
            { id: 'guests', label: `Convidados (${clientGuests.length})`, icon: Users },
            { id: 'venue', label: 'Espaço & Local', icon: Building },
            { id: 'tasks', label: `Tarefas (${todoList.length})`, icon: ListTodo },
            { id: 'gifts', label: `Presentes (${registryItems.length})`, icon: Gift }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id 
                  ? 'border-rose-800 text-rose-800 bg-white shadow-2xs rounded-t-lg' 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 text-xs">
          
          {/* TAB: SUMMARY & LOGIN */}
          {activeSubTab === 'summary' && (
            <div className="space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Convidados</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">{clientGuests.length}</div>
                  <span className="text-[10px] text-slate-500">{totalAttending} presentes esperados</span>
                </div>
                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Confirmados (RSVP)</span>
                  <div className="text-xl font-bold text-emerald-800 mt-1">{confirmedGuests.length}</div>
                  <span className="text-[10px] text-emerald-600">Presenças garantidas</span>
                </div>
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Pendentes</span>
                  <div className="text-xl font-bold text-amber-800 mt-1">{pendingGuests.length}</div>
                  <span className="text-[10px] text-amber-600">Aguardando resposta</span>
                </div>
                <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl">
                  <span className="text-[10px] text-rose-700 font-bold uppercase block">Tarefas Concluídas</span>
                  <div className="text-xl font-bold text-rose-800 mt-1">
                    {todoList.length > 0 ? `${Math.round((completedTasks.length / todoList.length) * 100)}%` : '100%'}
                  </div>
                  <span className="text-[10px] text-rose-600">{completedTasks.length} de {todoList.length} itens</span>
                </div>
              </div>

              {/* Login Credentials & Client Contacts */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-rose-800" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Credenciais de Acesso do Casal</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Contas geradas no cadastro</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clientCreds.length > 0 ? clientCreds.map((cred, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                        <span>Usuário {idx + 1}</span>
                        <button
                          onClick={() => handleCopy(`Usuário: ${cred.username} | Senha: ${cred.pass}`, `cred_${idx}`)}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer font-sans"
                        >
                          {copiedKey === `cred_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === `cred_${idx}` ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="font-mono text-xs">
                        <div className="text-slate-800"><strong className="font-semibold text-slate-500">Login:</strong> {cred.username}</div>
                        <div className="text-amber-700 font-bold mt-0.5"><strong className="font-semibold text-slate-500">Senha:</strong> {cred.pass}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-slate-400 italic p-3">Nenhuma credencial gerada separadamente para este locatário.</div>
                  )}
                </div>
              </div>

              {/* General Config Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-150 rounded-2xl space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">Informações da Cerimônia</h4>
                  <div className="space-y-1 text-slate-600">
                    <div><strong>Noiva:</strong> {config.brideGroom?.brideName} ({config.brideGroom?.brideFullName || config.brideGroom?.brideName})</div>
                    <div><strong>Noivo:</strong> {config.brideGroom?.groomName} ({config.brideGroom?.groomFullName || config.brideGroom?.groomName})</div>
                    <div><strong>Data & Hora:</strong> {new Date(config.date).toLocaleString('pt-BR')}</div>
                    <div><strong>E-mail:</strong> {client.clientEmail}</div>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-150 rounded-2xl space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">Configuração Visual & Tema</h4>
                  <div className="space-y-1 text-slate-600">
                    <div><strong>Tema Ativo:</strong> {config.theme?.name || 'Clássico Ouro'}</div>
                    <div><strong>Mensagem aos Convidados:</strong> "{config.customFooter || 'Com amor, sempre.'}"</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GUESTS LIST */}
          {activeSubTab === 'guests' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Lista Completa de Convidados</h4>
                <span className="text-[10px] text-slate-400">{clientGuests.length} convidados no cadastro</span>
              </div>

              {clientGuests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">O casal ainda não adicionou convidados.</div>
              ) : (
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-150">
                      <tr>
                        <th className="p-3">Convidado</th>
                        <th className="p-3">Mesa / Categoria</th>
                        <th className="p-3">Status RSVP</th>
                        <th className="p-3">Acompanhantes</th>
                        <th className="p-3">Check-In Portaria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {clientGuests.map(g => (
                        <tr key={g.id} className="hover:bg-slate-50/60">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{g.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{g.phone || g.email || 'Sem contato'}</div>
                          </td>
                          <td className="p-3 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-semibold">{g.group}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">Mesa: {g.tableNumber || 'Não atribuída'}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              g.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              g.status === 'Declined' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {g.status === 'Confirmed' ? 'Confirmado' : g.status === 'Declined' ? 'Recusado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            +{g.plusOnesConfirmed ?? g.maxPlusOnes ?? 0}
                          </td>
                          <td className="p-3">
                            {g.checkedIn ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: VENUE */}
          {activeSubTab === 'venue' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-rose-800" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{config.venue?.ceremonyName || 'Espaço do Evento'}</h4>
                      <p className="text-xs text-slate-400">{config.venue?.ceremonyAddress || 'Localização a definir'}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-2xs">
                    Capacidade: {config.venue?.capacity || 200} convidados
                  </span>
                </div>
              </div>

              {/* Photos */}
              {config.venue?.photos && config.venue.photos.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-700 block">Fotos do Espaço Cadastrado:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {config.venue.photos.map((photo, i) => (
                      <div key={i} className="h-32 rounded-xl overflow-hidden border border-slate-200">
                        <img src={photo} alt={`Venue ${i}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: TASKS */}
          {activeSubTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Lista de Afazeres do Casamento</h4>
                <span className="text-[10px] text-slate-400">{completedTasks.length} de {todoList.length} concluídas</span>
              </div>

              {todoList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">Nenhuma tarefa criada.</div>
              ) : (
                <div className="space-y-2">
                  {todoList.map(task => (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        task.completed 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : task.urgency === 'alta' 
                          ? 'bg-rose-50/40 border-rose-200' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center text-white ${task.completed ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                          {task.completed && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {task.label}
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.urgency === 'alta' ? 'bg-rose-100 text-rose-800' :
                        task.urgency === 'media' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {task.urgency === 'alta' ? 'Urgente ⚠️' : task.urgency === 'media' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GIFTS */}
          {activeSubTab === 'gifts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Lista de Presentes do Casal</h4>
                <span className="text-[10px] text-slate-400">{registryItems.length} presentes cadastrados</span>
              </div>

              {registryItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic">Nenhum presente cadastrado pelo casal.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {registryItems.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover bg-white" />
                      <div className="flex-1">
                        <div className="font-bold text-xs text-slate-900">{item.name}</div>
                        <div className="text-rose-800 font-bold text-xs">{item.price.toLocaleString('pt-AO')} Kz</div>
                        {item.claimedBy && (
                          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Presenteado por: {item.claimedBy}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar Visualização
          </button>
        </div>

      </motion.div>
    </div>
  );
}
