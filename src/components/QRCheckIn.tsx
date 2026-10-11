import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, Search, UserCheck, ShieldAlert, CheckCircle, 
  MapPin, Clock, Users, ArrowRight, Play, RefreshCw, X,
  Camera, CameraOff, AlertTriangle, Check, Link2, Copy
} from 'lucide-react';
import { Guest } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCheckInProps {
  guests: Guest[];
  onCheckIn: (id: string, plusOnesCount: number) => void;
  clientId: string;
}

export interface CheckInLog {
  id: string;
  name: string;
  table: string;
  timestamp: string;
  plusOnes: number;
}

export default function QRCheckIn({ guests, onCheckIn, clientId }: QRCheckInProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScanGuestId, setSelectedScanGuestId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Guest | null>(null);
  const [logHistory, setLogHistory] = useState<CheckInLog[]>([]);
  const [errorText, setErrorText] = useState('');

  // Dual-mode: 'simulate' | 'camera'
  const [scanMode, setScanMode] = useState<'simulate' | 'camera'>('simulate');
  
  // Real Camera States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [scanningError, setScanningError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Sync logHistory with currently checked-in guests
  useEffect(() => {
    const checkedIn = guests
      .filter(g => g.checkedIn)
      .map(g => ({
        id: 'l_' + g.id,
        name: g.name,
        table: g.tableNumber,
        timestamp: g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
        plusOnes: g.plusOnesConfirmed
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setLogHistory(checkedIn);
  }, [guests]);

  // Clean default list of unconfirmed guests for simulation dropdown
  const eligibleGuests = guests.filter(g => g.status === 'Confirmed' && !g.checkedIn);

  // Watch scanMode changes to toggle camera active state
  useEffect(() => {
    if (scanMode === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [scanMode]);

  const startCameraScanner = async () => {
    setErrorText('');
    setScanningError('');
    setIsScanning(true);
    setScanResult(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não oferece suporte para acesso a câmeras.");
      }

      // 1. Proactive mobile parameters test (Rear camera environment track validation)
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // posterior / traseira
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Release immediately so HTML5Qrcode can bind to the device camera
      testStream.getTracks().forEach(track => track.stop());

      // 2. Check viewport DOM existence
      const elementId = "qr-reader-viewport-dashboard";
      const element = document.getElementById(elementId);
      if (!element) return;

      // 3. Clear running scanners
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      // 4. Instantiate HTML5Qrcode
      const scanner = new Html5Qrcode(elementId);
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 20,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            return {
              width: Math.floor(minSize * 0.75),
              height: Math.floor(minSize * 0.75)
            };
          }
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {
          // Silent frame tracking failures
        }
      );

      setCameraActive(true);
      setCameraPermission('granted');
      setIsScanning(false);
    } catch (err: any) {
      console.warn("Camera check-in portal load failed:", err);
      setCameraActive(false);
      setIsScanning(false);
      setCameraPermission('denied');

      let explanation = "Dispositivo de vídeo indisponível.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        explanation = "Acesso negado! No iOS/Safari: Acesse Ajustes > Safari > Câmera e marque 'Permitir'. No Android/Chrome: Toque no cadeado na barra de endereços e ative a permissão de câmera.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        explanation = "Nenhuma câmera traseira de foco posterior foi detectada neste dispositivo.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        explanation = "A câmera está ocupada por outra aba ou aplicativo. Feche-os e tente novamente.";
      } else if (err.name === 'OverconstrainedError') {
        explanation = "Hardware de câmera incompatível com as restrições de alto desempenho solicitadas.";
      } else if (err.message) {
        explanation = err.message;
      }

      setScanningError(explanation);
    }
  };

  const stopCameraScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (e) {
        console.error("Error shutting down camera scanner:", e);
      }
    }
    setCameraActive(false);
  };

  const handleQrDecoded = (text: string) => {
    let token = text.trim();
    if (token.startsWith('rsvp:')) {
      token = token.replace('rsvp:', '');
    }

    const norm = (t: string) => (t || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    const guest = guests.find(g => 
      norm(g.rsvpToken) === norm(token) || 
      g.id.toLowerCase() === token.toLowerCase()
    );

    if (guest) {
      if (guest.checkedIn) {
        setErrorText(`Aviso: O convidado "${guest.name}" já realizou check-in!`);
      } else {
        onCheckIn(guest.id, guest.maxPlusOnes);
        setScanResult(guest);
        setErrorText('');
        
        const log: CheckInLog = {
          id: 'l_' + Date.now(),
          name: guest.name,
          table: guest.tableNumber,
          timestamp: new Date().toLocaleTimeString(),
          plusOnes: guest.maxPlusOnes
        };
        setLogHistory(prev => [log, ...prev]);
        stopCameraScanner();
      }
    } else {
      setErrorText(`QR Code inválido ou não cadastrado (${token}).`);
    }
  };

  const handleSimulateScan = () => {
    if (!selectedScanGuestId) {
      setErrorText('Selecione o convite de um convidado para simular o escaneamento.');
      return;
    }

    setErrorText('');
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      const guest = guests.find(g => g.id === selectedScanGuestId);
      if (guest) {
        onCheckIn(guest.id, guest.maxPlusOnes);
        setScanResult(guest);

        const log: CheckInLog = {
          id: 'l_' + Date.now(),
          name: guest.name,
          table: guest.tableNumber,
          timestamp: new Date().toLocaleTimeString(),
          plusOnes: guest.maxPlusOnes
        };
        setLogHistory(prev => [log, ...prev]);
        setSelectedScanGuestId(''); // Reset select
      }
    }, 1200);
  };

  const handleManualCheckIn = (guest: Guest) => {
    onCheckIn(guest.id, guest.maxPlusOnes);
    const log: CheckInLog = {
      id: 'l_' + Date.now(),
      name: guest.name,
      table: guest.tableNumber,
      timestamp: new Date().toLocaleTimeString(),
      plusOnes: guest.maxPlusOnes
    };
    setLogHistory(prev => [log, ...prev]);
    setScanResult(guest);
    setErrorText('');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?portaria=true&clientId=${clientId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredManualGuests = guests.filter(g => 
    !g.checkedIn && g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="wedding-event-checkin">
      
      {/* EXCLUSIVE PORTEIRO LINK GENERATOR CARD */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-950 p-5 rounded-2xl border border-stone-800 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 md:max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest font-bold text-rose-300 bg-rose-950/40 border border-rose-900/30 px-2 py-0.5 rounded-full inline-block">
              Acreditação & Portaria Externa
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h4 className="font-serif font-medium text-stone-100 text-sm flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-rose-400" />
            🔗 Link de Acesso Exclusivo para Porteiros e Recepcionistas
          </h4>
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Compartilhe este link seguro com a equipe de portaria. Ao abrir, o navegador será direcionado <strong>diretamente para o painel de leitura</strong>, com os menus SaaS e opções administrativas totalmente bloqueados por razões de segurança.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0 md:max-w-xs w-full">
          <input 
            type="text" 
            readOnly 
            value={`${window.location.origin}?portaria=true&clientId=${clientId}`}
            className="flex-1 px-3 py-1.5 bg-stone-950 text-stone-300 border border-stone-800 rounded-lg text-[11px] font-mono select-all focus:outline-none focus:border-rose-800"
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SCANNING STATION (7 Columns) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="font-display font-medium text-slate-800 text-base">Validador de Acesso de Convidados</h3>
              <p className="text-xs text-slate-400">Selecione o modo de validação para registrar a chegada dos convidados</p>
            </div>

            {/* SCAN MODE TOGGLE BAR */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0 self-start sm:self-center">
              <button
                onClick={() => setScanMode('simulate')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scanMode === 'simulate' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Play className="w-3 h-3 text-rose-700" />
                Simulador
              </button>
              <button
                onClick={() => setScanMode('camera')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scanMode === 'camera' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-3 h-3 text-rose-700" />
                Câmera Real
              </button>
            </div>
          </div>

          {/* Holographic / Camera Viewport */}
          <div className="relative aspect-video max-w-md mx-auto w-full bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 shadow-xl border border-slate-900">
            
            {/* Real HTML5 QR Reader viewport when in camera mode */}
            <div 
              id="qr-reader-viewport-dashboard"
              className={`absolute inset-0 w-full h-full object-cover z-0 ${scanMode === 'camera' && cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Laser beam scanner graphic */}
            {((scanMode === 'simulate' && isScanning) || (scanMode === 'camera' && cameraActive)) && (
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.8)] z-10 pointer-events-none"
              />
            )}

            {/* Matrix red scanner corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-rose-500 z-10 pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-rose-500 z-10 pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-rose-500 z-10 pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-rose-500 z-10 pointer-events-none"></div>

            {/* Interactive display */}
            <AnimatePresence mode="wait">
              {scanMode === 'simulate' && isScanning ? (
                <motion.div
                  key="sim-scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-3 z-10 bg-slate-950/80 p-4 rounded-xl border border-slate-800"
                >
                  <QrCode className="w-16 h-16 text-rose-500 animate-pulse mx-auto" />
                  <div className="text-xs font-mono font-bold text-rose-400 tracking-wider">PROCURANDO PASSE DE ENTRADA...</div>
                  <div className="text-[10px] text-slate-500">Lendo chave única de validação do RSVP</div>
                </motion.div>
              ) : scanMode === 'camera' && isScanning && !cameraActive ? (
                <motion.div
                  key="cam-starting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-3 z-10 bg-slate-950/80 p-4 rounded-xl border border-slate-800"
                >
                  <RefreshCw className="w-12 h-12 text-rose-500 animate-spin mx-auto" />
                  <div className="text-xs font-mono font-bold text-rose-400 tracking-wider">INICIANDO CÂMERA...</div>
                  <div className="text-[10px] text-slate-400">Testando dispositivo de captura traseiro de alta performance</div>
                </motion.div>
              ) : scanResult ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center space-y-3 z-10 text-white p-5 w-full bg-slate-950/90 rounded-2xl border border-emerald-500/25 max-w-sm shadow-xl"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-display text-sm font-bold tracking-wide text-white">{scanResult.name}</div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-block">
                      Acesso Liberado • Confirmado ✓
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-left text-xs text-slate-400">
                    <div>
                      <span className="text-[9px] block text-slate-500 uppercase font-semibold">Mesa Designada</span>
                      <strong className="text-white font-mono text-xs">{scanResult.tableNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] block text-slate-500 uppercase font-semibold">Tamanho da Família</span>
                      <strong className="text-white font-mono text-xs">{1 + scanResult.plusOnesConfirmed} Pessoa(s)</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setScanResult(null);
                      if (scanMode === 'camera') startCameraScanner();
                    }}
                    className="mt-4 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Escanear Próximo
                  </button>
                </motion.div>
              ) : scanMode === 'camera' && !cameraActive ? (
                <motion.div
                  key="cam-error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4 z-10 text-slate-400 p-6 max-w-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-rose-400">Falha na Inicialização da Câmera</div>
                    <p className="text-[10px] text-slate-400 leading-relaxed text-center font-medium">
                      {scanningError || "Permissão negada ou hardware de vídeo indisponível."}
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={startCameraScanner}
                      className="px-4 py-1.5 bg-rose-950/50 border border-rose-800/40 text-rose-300 hover:bg-rose-900 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Tentar Reativar Câmera
                    </button>
                  </div>
                </motion.div>
              ) : scanMode === 'camera' && cameraActive ? (
                /* Native Camera Frame Guideline Box */
                <div className="absolute inset-0 border-[35px] border-slate-950/65 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-white/40 text-[9px] font-mono tracking-widest text-center uppercase">
                    Posicione o QR Code aqui
                  </div>
                </div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4 z-10 text-slate-400 p-4"
                >
                  <QrCode className="w-14 h-14 text-slate-700 mx-auto" />
                  <div className="text-xs font-semibold">Leitor de Portaria Pronto</div>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                    Selecione o convite digital de um convidado na caixa abaixo para simular a validação por QR code.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scan Controls depending on Mode */}
          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
            {scanMode === 'simulate' ? (
              <div className="space-y-3">
                <label className="block text-slate-400 font-medium text-[10px] uppercase font-semibold tracking-wider">
                  Simulador de Leitura Móvel (Testes rápidos sem câmera)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedScanGuestId}
                    onChange={e => setSelectedScanGuestId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:outline-rose-800"
                  >
                    <option value="">-- Escolha o Convite de Teste --</option>
                    {eligibleGuests.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.group}) • Mesa: {g.tableNumber}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleSimulateScan}
                    disabled={isScanning || !selectedScanGuestId}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Simular
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span>{cameraActive ? 'Câmera operacional conectada' : 'Aguardando concessão de câmera'}</span>
                </div>
                {cameraActive && (
                  <button
                    onClick={stopCameraScanner}
                    className="text-[10px] text-rose-800 hover:text-rose-950 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CameraOff className="w-3 h-3" />
                    Desligar Câmera
                  </button>
                )}
              </div>
            )}
            {errorText && (
              <div className="text-[10px] text-rose-800 font-bold mt-2.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{errorText}</span>
              </div>
            )}
          </div>
        </div>

        {/* MANUAL LOOKUP & REALTIME LOGS (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Manual search and checkin */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              Check-In Manual (Busca Rápida)
            </h4>
            
            <input
              type="text"
              placeholder="Digite o nome do convidado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs focus:outline-rose-800"
            />

            <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-50">
              {filteredManualGuests.length === 0 ? (
                <div className="text-[11px] text-slate-400 text-center py-4">Nenhum convidado pendente de check-in.</div>
              ) : (
                filteredManualGuests.slice(0, 5).map(guest => (
                  <div key={guest.id} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{guest.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{guest.group} • {guest.tableNumber}</span>
                    </div>
                    <button
                      onClick={() => handleManualCheckIn(guest)}
                      className="flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded text-[10px] font-semibold transition-all cursor-pointer"
                    >
                      Check-In Manual
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time Arrival Feed */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                Histórico de Entradas na Portaria
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">{logHistory.length} presentes</span>
            </div>

            <div className="space-y-3 divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {logHistory.length === 0 ? (
                <div className="text-[11px] text-slate-400 text-center py-6">Nenhum convidado chegou ainda. Comece a escanear!</div>
              ) : (
                logHistory.map(log => (
                  <div key={log.id} className="pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                        {log.name.charAt(0)}
                      </div>
                      <div>
                        <strong className="text-slate-800 block">{log.name}</strong>
                        <span className="text-[9px] text-slate-400 font-mono">{log.table} • Grupo de {1 + log.plusOnes} pessoa(s)</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-400">
                      {log.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
