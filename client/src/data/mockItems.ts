export interface Item {
  id: string;
  title: string;
  type: 'lost' | 'found';
  category: 'bags' | 'electronics' | 'keys' | 'wallets' | 'accessories' | 'other';
  location: string;
  date: string;
  timeAgo: string;
  image: string;
  description: string;
  status: 'active' | 'reunited' | 'pending';
  reward?: string;
  contactName: string;
}

export const initialItems: Item[] = [
  {
    id: 'item-1',
    title: 'Matte Black Backpack',
    type: 'lost',
    category: 'bags',
    location: 'Central Library, 3rd Floor Study Room',
    date: '2026-09-27',
    timeAgo: '2 days ago',
    image: '/images/backpack.jpg',
    description: 'Black water-resistant commuter backpack with silver zippers. Contains notes and a blue spiral notebook.',
    status: 'active',
    reward: '$25 Reward',
    contactName: 'Marcus C.',
  },
  {
    id: 'item-2',
    title: 'Car Keys with Leather Keychain',
    type: 'found',
    category: 'keys',
    location: 'Student Union Plaza, Bench near Café',
    date: '2026-09-28',
    timeAgo: '1 day ago',
    image: '/images/keys.jpg',
    description: 'Key fob with two brass door keys and a distressed tan leather strap. Handed to Student Desk security.',
    status: 'active',
    contactName: 'Campus Security',
  },
  {
    id: 'item-3',
    title: 'iPhone 13 - Midnight Black',
    type: 'lost',
    category: 'electronics',
    location: 'Science & Engineering Hall, Room 204',
    date: '2026-09-26',
    timeAgo: '3 days ago',
    image: '/images/iphone.jpg',
    description: 'iPhone 13 with clear silicone case with a small sticker on back. Locked with passcode.',
    status: 'active',
    reward: '$50 Reward',
    contactName: 'Chloe S.',
  },
  {
    id: 'item-4',
    title: 'Brown Leather Bi-fold Wallet',
    type: 'found',
    category: 'wallets',
    location: 'Recreation Center, Locker Room Area',
    date: '2026-09-24',
    timeAgo: '5 days ago',
    image: '/images/wallet.jpg',
    description: 'Classic brown leather wallet containing university ID and transit card. Safe at Rec Center Front Desk.',
    status: 'active',
    contactName: 'Rec Center Desk',
  },
  {
    id: 'item-5',
    title: 'AirPods Pro (2nd Gen) in White Case',
    type: 'lost',
    category: 'electronics',
    location: 'Dining Commons, Booth Table 12',
    date: '2026-09-28',
    timeAgo: 'Yesterday',
    image: '/images/airpods.jpg',
    description: 'Charging case with a tiny green dot engraved near the hinge. Last pinged near Dining Hall.',
    status: 'active',
    reward: '$30 Reward',
    contactName: 'Liam K.',
  },
  {
    id: 'item-6',
    title: 'Designer Wireframe Glasses',
    type: 'found',
    category: 'accessories',
    location: 'North Campus Shuttle Bus Line A',
    date: '2026-09-28',
    timeAgo: '1 day ago',
    image: '/images/glasses.jpg',
    description: 'Gold wireframe prescription glasses inside a hard black protective case.',
    status: 'active',
    contactName: 'Transit Lost & Found',
  },
  {
    id: 'item-7',
    title: 'Smart Fitness Watch - Silver Case',
    type: 'lost',
    category: 'electronics',
    location: 'Campus Track & Field Bleachers',
    date: '2026-09-25',
    timeAgo: '4 days ago',
    image: '/images/watch.jpg',
    description: 'Smartwatch with a white sport band. Battery was at 40% when lost.',
    status: 'active',
    reward: '$40 Reward',
    contactName: 'Daniel R.',
  },
];
