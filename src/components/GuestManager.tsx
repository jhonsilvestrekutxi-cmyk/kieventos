import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Search, Filter, Plus, Trash2, Edit, CheckCircle, 
  XCircle, Clock, Download, Upload, QrCode, Mail, 
  ChevronRight, Eye, Check, X, Tag, BookOpen, AlertCircle, MessageCircle, FileText
} from 'lucide-react';
import { Guest, GuestGroup, WeddingConfig } from '../types';
import { downloadWeddingPdf, sendInviteViaWhatsApp } from '../utils/pdfGenerator';
import { INITIAL_WEDDING_CONFIG } from '../data/defaultConfig';
import { generateQrDataUrl } from '../utils/qrCodeHelper';

interface GuestManagerProps {
  guests: Guest[];
  onAddGuest: (guest: Guest) => void;
  onUpdateGuest: (updatedGuest: Guest) => void;
  onDeleteGuest: (id: string) => void;
  onBulkStatusUpdate: (ids: string[], status: 'Confirmed' | 'Pending' | 'Declined') => void;
  clientId?: string;
  config?: WeddingConfig;
}

export default function GuestManager({ 
  guests, 
  onAddGuest, 
  onUpdateGuest, 
  onDeleteGuest,
  onBulkStatusUpdate,
  clientId = 'client_1',
  config = INITIAL_WEDDING_CONFIG
}: GuestManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Guest | null>(null);
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');
  const [guestToDeleteId, setGuestToDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (showQrModal?.rsvpToken) {
      generateQrDataUrl(`rsvp:${showQrModal.rsvpToken}`, 160)
        .then(url => setModalQrCodeUrl(url))
        .catch(() => setModalQrCodeUrl(''));
    } else {
      setModalQrCodeUrl('');
    }
  }, [showQrModal]);

  // New guest form state
  const [newGuest, setNewGuest] = useState<Partial<Guest>>({
    name: '',
    email: '',
    phone: '',
    group: 'Friends',
    tableNumber: 'Mesa 1',
    maxPlusOnes: 1,
    status: 'Pending',
    dietaryRequirements: '',
    notes: ''
  });

  // Filter and search calculations
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === 'All' || guest.group === groupFilter;
    const matchesStatus = statusFilter === 'All' || guest.status === statusFilter;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  // Unique groups for filtering
  const groups: GuestGroup[] = ['Family', 'Friends', 'VIP', 'Bride Side', 'Groom Side', 'Children', 'Corporate'];

  const getPortugueseGroupLabel = (group: string) => {
    const mapping: Record<string, string> = {
      'Family': 'Família',
      'Friends': 'Amigos',
      'VIP': 'Convidado VIP',
      'Bride Side': 'Família da Noiva',
      'Groom Side': 'Família do Noivo',
      'Children': 'Crianças',
      'Corporate': 'Trabalho / Corp'
    };
    return mapping[group] || group;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGuests(filteredGuests.map(g => g.id));
    } else {
      setSelectedGuests([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedGuests(prev => [...prev, id]);
    } else {
      setSelectedGuests(prev => prev.filter(gid => gid !== id));
    }
  };

  const handleSubmitNewGuest = (e: FormEvent) => {
    e.preventDefault();
    if (!newGuest.name) return;

    // Generate token elegantly from the name
    const cleanName = (newGuest.name || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9 ]/g, '') // remove non alphanumeric
      .replace(/\s+/g, '-');
    const token = cleanName + '-' + Math.floor(Math.random() * 10000);

    const guestToAdd: Guest = {
      id: 'g_' + Date.now(),
      name: newGuest.name || '',
      email: newGuest.email || '',
      phone: newGuest.phone || '',
      group: (newGuest.group as GuestGroup) || 'Friends',
      tableNumber: newGuest.tableNumber || 'Sem Mesa',
      maxPlusOnes: Number(newGuest.maxPlusOnes) || 0,
      plusOnesConfirmed: 0,
      status: (newGuest.status as any) || 'Pending',
      dietaryRequirements: newGuest.dietaryRequirements || '',
      rsvpToken: token,
      invitationViews: 0,
      checkedIn: false,
      notes: newGuest.notes || ''
    };

    onAddGuest(guestToAdd);
    setShowAddModal(false);
    // Reset form
    setNewGuest({
      name: '',
      email: '',
      phone: '',
      group: 'Friends',
      tableNumber: 'Mesa 1',
      maxPlusOnes: 1,
      status: 'Pending',
      dietaryRequirements: '',
      notes: ''
    });
  };

  const handleSimulateCSVImport = () => {
    // Inject mock guests as CSV simulation
    const bulkMockGuests: Guest[] = [
      {
        id: 'g_bulk1',
        name: 'Isabella Montgomery (Madrinha de Honra)',
        email: 'isabella.m@example.com',
        phone: '+351 912 555 881',
        group: 'Bride Side',
        tableNumber: 'Mesa 1 (VIP)',
        maxPlusOnes: 1,
        plusOnesConfirmed: 0,
        status: 'Pending',
        rsvpToken: 'isabella-montgomery-bridesmaid',
        invitationViews: 1,
        checkedIn: false
      },
      {
        id: 'g_bulk2',
        name: 'Alexander Vance',
        email: 'alexander.vance@example.com',
        phone: '+351 912 555 882',
        group: 'Family',
        tableNumber: 'Mesa 2',
        maxPlusOnes: 2,
        plusOnesConfirmed: 0,
        status: 'Pending',
        rsvpToken: 'alexander-vance-brother',
        invitationViews: 0,
        checkedIn: false
      }
    ];
    bulkMockGuests.forEach(g => onAddGuest(g));
    showToast('Simulação de Importação: 2 convidados importados com sucesso!');
  };

  return (
    <div className="space-y-6 relative" id="guest-management-section">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-3 rounded-xl shadow-2xl border border-rose-500/30 flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* CARD: LINK DA PORTARIA */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-rose-400 bg-rose-950 border border-rose-900/60 px-2.5 py-1 rounded-md inline-block">
              Controle de Entrada (Portaria)
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-950 px-2 py-1 rounded-md font-semibold font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Acesso Sem Senha Ativo
            </span>
          </div>
          <h3 className="font-display font-bold text-white text-sm">Geração de Link Seguro para a Portaria</h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Copie o link seguro abaixo e envie para os porteiros ou equipe do cerimonial. Eles poderão escanear passes de QR Code, buscar convidados manualmente e acompanhar o histórico de acessos sem precisar de uma conta.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              const url = `${window.location.origin}/?portaria=${clientId}`;
              navigator.clipboard.writeText(url);
              showToast('✓ Link seguro da Portaria copiado para a área de transferência! Envie para a equipe do evento.');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-800 hover:bg-rose-950 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <QrCode className="w-3.5 h-3.5" />
            Copiar Link da Portaria
          </button>
        </div>
      </div>

      {/* Search and Action Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pesquise por nome, e-mail ou número de telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs focus:outline-rose-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Add manual guest */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Convidado
            </button>

            {/* Simulated CSV Import */}
            <button
              onClick={handleSimulateCSVImport}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Upload de lista excel ou csv"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar CSV
            </button>

            <a
              href="data:text/csv;charset=utf-8,Nome,Email,Phone,Group,TableNumber,MaxPlusOnes%0AMaria%20Silva,maria@example.com,%2B351912555000,Bride%20Side,Mesa%201,1"
              download="Kutxi_Modelo_Convidados.csv"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
              title="Baixar planilha modelo de exemplo"
            >
              <Download className="w-3.5 h-3.5" />
              Modelo CSV
            </a>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">Filtros rápidos:</span>
            </div>

            {/* Group select */}
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-md text-xs text-slate-600 focus:outline-rose-800"
            >
              <option value="All">Todos os Grupos</option>
              {groups.map(g => (
                <option key={g} value={g}>{getPortugueseGroupLabel(g)}</option>
              ))}
            </select>

            {/* Status select */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-md text-xs text-slate-600 focus:outline-rose-800"
            >
              <option value="All">Todos os RSVPs</option>
              <option value="Confirmed">Confirmados</option>
              <option value="Pending">Pendentes</option>
              <option value="Declined">Recusados</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Exibindo {filteredGuests.length} de {guests.length} convidados totais
          </div>
        </div>
      </div>

      {/* Bulk actions banner */}
      {selectedGuests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 text-white p-3.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            <span className="font-medium"><strong className="text-rose-400">{selectedGuests.length}</strong> convidados selecionados</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onBulkStatusUpdate(selectedGuests, 'Confirmed');
                setSelectedGuests([]);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-semibold cursor-pointer"
            >
              Confirmar Presença
            </button>
            <button
              onClick={() => {
                onBulkStatusUpdate(selectedGuests, 'Declined');
                setSelectedGuests([]);
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded font-semibold cursor-pointer"
            >
              Recusar Selecionados
            </button>
            <button
              onClick={() => setBulkDeleteConfirmation(true)}
              className="bg-rose-900 hover:bg-rose-800 text-white px-3 py-1.5 rounded font-semibold cursor-pointer"
            >
              Remover Selecionados
            </button>
          </div>
        </motion.div>
      )}

      {/* Guests Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-4 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredGuests.length > 0 && selectedGuests.length === filteredGuests.length}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded text-rose-800 focus:ring-rose-800"
                  />
                </th>
                <th className="py-4 px-4">Informações do Convidado</th>
                <th className="py-4 px-4">Grupo</th>
                <th className="py-4 px-4">Mesa Designada</th>
                <th className="py-4 px-4">Visualizações</th>
                <th className="py-4 px-4">Status RSVP</th>
                <th className="py-4 px-4">Entrada no Evento</th>
                <th className="py-4 px-4 text-right pr-6">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Nenhum convidado do casamento corresponde aos filtros ativos.
                  </td>
                </tr>
              ) : (
                filteredGuests.map(guest => (
                  <tr key={guest.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Checkbox select */}
                    <td className="py-4 px-5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedGuests.includes(guest.id)}
                        onChange={e => handleSelectOne(guest.id, e.target.checked)}
                        className="rounded text-rose-800 focus:ring-rose-800"
                      />
                    </td>

                    {/* Guest Contact */}
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-slate-900">{guest.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Mail className="w-3 h-3" />
                          {guest.email || 'E-mail não cadastrado'}
                        </div>
                        {guest.dietaryRequirements && (
                          <div className="text-[9px] text-rose-800 bg-rose-50 border border-rose-150 px-1.5 py-0.5 rounded inline-block mt-1 font-medium">
                            Restrição: {guest.dietaryRequirements}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Group Tag */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {getPortugueseGroupLabel(guest.group)}
                      </span>
                    </td>

                    {/* Table seating */}
                    <td className="py-4 px-4">
                      <span className="font-mono text-slate-600 font-bold">{guest.tableNumber}</span>
                    </td>

                    {/* Views stats */}
                    <td className="py-4 px-4 text-slate-500 font-mono">
                      {guest.invitationViews} acessos
                    </td>

                    {/* RSVP Status */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        guest.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        guest.status === 'Declined' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {guest.status === 'Confirmed' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : 
                         guest.status === 'Declined' ? <XCircle className="w-3 h-3 text-slate-500" /> : 
                         <Clock className="w-3 h-3 text-amber-600" />}
                        {guest.status === 'Confirmed' ? 'Confirmado' : guest.status === 'Declined' ? 'Recusado' : 'Pendente'}
                        {guest.status === 'Confirmed' && guest.plusOnesConfirmed > 0 && ` (+${guest.plusOnesConfirmed})`}
                      </span>
                    </td>

                    {/* Arrival checkedIn */}
                    <td className="py-4 px-4">
                      {guest.checkedIn ? (
                        <div className="text-emerald-700 flex items-center gap-1 font-bold text-[10px]">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Entrada Liberada
                        </div>
                      ) : (
                        <div className="text-slate-400 flex items-center gap-1 text-[10px]">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando
                        </div>
                      )}
                    </td>

                    {/* Direct Actions */}
                    <td className="py-4 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp direct send */}
                        <button
                          onClick={() => sendInviteViaWhatsApp(config, guest)}
                          title="Enviar Convite Personalizado no WhatsApp"
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                        </button>

                        {/* QR Code view */}
                        <button
                          onClick={() => setShowQrModal(guest)}
                          title="Gerar Passe Digital & Link WhatsApp"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            const newStatus = guest.status === 'Confirmed' ? 'Declined' : 'Confirmed';
                            onUpdateGuest({ ...guest, status: newStatus, confirmedAt: newStatus === 'Confirmed' ? new Date().toISOString() : undefined });
                          }}
                          title="Alternar status rapidamente"
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            guest.status === 'Confirmed' ? 'bg-rose-50 text-rose-800 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {guest.status === 'Confirmed' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => setGuestToDeleteId(guest.id)}
                          title="Excluir Convidado"
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-800 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Guest */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-150 p-6 w-full max-w-md space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-800" />
                  Adicionar Convidado Manualmente
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewGuest} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nome Completo (Chefe da Família / Individual) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sr. Arthur Jenkins"
                    value={newGuest.name}
                    onChange={e => setNewGuest(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="nome@email.com"
                      value={newGuest.email}
                      onChange={e => setNewGuest(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Telefone / Celular</label>
                    <input
                      type="tel"
                      placeholder="+351 912 555 123"
                      value={newGuest.phone}
                      onChange={e => setNewGuest(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-slate-400 font-medium mb-1">Grupo</label>
                    <select
                      value={newGuest.group}
                      onChange={e => setNewGuest(prev => ({ ...prev, group: e.target.value as any }))}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    >
                      {groups.map(g => (
                        <option key={g} value={g}>{getPortugueseGroupLabel(g)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-400 font-medium mb-1">Mesa</label>
                    <input
                      type="text"
                      placeholder="Mesa 1"
                      value={newGuest.tableNumber}
                      onChange={e => setNewGuest(prev => ({ ...prev, tableNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-slate-400 font-medium mb-1">Máx Acompanhantes</label>
                    <input
                      type="number"
                      min="0"
                      value={newGuest.maxPlusOnes}
                      onChange={e => setNewGuest(prev => ({ ...prev, maxPlusOnes: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Restrições Alimentares / Alergias</label>
                  <input
                    type="text"
                    placeholder="Ex: Vegetariano, Sem glúten"
                    value={newGuest.dietaryRequirements}
                    onChange={e => setNewGuest(prev => ({ ...prev, dietaryRequirements: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Notas Internas de Organização</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Padrinho do noivo, amigo de infância."
                    value={newGuest.notes}
                    onChange={e => setNewGuest(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-rose-800 bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Salvar Convidado
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Unique Guest QR Invitation */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-150 p-6 w-full max-w-sm text-center space-y-4"
            >
              <div className="flex justify-end">
                <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Luxury QR Ticket */}
              <div className="border border-slate-100 rounded-2xl p-5 bg-stone-50 space-y-4">
                <span className="font-display tracking-widest text-[9px] uppercase text-slate-400 font-bold block">Passe Digital Exclusivo</span>
                
                {/* Visual QR Code representing ticket pass */}
                <div className="w-36 h-36 bg-white border border-slate-200 rounded-xl mx-auto flex items-center justify-center p-2">
                  <img
                    src={modalQrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=rsvp:${showQrModal.rsvpToken}`}
                    alt="QR Code RSVP"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div>
                  <h4 className="font-display font-medium text-slate-800 text-sm tracking-wide">{showQrModal.name}</h4>
                  <p className="text-[10px] text-rose-800 font-semibold mt-1">Token de Convite: {showQrModal.rsvpToken}</p>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3 grid grid-cols-2 gap-2 text-left text-[10px] text-slate-500 font-medium">
                  <div>
                    <span>Mesa Designada:</span>
                    <strong className="block text-slate-800 font-mono mt-0.5">{showQrModal.tableNumber}</strong>
                  </div>
                  <div>
                    <span>Limite Acompanhantes:</span>
                    <strong className="block text-slate-800 font-mono mt-0.5">Máx {showQrModal.maxPlusOnes}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-left pt-1">
                <label className="block text-slate-500 font-semibold text-xs">Link Individual do Convidado</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=${showQrModal.rsvpToken}&clientId=${clientId}`}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite=${showQrModal.rsvpToken}&clientId=${clientId}`);
                      showToast('✓ Link individual do convite copiado com sucesso!');
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-colors"
                  >
                    Copiar
                  </button>
                </div>

                {/* Direct Action Buttons: WhatsApp & PDF Download */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => sendInviteViaWhatsApp(config, showQrModal)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadWeddingPdf(config, showQrModal)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Single Guest Deletion Confirmation */}
      <AnimatePresence>
        {guestToDeleteId && (() => {
          const guest = guests.find(g => g.id === guestToDeleteId);
          if (!guest) return null;
          return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl border border-slate-150 p-6 w-full max-w-sm text-center space-y-4"
              >
                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-800 border border-rose-100">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-lg text-slate-900 font-medium">Excluir Convidado</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tem certeza de que deseja excluir permanentemente o convidado <strong className="text-slate-800 font-semibold">{guest.name}</strong>? Esta ação removerá sua mesa designada e passe digital.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setGuestToDeleteId(null)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onDeleteGuest(guestToDeleteId);
                      setGuestToDeleteId(null);
                    }}
                    className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL: Bulk Guests Deletion Confirmation */}
      <AnimatePresence>
        {bulkDeleteConfirmation && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-150 p-6 w-full max-w-sm text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-800 border border-rose-100">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-lg text-slate-900 font-medium">Excluir {selectedGuests.length} Convidados</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza de que deseja remover permanentemente os <strong className="text-slate-800 font-semibold">{selectedGuests.length}</strong> convidados selecionados em lote? Esta ação é irreversível.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setBulkDeleteConfirmation(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    selectedGuests.forEach(id => onDeleteGuest(id));
                    setSelectedGuests([]);
                    setBulkDeleteConfirmation(false);
                  }}
                  className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md"
                >
                  Excluir Tudo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
