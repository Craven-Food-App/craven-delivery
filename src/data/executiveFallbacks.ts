export interface FallbackExecutive {
  id: string;
  user_id?: string;
  role: string;
  title: string;
  department: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
}

export const FALLBACK_EXECUTIVES: FallbackExecutive[] = [
  {
    id: 'fallback-torrance-stroman',
    role: 'ceo',
    title: 'Founder CEO',
    department: 'Executive Office',
    name: 'Torrance Stroman',
    email: 'tstroman.ceo@cravenusa.com',
  },
  {
    id: 'fallback-justin-sweet',
    role: 'cfo',
    title: 'Chief Financial Officer',
    department: 'Finance',
    name: 'Justin Sweet',
    email: 'jsweet.cfo@cravenusa.com',
  },
  {
    id: 'fallback-terri-crawford',
    role: 'cxo',
    title: 'Chief Experience Officer',
    department: 'Experience',
    name: 'Terri Crawford',
    email: 'terri.crawford@cravenusa.com',
  },
  {
    id: 'fallback-cto-hiring',
    role: 'cto',
    title: 'Chief Technology Officer',
    department: 'Technology',
    name: 'Hiring',
    email: '', // Position open
  },
];





