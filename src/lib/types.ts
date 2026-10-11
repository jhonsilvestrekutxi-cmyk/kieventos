export type EventType = 'wedding'|'birthday'|'baptism'|'engagement'|'graduation'|'corporate'|'private'|'other'
export type RSVPStatus = 'yes'|'no'|'maybe'
export type EventRow = {
 id:string; owner_id:string; title:string; slug:string; event_type:EventType; description:string|null; host_names:string|null;
 starts_at:string|null; location_name:string|null; location_address:string|null; maps_url:string|null; cover_image_url:string|null;
 is_published:boolean; rsvp_deadline:string|null; allow_maybe:boolean; max_companions:number; created_at:string
}
export type RSVPRow = {id:string;event_id:string;guest_name:string;contact:string|null;status:RSVPStatus;companions:number;message:string|null;created_at:string}
export const eventLabels: Record<EventType,string> = {wedding:'Casamento',birthday:'Aniversário',baptism:'Baptizado',engagement:'Noivado',graduation:'Formatura',corporate:'Evento empresarial',private:'Festa privada',other:'Outro'}
export const statusLabels: Record<RSVPStatus,string> = {yes:'Confirmado',no:'Não vai',maybe:'Talvez'}