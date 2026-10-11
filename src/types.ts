/**
 * Types for Kutxi - Premium Digital Wedding Invitation & Event Management SaaS
 */

export interface BrideGroomInfo {
  brideName: string;
  brideFullName: string;
  brideBio: string;
  brideParents: string;
  bridePhoto: string;
  groomName: string;
  groomFullName: string;
  groomBio: string;
  groomParents: string;
  groomPhoto: string;
  couplePhoto?: string;
}

export interface WeddingTimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  icon: string; // Key of LucideIcon or generic descriptor
}

export interface VenueInfo {
  ceremonyName: string;
  ceremonyAddress: string;
  ceremonyTime: string;
  ceremonyMapsUrl: string;
  ceremonyWazeUrl: string;
  receptionName: string;
  receptionAddress: string;
  receptionTime: string;
  receptionMapsUrl: string;
  receptionWazeUrl: string;
  afterPartyName: string;
  afterPartyAddress: string;
  afterPartyTime: string;
  capacity?: number;
  hasParking?: boolean;
  photos?: string[];
}

export interface GiftContributor {
  id: string;
  name: string;
  amount: number;
  date: string;
  avatarUrl?: string;
  message?: string;
  phone?: string;
  proofUrl?: string;
}

export interface WeddingRegistryItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category?: 'eletro' | 'cozinha' | 'lua_de_mel' | 'sala_quarto' | 'experiencias' | 'cotas_dinheiro' | 'outro' | string;
  description?: string;
  claimedBy?: string;
  claimedDate?: string;
  claimedPhone?: string;
  guestMessage?: string;
  guestAvatar?: string;
  contributors?: GiftContributor[];
  totalCollected?: number;
  isQuota?: boolean;
  totalQuotas?: number;
  claimedQuotas?: number;
  paymentStatus?: 'pending' | 'received';
  status?: 'disponivel' | 'reservado' | 'recebido';
}

export interface WeddingGiftInfo {
  pixKey: string;
  pixQrCode: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankRecipient: string;
  accountHolder?: string;
  iban?: string;
  multicaixaPhone?: string;
  customInstructions?: string;
  registryItems: WeddingRegistryItem[];
}

export interface WeddingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface WeddingMediaGallery {
  coverImage: string;
  storyImage: string;
  photos: string[];
}

export interface WeddingAccomTrans {
  accommodationNotes: string;
  transportNotes: string;
  recommendedHotels: { name: string; stars: number; phone: string; link: string }[];
}

export interface WeddingTheme {
  id: string;
  name: string;
  primaryColor: string; // hex
  secondaryColor: string; // hex
  accentColor: string; // hex
  bgColor: string; // hex/tailwind class
  textColor: string;
  fontHeading: 'serif' | 'display' | 'sans';
  fontBody: 'sans' | 'serif';
  buttonStyle: 'rounded-full' | 'rounded-md' | 'rounded-none';
  glassEffect: boolean;
  spacing: 'compact' | 'relaxed' | 'spacious';
  borderRadius: 'none' | 'md' | 'lg' | 'full';
  bgPattern?: string; // e.g. 'floral', 'minimal', 'modern'
}

export interface TodoItem {
  id: string;
  label: string;
  completed: boolean;
  urgency: 'alta' | 'media' | 'baixa';
}

export interface WeddingConfig {
  id: string;
  slug: string; // for url: /invite/:slug
  clientId: string;
  todoList?: TodoItem[];
  brideGroom: BrideGroomInfo;
  date: string; // YYYY-MM-DDTHH:mm:ss
  storyTitle: string;
  storyContent: string;
  timeline: WeddingTimelineEvent[];
  venue: VenueInfo;
  dressCode: {
    title: string;
    description: string;
    colorPalette: string[]; // hex codes
    imageUrl?: string;
  };
  entourage: {
    bridesmaids: string[];
    groomsmen: string[];
  };
  faq: WeddingFaqItem[];
  giftRegistry: WeddingGiftInfo;
  media: WeddingMediaGallery;
  accomTrans: WeddingAccomTrans;
  spotifyPlaylistUrl?: string;
  youtubeVideoId?: string;
  theme: WeddingTheme;
  customFooter: string;
  pdfUrl?: string;
  isFirstLogin?: boolean;
  contactInfo: {
    phone: string;
    email: string;
  };
  isActive: boolean;
}

export type GuestGroup = 'Family' | 'Friends' | 'VIP' | 'Bride Side' | 'Groom Side' | 'Children' | 'Corporate';

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  group: GuestGroup;
  tableNumber: string;
  maxPlusOnes: number;
  plusOnesConfirmed: number;
  status: 'Pending' | 'Confirmed' | 'Declined';
  dietaryRequirements?: string;
  rsvpToken: string; // unique RSVP slug/uuid
  invitationViews: number;
  lastViewedAt?: string;
  confirmedAt?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  notes?: string;
  photoUrl?: string;
}

export interface ClientWeddingSaaS {
  id: string;
  clientName: string;
  clientEmail: string;
  weddingDate: string;
  plan: 'Basic' | 'Premium' | 'Luxury' | 'Enterprise';
  status: 'Active' | 'Trial' | 'Expired';
  revenue: number;
  config: WeddingConfig;
  guestCount?: number;
  rsvpsReceived?: number;
  createdAt?: string;
}

export interface SharedPhoto {
  id: string;
  guestName: string;
  imageUrl: string;
  timestamp: string;
  caption?: string;
  approved?: boolean;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  ip: string;
}
