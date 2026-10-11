import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, Search, UserCheck, CheckCircle, 
  Clock, Users, ArrowRight, Play, Shield, RefreshCw, LogOut, Check, Camera, CameraOff, AlertTriangle, List, Smartphone,
  Plus, Minus, X, Utensils, FileText, Mail, Phone, MapPin
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Guest } from '../types';

interface GatekeeperPortalProps {
  guests: Guest[];
  onCheckIn: (id: string, plusOnesCount: number) => void;
  clientName: string;
  onExitPortal: () => void;
  isLocked?: boolean;
}

export interface CheckInLog {
  id: string;
  name: string;
  table: string;
  timestamp: string;
  plusOnes: number;
}

export interface CheckInToast {
  id: string;
  guestName: string;
  photoUrl?: string;
  tableNumber: string;
  plusOnes: number;
  group: string;
  type: 'success' | 'warning' | 'error';
  message: string;
}

export default function GatekeeperPortal({ 
  guests, 
  onCheckIn, 
  clientName,
  onExitPortal,
  isLocked = false
}: GatekeeperPortalProps) {
  // Mobile UI navigation tab ('scan' | 'search' | 'logs')
  const [mobileTab, setMobileTab] = useState<'scan' | 'search' | 'logs'>('scan');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScanGuestId, setSelectedScanGuestId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Guest | null>(null);
  const [errorText, setErrorText] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState<CheckInToast[]>([]);

  // Function to trigger a beautiful live visual toast notification with sound beep
  const triggerToast = (guest: Guest, type: 'success' | 'warning' | 'error' = 'success', customMessage?: string) => {
    const getGuestPhoto = (g: Guest) => {
      if (g.photoUrl) return g.photoUrl;
      const index = g.id.charCodeAt(g.id.length - 1) % 6;
      const placeholders = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'
      ];
      return placeholders[index];
    };

    const newToast: CheckInToast = {
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      guestName: guest.name,
      photoUrl: getGuestPhoto(guest),
      tableNumber: guest.tableNumber || 'Sem Mesa',
      plusOnes: guest.plusOnesConfirmed || 0,
      group: guest.group,
      type,
      message: customMessage || `Acesso autorizado!`
    };

    setToasts(prev => [...prev, newToast]);

    // Programmatic high-end double beep/warning synth
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
        
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1320, audioCtx.currentTime); // E6
          gain2.gain.setValueAtTime(0.04, audioCtx.currentTime);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.12);
        }, 100);
      } else {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(180, audioCtx.currentTime); // Low buzz
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      // Browser blocked autoplays, ignore silently
    }

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 6000);
  };
  
  // Real Camera and Device selection state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [scanningError, setScanningError] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Proactive preflight permission states
  const [permissionPreflight, setPermissionPreflight] = useState<boolean>(true);
  const [selectedManualGuest, setSelectedManualGuest] = useState<Guest | null>(null);
  const [manualCompanions, setManualCompanions] = useState<number>(0);

  // Local log history synchronized with guests checked-in
  const [logHistory, setLogHistory] = useState<CheckInLog[]>([]);

  // Synchronize initial checklist of checked-in guests on mount or updates
  useEffect(() => {
    const checkedInGuests = guests
      .filter(g => g.checkedIn)
      .map(g => ({
        id: 'l_' + g.id,
        name: g.name,
        table: g.tableNumber,
        timestamp: g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString('pt-AO'),
        plusOnes: g.plusOnesConfirmed || 0
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setLogHistory(checkedInGuests);
  }, [guests]);

  // List of confirmed guests not checked in yet
  const eligibleGuests = guests.filter(g => g.status === 'Confirmed' && !g.checkedIn);

  // Proactively check browser camera permission state on mount (iOS & Android safe)
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' as any })
        .then(permissionStatus => {
          if (permissionStatus.state === 'granted') {
            setCameraPermission('granted');
            setPermissionPreflight(false);
            // Launch automatically since permission is already granted
            setTimeout(() => {
              startCameraScanner();
            }, 300);
          } else if (permissionStatus.state === 'denied') {
            setCameraPermission('denied');
            setPermissionPreflight(false);
          }
          
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setCameraPermission('granted');
              setPermissionPreflight(false);
            }
          };
        })
        .catch(err => {
          console.warn("Permissions API query not fully supported:", err);
        });
    }
    
    return () => {
      stopCameraScanner();
    };
  }, []);

  const startCameraScanner = async (specificCameraId?: string) => {
    setErrorText('');
    setScanningError('');
    setIsScanning(true);

    try {
      const elementId = "qr-reader-viewport";
      const element = document.getElementById(elementId);
      if (!element) return;

      // Stop any existing instance first
      if (qrScannerRef.current) {
        try {
          await qrScannerRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const scanner = new Html5Qrcode(elementId);
      qrScannerRef.current = scanner;

      // Ask for permission / Get cameras list
      const devices = await Html5Qrcode.getCameras();
      setAvailableCameras(devices);

      if (!devices || devices.length === 0) {
        throw new Error("Nenhuma câmera de vídeo foi detectada neste aparelho.");
      }

      // Determine camera to use
      let chosenCameraId = specificCameraId || selectedCameraId || '';
      
      if (!chosenCameraId) {
        // Try to find rear camera by keyword automatically
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('traseira') || 
          device.label.toLowerCase().includes('rear') || 
          device.label.toLowerCase().includes('trás') ||
          device.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
          chosenCameraId = backCamera.id;
        } else if (devices.length > 1) {
          // Fallback to the last camera in list which is usually the rear camera
          chosenCameraId = devices[devices.length - 1].id;
        } else {
          chosenCameraId = devices[0].id;
        }
      }

      setSelectedCameraId(chosenCameraId);

      // Start actual decoding
      await scanner.start(
        chosenCameraId,
        {
          fps: 25,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            return {
              width: Math.floor(minSize * 0.70),
              height: Math.floor(minSize * 0.70)
            };
          },
          aspectRatio: 1.0 // Force a perfect square capture box for ultra fast scanning performance
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        (errorMessage) => {
          // Silent frame analysis failures
        }
      );

      setCameraActive(true);
      setCameraPermission('granted');
      setPermissionPreflight(false);
      setIsScanning(false);

      // Refresh camera devices list after permission is granted to detect all back-facing lenses
      try {
        const refreshedDevices = await Html5Qrcode.getCameras();
        if (refreshedDevices && refreshedDevices.length > 0) {
          setAvailableCameras(refreshedDevices);
        }
      } catch (e) {
        console.warn("Failed to refresh devices after permission grant:", e);
      }
    } catch (err: any) {
      console.warn("Mobile camera starting failed:", err);
      setCameraActive(false);
      setIsScanning(false);
      setCameraPermission('denied');
      
      let explanation = "Permissão de câmera não concedida ou bloqueada pelo navegador.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        explanation = "Permissão da câmera negada! No Safari (iOS): Vá em Ajustes > Safari > Câmera e mude para 'Permitir'. No Chrome/Android: Toque no cadeado na barra de endereços e ative a permissão.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        explanation = "Nenhuma câmera traseira de alta performance foi detectada neste dispositivo.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        explanation = "A câmera já está em uso por outro aplicativo ou aba do navegador. Feche outros apps e tente reativar.";
      } else if (err.name === 'OverconstrainedError') {
        explanation = "As configurações de foco e resolução não são compatíveis com este hardware.";
      } else if (err.message) {
        explanation = err.message;
      }

      setScanningError(explanation);
    }
  };

  const handlePreflightClick = async () => {
    setErrorText('');
    setScanningError('');
    setIsScanning(true);
    try {
      // Direct user action to request stream (iOS / Android 100% compliant)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Release tracks immediately
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      setPermissionPreflight(false);
      // Wait for DOM to register layout then initiate scanner
      setTimeout(() => {
        startCameraScanner();
      }, 150);
    } catch (err: any) {
      console.warn("Preflight permission request failed:", err);
      setCameraPermission('denied');
      setPermissionPreflight(false);
      
      let explanation = "Permissão de câmera não concedida ou bloqueada pelo navegador.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        explanation = "Permissão da câmera negada! No Safari (iOS): Vá em Ajustes > Safari > Câmera e mude para 'Permitir'. No Chrome/Android: Toque no cadeado na barra de endereços e ative a permissão.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        explanation = "Nenhuma câmera traseira foi detectada neste dispositivo.";
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
        console.error("Error stopping scanner:", e);
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
        setErrorText(`Atenção: Convidado "${guest.name}" já realizou check-in anteriormente!`);
        triggerToast(guest, 'warning', `Atenção: Check-in já realizado anteriormente!`);
      } else {
        onCheckIn(guest.id, guest.maxPlusOnes);
        setScanResult(guest);
        setErrorText('');
        stopCameraScanner();
        triggerToast(guest, 'success', `QR Code Validado! Entrada autorizada.`);
      }
    } else {
      setErrorText(`QR Code inválido ou não localizado (${token})`);
    }
  };

  const handleSimulateScan = () => {
    if (!selectedScanGuestId) {
      setErrorText('Por favor, selecione um convite para simular.');
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
        setSelectedScanGuestId('');
        triggerToast(guest, 'success', `QR Code Simulado! Entrada autorizada.`);
      }
    }, 1000);
  };

  const handleManualCheckIn = (guest: Guest) => {
    setSelectedManualGuest(guest);
    // Initialize companion selection with the number of companions they originally confirmed
    setManualCompanions(guest.plusOnesConfirmed || 0);
    setErrorText('');
  };

  const handleExecuteManualCheckIn = () => {
    if (!selectedManualGuest) return;
    onCheckIn(selectedManualGuest.id, manualCompanions);
    
    const updatedGuest = {
      ...selectedManualGuest,
      checkedIn: true,
      plusOnesConfirmed: manualCompanions
    };

    // Set simulated scan result for success feedback
    setScanResult(updatedGuest);
    
    setSelectedManualGuest(null);
    setErrorText('');

    triggerToast(updatedGuest, 'success', `Check-in manual efetuado com sucesso!`);
  };

  const filteredManualGuests = guests.filter(g => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return !g.checkedIn; // Default: show only pending guests
    
    // Search by name, table, token, email or phone!
    return (
      (g.name || '').toLowerCase().includes(term) ||
      (g.tableNumber || '').toLowerCase().includes(term) ||
      (g.rsvpToken || '').toLowerCase().includes(term) ||
      (g.email || '').toLowerCase().includes(term) ||
      (g.phone || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between select-none" id="gatekeeper-portal-section">
      
      {/* Header bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-800 text-white rounded-xl">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-wide">Painel da Portaria</h1>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
              Casamento: <span className="text-rose-400 font-bold">{clientName}</span>
            </p>
          </div>
        </div>

        {!isLocked && (
          <button
            onClick={onExitPortal}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-800 text-slate-400 hover:text-white bg-slate-900 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
        )}
      </header>

      {/* MOBILE PREMIUM SEGMENTS TAB BAR */}
      <div className="lg:hidden flex border-b border-slate-800 bg-slate-950 p-1 gap-1 sticky top-[53px] z-25">
        {[
          { id: 'scan', label: 'Câmera QR', icon: QrCode },
          { id: 'search', label: 'Lista de Entrada', icon: Search },
          { id: 'logs', label: 'Presenças', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setMobileTab(tab.id as any);
              if (tab.id === 'scan') {
                startCameraScanner();
              } else {
                stopCameraScanner();
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              mobileTab === tab.id 
                ? 'bg-rose-950/50 text-rose-400 border border-rose-900/40 font-bold' 
                : 'text-slate-400 border border-transparent hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LIVE SCANNER CAMERA VIEWPORT (Visible always on desktop, conditionally on mobile) */}
        <div className={`lg:col-span-7 bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-2xl ${
          mobileTab === 'scan' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest font-bold text-rose-400 bg-rose-950/40 border border-rose-900/30 px-2.5 py-0.5 rounded-full inline-block">
                Validação em Tempo Real
              </span>
              <div className="flex gap-2">
                {cameraActive ? (
                  <button 
                    onClick={stopCameraScanner}
                    className="flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-slate-850 text-stone-400 px-2.5 py-1 rounded-md border border-slate-800 cursor-pointer"
                  >
                    <CameraOff className="w-3 h-3" />
                    Desligar
                  </button>
                ) : (
                  <button 
                    onClick={() => startCameraScanner()}
                    className="flex items-center gap-1 text-[10px] bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 px-2.5 py-1 rounded-md border border-rose-900/30 cursor-pointer"
                  >
                    <Camera className="w-3 h-3 text-rose-400" />
                    Ligar Câmera
                  </button>
                )}
              </div>
            </div>

            <h2 className="font-display font-medium text-white text-sm md:text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-rose-500" />
              Escanear QR Code do Convite
            </h2>
            <p className="text-[11px] text-slate-400 leading-normal">
              Aponte o QR Code do convite (impresso ou no celular do convidado) para a câmera. O sistema valida automaticamente o acesso e a mesa designada.
            </p>
          </div>

          {/* Camera Device Selector Switcher (Excellent Android/iOS compatible fallback) */}
          {availableCameras.length > 1 && (
            <div className="bg-slate-900/60 p-2 border border-slate-800 rounded-xl space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Alternar Câmera (Multicâmeras Detectadas):
              </label>
              <select
                value={selectedCameraId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedCameraId(id);
                  await startCameraScanner(id);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-[10px] text-slate-200 focus:outline-none"
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Câmera Traseira / Frontal (${cam.id.slice(0, 6)})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live camera stream container / scan element */}
          <div className="relative aspect-video max-w-md mx-auto w-full bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 shadow-2xl border border-slate-800">
            
            <div 
              id="qr-reader-viewport" 
              className={`absolute inset-0 w-full h-full object-cover z-0 ${cameraActive && !permissionPreflight ? 'block' : 'hidden'}`}
            />

            {/* Laser scanning visual overlay */}
            {cameraActive && !permissionPreflight && (
              <motion.div
                initial={{ top: '5%' }}
                animate={{ top: '95%' }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_15px_3px_rgba(239,68,68,0.9)] z-10 pointer-events-none"
              />
            )}

            {/* Matrix targeting visual borders */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-rose-500 z-10 pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-rose-500 z-10 pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-rose-500 z-10 pointer-events-none"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-rose-500 z-10 pointer-events-none"></div>

            {/* Overlay content based on scan states */}
            <AnimatePresence mode="wait">
              {permissionPreflight ? (
                <motion.div
                  key="preflight"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-3.5 z-20 bg-slate-950/90 p-5 rounded-2xl border border-amber-500/20 max-w-xs shadow-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <Camera className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider">Ativar Portaria Digital</h4>
                    <p className="text-[9.5px] text-slate-400 leading-relaxed font-medium">
                      Para habilitar o scanner QR instantâneo, ative os sensores de vídeo do seu smartphone iOS ou Android de forma proativa.
                    </p>
                  </div>
                  <button
                    onClick={handlePreflightClick}
                    className="w-full py-2 bg-gradient-to-r from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-200" />
                    Ativar Câmera Traseira
                  </button>
                </motion.div>
              ) : isScanning && !cameraActive ? (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-3 z-10 bg-slate-900/90 p-6 rounded-xl border border-slate-800"
                >
                  <RefreshCw className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
                  <div className="text-[10px] font-mono font-bold text-rose-400 tracking-widest uppercase">Acessando Câmera...</div>
                  <p className="text-[9px] text-slate-500">Solicitando permissões robustas de vídeo ao sistema.</p>
                </motion.div>
              ) : scanResult ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="text-center space-y-3 z-20 text-white p-5 w-full max-w-sm bg-slate-950 border border-emerald-500/30 rounded-2xl shadow-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1 border border-emerald-500/30">
                    <Check className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white">{scanResult.name}</div>
                    <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-block">
                      Autorizado ✓ Presente
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-left text-[11px] text-slate-400">
                    <div>
                      <span className="text-[8px] block text-slate-500 uppercase font-semibold">Mesa</span>
                      <strong className="text-white font-mono">{scanResult.tableNumber || 'Sem Mesa'}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] block text-slate-500 uppercase font-semibold">Lugares</span>
                      <strong className="text-white font-mono">{1 + (scanResult.plusOnesConfirmed || 0)} Assento(s)</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setScanResult(null);
                      startCameraScanner();
                    }}
                    className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Escanear Próximo
                  </button>
                </motion.div>
              ) : !cameraActive ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-3 z-10 text-slate-400 p-4 w-full max-w-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-slate-300">Câmera Desconectada / Permissão Necessária</div>
                    <p className="text-[9px] text-slate-400 leading-normal font-medium text-center">
                      {scanningError || "Conceda permissão de câmera para realizar check-in instantâneo via QR Code na portaria."}
                    </p>
                  </div>
                  
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        // Switch to search list on mobile or focus search input
                        setMobileTab('search');
                        setTimeout(() => {
                          const el = document.getElementById('manual-search-input');
                          if (el) el.focus();
                        }, 200);
                      }}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-bold cursor-pointer"
                    >
                      Usar Confirmação Manual
                    </button>
                  </div>

                  <button
                    onClick={() => startCameraScanner()}
                    className="text-[9px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 mx-auto mt-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Tentar Reativar Câmera
                  </button>
                </motion.div>
              ) : (
                <div className="absolute inset-0 border-[30px] border-slate-950/60 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-white/40 text-[8px] font-mono tracking-widest text-center">
                    POSICIONE O QR CODE NO RETÂNGULO
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {errorText && (
            <div className="px-3.5 py-2.5 bg-rose-950/40 border border-rose-900/30 text-rose-300 rounded-xl text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
              <span className="font-semibold">{errorText}</span>
            </div>
          )}

          {/* Simulator Panel (Perfect for non-camera desktop tests) */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <label className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">
              Simulador Integrado de QR Code (Homologação rápida)
            </label>
            <div className="flex gap-2">
              <select
                value={selectedScanGuestId}
                onChange={e => setSelectedScanGuestId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-white focus:outline-none"
              >
                <option value="">-- Selecione um convidado para simular --</option>
                {eligibleGuests.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} • Token: {g.rsvpToken}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleSimulateScan}
                disabled={isScanning || !selectedScanGuestId}
                className="flex items-center gap-1 bg-rose-800 hover:bg-rose-900 disabled:opacity-40 text-white rounded-lg text-[10px] font-bold px-3 py-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3" />
                Simular
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MANUAL SEARCH & CONFIRMATION (Visible on search/logs conditionally on mobile) */}
        
        {/* TAB: MANUAL GUEST SEARCH */}
        <div className={`lg:col-span-5 space-y-6 ${
          mobileTab === 'search' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              Pesquisa Rápida & Entrada Manual
            </h3>
            
            <input
              id="manual-search-input"
              type="text"
              placeholder="Digite o nome do convidado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-900 font-medium"
            />

            <div className="max-h-72 overflow-y-auto space-y-3.5 divide-y divide-slate-900/60 pr-1">
              {filteredManualGuests.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-8">Nenhum convidado localizado com este critério de busca.</div>
              ) : (
                filteredManualGuests.slice(0, 20).map(guest => (
                  <div key={guest.id} className="pt-2.5 flex items-center justify-between gap-3 text-[11px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-100">{guest.name}</span>
                        {guest.checkedIn ? (
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase rounded-full border border-emerald-500/10">Entrou</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-900 text-slate-400 text-[8px] font-bold uppercase rounded-full border border-slate-800">Pendente</span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 space-y-0.5">
                        <span className="block font-mono">Mesa: {guest.tableNumber || 'Sem Mesa'} • Conf.: 1 + {guest.plusOnesConfirmed || 0} acomp.</span>
                        {(guest.phone || guest.email) && (
                          <span className="block font-mono text-slate-500 text-[8.5px] truncate max-w-[200px]">
                            {guest.phone || guest.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleManualCheckIn(guest)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer border ${
                        guest.checkedIn
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          : 'bg-emerald-950/40 border-emerald-900/30 text-emerald-300 hover:bg-emerald-900/40'
                      }`}
                    >
                      {guest.checkedIn ? 'Ver Ficha' : 'Check-In'}
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* TAB: PRESENCE LOGS TIMELINE */}
        <div className={`lg:col-span-5 space-y-6 ${
          mobileTab === 'logs' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Histórico de Entradas
              </h3>
              <span className="text-[9px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded-full">{logHistory.length} presentes</span>
            </div>

            <div className="space-y-3 divide-y divide-slate-900/60 max-h-80 overflow-y-auto pr-1">
              {logHistory.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-6">Nenhuma presença registada nesta portaria até ao momento.</div>
              ) : (
                logHistory.map(log => (
                  <div key={log.id} className="pt-2.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-950/40 text-emerald-400 flex items-center justify-center font-bold border border-emerald-900/30 text-[9px]">
                        {log.name.charAt(0)}
                      </div>
                      <div>
                        <strong className="text-slate-200 block">{log.name}</strong>
                        <span className="text-[8px] text-slate-400 font-mono">Mesa: {log.table} • Acompanhantes: {log.plusOnes}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[9px] text-slate-500">
                      {log.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer bar */}
      <footer className="bg-slate-950 border-t border-slate-850 py-3 px-4 text-center text-[9px] text-slate-500 font-mono">
        PORTAL CONCIERGE V2.6 • SISTEMA EM TEMPO REAL INTEGRADO
      </footer>

      {/* GORGEOUS GUEST RECORD SHEET MODAL */}
      <AnimatePresence>
        {selectedManualGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              {/* Header block with elegant gradient accent */}
              <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/10 to-rose-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    {selectedManualGuest.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-sm tracking-wide">{selectedManualGuest.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {selectedManualGuest.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedManualGuest(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Guest Information Grid */}
              <div className="p-5 space-y-4 text-[11px] text-slate-300">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Mesa Designada</span>
                    <div className="flex items-center gap-1 text-white font-semibold font-mono">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {selectedManualGuest.tableNumber || 'Sem Mesa'}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Código VIP / Token</span>
                    <div className="flex items-center gap-1 text-amber-400 font-semibold font-mono uppercase">
                      <QrCode className="w-3 h-3" />
                      {selectedManualGuest.rsvpToken || 'Sem Token'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Informações de Contato</span>
                  <div className="space-y-1.5 text-slate-300">
                    {selectedManualGuest.email && (
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {selectedManualGuest.email}
                      </div>
                    )}
                    {selectedManualGuest.phone && (
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {selectedManualGuest.phone}
                      </div>
                    )}
                    {!selectedManualGuest.email && !selectedManualGuest.phone && (
                      <div className="text-slate-500 italic text-[10px]">Nenhum e-mail ou telefone cadastrado.</div>
                    )}
                  </div>
                </div>

                {/* Optional dietary/general notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-2.5 border border-slate-850 rounded-xl space-y-1">
                    <span className="text-[8.5px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-amber-500" />
                      Restrições Alimentares
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      {selectedManualGuest.dietaryRequirements || 'Nenhuma restrição cadastrada.'}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 border border-slate-850 rounded-xl space-y-1">
                    <span className="text-[8.5px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3 text-rose-500" />
                      Observações
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      {selectedManualGuest.notes || 'Nenhuma observação interna.'}
                    </p>
                  </div>
                </div>

                {/* Entry status & interactive controls */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  {selectedManualGuest.checkedIn ? (
                    <div className="bg-emerald-950/40 border border-emerald-900/30 p-3.5 rounded-xl text-center space-y-1">
                      <div className="text-emerald-400 font-bold flex items-center justify-center gap-1 text-xs">
                        <CheckCircle className="w-4 h-4" />
                        Check-In Realizado ✓
                      </div>
                      <p className="text-[10px] text-emerald-500 font-mono font-medium">
                        Entrada liberada com 1 + {selectedManualGuest.plusOnesConfirmed || 0} acompanhante(s).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Companion Selector counter */}
                      <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-850">
                        <div>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Acompanhantes Entrando</span>
                          <span className="text-[10px] text-slate-300 font-medium">
                            Confirmados: <strong className="text-white">{selectedManualGuest.plusOnesConfirmed || 0}</strong> (Permitido: {selectedManualGuest.maxPlusOnes || 0})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setManualCompanions(prev => Math.max(0, prev - 1))}
                            disabled={manualCompanions <= 0}
                            className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-sm text-white w-4 text-center">{manualCompanions}</span>
                          <button
                            type="button"
                            onClick={() => setManualCompanions(prev => Math.min(selectedManualGuest.maxPlusOnes || 0, prev + 1))}
                            disabled={manualCompanions >= (selectedManualGuest.maxPlusOnes || 0)}
                            className="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Primary Golden Confirmation button */}
                      <button
                        onClick={handleExecuteManualCheckIn}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        Confirmar Entrada de {selectedManualGuest.name.split(' ')[0]}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating high-end toast notifications stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" id="toasts-portal-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 50, transition: { duration: 0.2 } }}
              layout
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex gap-3.5 relative overflow-hidden ${
                toast.type === 'success' 
                  ? 'bg-slate-950/95 border-emerald-500/30 shadow-emerald-950/20' 
                  : 'bg-slate-950/95 border-amber-500/30 shadow-amber-950/20'
              }`}
            >
              {/* Profile Image with status badge */}
              <div className="relative shrink-0">
                <img 
                  src={toast.photoUrl} 
                  alt={toast.guestName}
                  referrerPolicy="no-referrer"
                  className={`w-12 h-12 rounded-full object-cover border-2 ${
                    toast.type === 'success' ? 'border-emerald-500' : 'border-amber-500'
                  }`}
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border text-white ${
                  toast.type === 'success' 
                    ? 'bg-emerald-500 border-slate-950' 
                    : 'bg-amber-500 border-slate-950'
                }`}>
                  {toast.type === 'success' ? (
                    <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                  ) : (
                    <AlertTriangle className="w-2.5 h-2.5 text-white fill-amber-600 stroke-[2px]" />
                  )}
                </div>
              </div>

              {/* Toast Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest block">
                    {toast.type === 'success' ? 'Acesso Confirmado' : 'Aviso Portaria'}
                  </span>
                  
                  {/* Close button */}
                  <button 
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-white truncate pr-4">{toast.guestName}</h4>
                
                <p className="text-[10px] text-slate-300 leading-normal font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {toast.message}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[8.5px] font-bold rounded-full">
                    {toast.tableNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[8.5px] font-bold rounded-full">
                    1 + {toast.plusOnes} acomp.
                  </span>
                  <span className={`px-2 py-0.5 border text-[8.5px] font-bold rounded-full ${
                    toast.group === 'VIP' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : toast.group === 'Family'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                    {toast.group}
                  </span>
                </div>
              </div>

              {/* Auto progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-850">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  className={`h-full ${
                    toast.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
