import { WeddingConfig, Guest, ClientWeddingSaaS, SystemAuditLog } from '../types';

export const THEME_PRESETS = [
  {
    id: 'classic-romance',
    name: 'Romance Clássico',
    primaryColor: '#881337', // Rose 900
    secondaryColor: '#fdf2f8', // Rose 50
    accentColor: '#fb7185', // Rose 400
    bgColor: '#fafaf9', // Stone 50
    textColor: '#1c1917', // Stone 900
    fontHeading: 'serif' as const,
    fontBody: 'sans' as const,
    buttonStyle: 'rounded-full' as const,
    glassEffect: true,
    spacing: 'relaxed' as const,
    borderRadius: 'full' as const,
    bgPattern: 'floral',
  },
  {
    id: 'minimal-modern',
    name: 'Mínimo Moderno',
    primaryColor: '#0f172a', // Slate 900
    secondaryColor: '#f8fafc', // Slate 50
    accentColor: '#64748b', // Slate 500
    bgColor: '#ffffff',
    textColor: '#0f172a',
    fontHeading: 'display' as const,
    fontBody: 'sans' as const,
    buttonStyle: 'rounded-none' as const,
    glassEffect: false,
    spacing: 'compact' as const,
    borderRadius: 'none' as const,
    bgPattern: 'minimal',
  },
  {
    id: 'gold-luxury',
    name: 'Ouro Luxuoso',
    primaryColor: '#78350f', // Amber 900
    secondaryColor: '#fffbeb', // Amber 50
    accentColor: '#d97706', // Amber 600
    bgColor: '#fffcf5',
    textColor: '#292524',
    fontHeading: 'serif' as const,
    fontBody: 'serif' as const,
    buttonStyle: 'rounded-md' as const,
    glassEffect: true,
    spacing: 'spacious' as const,
    borderRadius: 'lg' as const,
    bgPattern: 'ornate',
  },
  {
    id: 'forest-boho',
    name: 'Boho Floresta',
    primaryColor: '#14532d', // Green 950
    secondaryColor: '#f0fdf4', // Green 50
    accentColor: '#16a34a', // Green 600
    bgColor: '#fafaf9',
    textColor: '#1c1917',
    fontHeading: 'serif' as const,
    fontBody: 'sans' as const,
    buttonStyle: 'rounded-full' as const,
    glassEffect: true,
    spacing: 'relaxed' as const,
    borderRadius: 'lg' as const,
    bgPattern: 'botanical',
  }
];

export const INITIAL_WEDDING_CONFIG: WeddingConfig = {
  id: 'w_joao_alice',
  slug: 'joao-alice',
  clientId: 'client_1',
  brideGroom: {
    groomName: 'João',
    groomFullName: 'João Sucualali',
    groomBio: 'Com alegria e gratidão, prepara-se para iniciar uma nova etapa de vida ao lado da pessoa que ama.',
    groomParents: 'Família do noivo',
    groomPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    brideName: 'Alice',
    brideFullName: 'Alice Catuluta',
    brideBio: 'Com carinho e esperança, prepara-se para celebrar o amor e partilhar este dia especial com familiares e amigos.',
    brideParents: 'Família da noiva',
    bridePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    couplePhoto: '/wedding-assets/Convite de Casamento à Beira-Mar4.png',
  },
  date: '2026-11-14T00:00:00',
  storyTitle: 'A nossa história de amor',
  storyContent: 'Duas histórias, duas famílias e um amor que escolheu caminhar junto. Neste dia especial, queremos celebrar esta união com as pessoas que fazem parte da nossa vida. Os detalhes e horários serão confirmados pelos noivos.',
  timeline: [
    {
      id: 't1',
      time: 'A confirmar',
      title: 'Cerimónia religiosa',
      description: 'Celebração da união na igreja. O horário será confirmado pelos noivos.',
      icon: 'Heart',
    },
    {
      id: 't2',
      time: 'A confirmar',
      title: 'Recepção dos convidados',
      description: 'Momento de acolhimento e fotografias com familiares e amigos.',
      icon: 'GlassWater',
    },
    {
      id: 't3',
      time: 'A confirmar',
      title: 'Celebração',
      description: 'Convívio e celebração com os noivos e convidados.',
      icon: 'Utensils',
    },
    {
      id: 't4',
      time: 'A confirmar',
      title: 'Momentos especiais',
      description: 'Os momentos da festa serão anunciados no programa final.',
      icon: 'Music',
    },
    {
      id: 't5',
      time: 'A confirmar',
      title: 'Encerramento',
      description: 'Informações adicionais serão partilhadas pelos noivos.',
      icon: 'Sparkles',
    }
  ],
  venue: {
    ceremonyName: 'Igreja Metodista Unida Gaspar Adão de Almeida',
    ceremonyAddress: 'Rua da Bomba dos Mutilados, Viana, Luanda, Angola',
    ceremonyTime: '14 de Novembro — horário a confirmar',
    ceremonyMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-8.945046,13.374337',
    ceremonyWazeUrl: 'https://waze.com/ul?ll=-8.945046,13.374337&navigate=yes',
    receptionName: 'Quinta Viver das Palmeiras',
    receptionAddress: 'Viana, Luanda, Angola',
    receptionTime: '14 de Novembro — horário a confirmar',
    receptionMapsUrl: 'https://maps.app.goo.gl/9FdjBTNdoA3sr8Dx7',
    receptionWazeUrl: 'https://maps.app.goo.gl/9FdjBTNdoA3sr8Dx7',
    afterPartyName: 'Celebração de casamento',
    afterPartyAddress: 'Quinta Viver das Palmeiras, Viana, Luanda',
    afterPartyTime: 'A confirmar'
  },
  dressCode: {
    title: 'Traje elegante',
    description: 'O traje recomendado será anunciado pelos noivos. Por favor, consulte esta secção novamente antes do evento.',
    colorPalette: ['#39451d', '#a77b3c', '#fbf7ee', '#d7c8a8'],
  },
  entourage: {
    bridesmaids: [],
    groomsmen: []
  },
  faq: [
    {
      id: 'f1',
      question: 'Como confirmo a minha presença?',
      answer: 'Utilize a secção de confirmação de presença deste convite. Os noivos irão validar as respostas recebidas.'
    },
    {
      id: 'f2',
      question: 'Onde será a cerimónia religiosa?',
      answer: 'Na Igreja Metodista Unida Gaspar Adão de Almeida, Rua da Bomba dos Mutilados, Viana, Luanda. Utilize o botão de mapa para obter direções.'
    },
    {
      id: 'f3',
      question: 'Onde será a celebração?',
      answer: 'Na Quinta Viver das Palmeiras, em Viana, Luanda. Consulte o mapa do espaço nesta página.'
    },
    {
      id: 'f4',
      question: 'Qual é o horário do evento?',
      answer: 'Os horários serão confirmados pelos noivos e atualizados nesta página.'
    }
  ],
  giftRegistry: {
    pixKey: '',
    pixQrCode: '',
    bankName: '',
    bankAgency: '',
    bankAccount: '',
    iban: '',
    multicaixaPhone: '',
    bankRecipient: '',
    customInstructions: 'A lista de presentes será configurada pelos noivos, caso desejem disponibilizá-la.',
    registryItems: []
  },
  media: {
    coverImage: '/wedding-assets/Convite_Interativo_Capa_1080x1920 (1).png',
    storyImage: '/wedding-assets/Convite de Casamento à Beira-Mar4.png',
    photos: [
      '/wedding-assets/Convite de Casamento à Beira-Mar4.png',
      '/wedding-assets/Convite de Casamento em Viana3.png',
      '/wedding-assets/Convite de Casamento na Igreja 2.png',
      '/wedding-assets/Convite de Casamento Elegante em Dourado 1.png',
    ]
  },
  accomTrans: {
    accommodationNotes: 'Informações de alojamento serão acrescentadas pelos noivos, se necessário.',
    transportNotes: 'Informações sobre transporte serão confirmadas pelos noivos.',
    recommendedHotels: []
  },
  spotifyPlaylistUrl: '',
  youtubeVideoId: '',
  theme: THEME_PRESETS[0],
  customFooter: 'Com carinho, João & Alice',
  contactInfo: {
    phone: '',
    email: '',
  },
  isActive: true,
  todoList: [
    { id: 'td1', label: 'Confirmar data completa e horários', completed: false, urgency: 'alta' },
    { id: 'td2', label: 'Confirmar e organizar fotografias dos noivos', completed: false, urgency: 'media' },
    { id: 'td3', label: 'Configurar contacto para confirmação de presença', completed: false, urgency: 'alta' },
    { id: 'td4', label: 'Publicar o convite e testar links dos mapas', completed: false, urgency: 'alta' },
    { id: 'td5', label: 'Testar RSVP e painel de administração', completed: false, urgency: 'media' },
  ],
};

export const INITIAL_GUESTS: Guest[] = [];

export const INITIAL_CLIENTS: ClientWeddingSaaS[] = [
  {
    id: 'client_1',
    clientName: 'João & Alice',
    clientEmail: '',
    weddingDate: '2026-11-14',
    plan: 'Luxury',
    status: 'Active',
    guestCount: 0,
    rsvpsReceived: 0,
    revenue: 0,
    createdAt: '2026-01-15',
    config: INITIAL_WEDDING_CONFIG
  }
];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [];
