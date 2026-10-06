import { Category, Service, Address, Professional, Coupon, Booking, NotificationItem, BannerSlide } from '../types';

export const REAL_CLEANING_CATEGORY_ID = 'be8bb640-cc11-4243-ab4a-5cbdf34a0937';

export const MOCK_BANNERS: BannerSlide[] = [
  {
    id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c01',
    title: 'Full Deep Clean',
    subtitle: 'Deep clean made simple for everyone.',
    badge: '40% Off',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    serviceId: '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
  },
  {
    id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c02',
    title: 'AC Master Jet Servicing',
    subtitle: 'Pure cooling & fresh air for your home.',
    badge: 'Summer Special',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    serviceId: '8f7a6b5c-4d3e-4f2a-1b0c-9d8e7f6a5b4c',
  },
  {
    id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c03',
    title: 'Spotless Kitchen Cleaning',
    subtitle: 'Degrease countertops, stovetop & sink.',
    badge: 'Best Seller',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    serviceId: '6d5e4f3a-2b1c-4d0e-9f8a-7b6c5d4e3f2a',
  },
  {
    id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c04',
    title: 'Quick Bathroom Hygiene',
    subtitle: 'Shiny, sanitised bathroom in no time.',
    badge: 'Instant Book',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    serviceId: '5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f',
  },
  {
    id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c05',
    title: 'Sofa & Carpet Revival',
    subtitle: 'Steam extraction & allergen removal.',
    badge: '30% Off',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    serviceId: '7e6f5a4b-3c2d-4e1f-0a9b-8c7d6e5f4a3b',
  },
  {
    id: 'f1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c06',
    title: 'Express Repairs & Plumbing',
    subtitle: 'Certified plumbers & fixers at your door.',
    badge: 'From ₹199',
    imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80',
    serviceId: '9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d',
  },
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: REAL_CLEANING_CATEGORY_ID, // Official real backend UUID
    name: 'Cleaning',
    subtitle: 'Home, kitchen, bathroom...',
    iconName: 'vacuum',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['Home Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning', 'Sofa Cleaning', 'Deep Cleaning'],
    accentColor: '#F8BD38',
  },
  {
    id: '7c9a4b21-8840-4fe7-b769-d3ef62c4a901',
    name: 'Repairs',
    subtitle: 'Plumbing, electrical...',
    iconName: 'wrench-outline',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['Plumbing', 'Electrical', 'Carpentry', 'Appliance Repair'],
    accentColor: '#3D7A68',
  },
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    name: 'Beauty',
    subtitle: 'Salon, massage, skincare...',
    iconName: 'sparkles-outline',
    iconType: 'Ionicons',
    subcategories: ['Salon at Home', 'Massage Therapy', 'Skincare', 'Hair Services'],
    accentColor: '#E2847A',
  },
  {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    name: 'Appliances',
    subtitle: 'AC, washing machine, TV...',
    iconName: 'television-ambient-light',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['AC Service', 'Washing Machine', 'Refrigerator', 'TV Repair', 'Microwave'],
    accentColor: '#4A90E2',
  },
  {
    id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    name: 'Plumbing',
    subtitle: 'Pipes, leakage, fitting...',
    iconName: 'water-pump',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['Drain Cleaning', 'Tap & Pipe Leakage', 'Water Tank Cleaning', 'Bathroom Fixtures'],
    accentColor: '#36B37E',
  },
  {
    id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    name: 'Electrical',
    subtitle: 'Wiring, switches, lights...',
    iconName: 'flash-outline',
    iconType: 'Ionicons',
    subcategories: ['Fan Repair & Install', 'Switchboard Repair', 'Fuse & Inverter', 'Decorative Lighting'],
    accentColor: '#FFAB00',
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    name: 'Carpentry',
    subtitle: 'Furniture, doors, locks...',
    iconName: 'hammer-screwdriver',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['Furniture Assembly', 'Door Locks & Hinges', 'Cupboard Repair', 'Custom Woodwork'],
    accentColor: '#8D6E63',
  },
  {
    id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
    name: 'Painting',
    subtitle: 'Home & office painting',
    iconName: 'format-paint',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['Full Home Painting', 'Waterproofing', 'Wall Stencils', 'Exterior Painting'],
    accentColor: '#9C27B0',
  },
  {
    id: '0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d',
    name: 'Pest Control',
    subtitle: 'Rodent, termite, general',
    iconName: 'bug-outline',
    iconType: 'Ionicons',
    subcategories: ['General Pest Control', 'Cockroach Control', 'Termite Control', 'Bed Bug Treatment'],
    accentColor: '#607D8B',
  },
  {
    id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
    name: 'Moving & Packing',
    subtitle: 'Shifting, loading, unloading',
    iconName: 'truck-fast-outline',
    iconType: 'MaterialCommunityIcons',
    subcategories: ['Home Shifting', 'Office Shifting', 'Intercity Moving', 'Vehicle Transport'],
    accentColor: '#009688',
  },
];

export const MOCK_SERVICES: Service[] = [
  {
    id: '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
    serviceId: '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
    categoryId: REAL_CLEANING_CATEGORY_ID,
    categoryName: 'Cleaning',
    name: 'Home Deep Cleaning',
    tagline: 'Deep clean made simple for everyone.',
    startingPrice: 999,
    duration: '2–3 hours',
    rating: 4.8,
    reviewsCount: 1240,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    discountBadge: '40% Off',
    description: 'Our Home Deep Clean service offers thorough, reliable cleaning for every room. We sanitize, refresh, and restore your living spaces, ensuring a sparkling, healthy environment that feels comfortable, welcoming, and spotless for your family.',
    included: [
      'Living room & dining area deep scrub & vacuuming',
      'Bedroom cleaning, wardrobe exterior & mattress dusting',
      'Complete kitchen degreasing & countertop sanitation',
      'Bathroom tile scrubbing, germ disinfection & scale removal',
      'Ceiling fan, switchboard & window sill dusting',
      'Balcony washing & floor mop with eco-safe disinfectant'
    ],
    excluded: [
      'Internal wardrobe organization unless requested',
      'Paint stain removal requiring chemical stripping',
      'Moving heavy antique furniture (>50 kg)'
    ],
    packages: [
      {
        id: 'c34b4032-95ed-4ed5-b5e9-a7f5ab8cd4f7',
        name: '1 BHK Deep Clean',
        price: 999,
        duration: '2.5 hrs',
        features: ['1 Bedroom + 1 Hall + 1 Kitchen + 1 Bath', 'Eco-friendly solutions', '2 Pro cleaners'],
        isPopular: false,
      },
      {
        id: 'd45c5143-a6fe-4fe6-c6fa-b8f6bc9de5a8',
        name: '2 BHK Premium Deep Clean',
        price: 1499,
        duration: '3.5 hrs',
        features: ['2 Bedrooms + Hall + Kitchen + 2 Baths', 'Steam sanitation included', '3 Pro cleaners'],
        isPopular: true,
      },
      {
        id: 'e56d6254-b7af-4af7-d7ab-c9a7cdaef6b9',
        name: '3 BHK Deluxe Clean',
        price: 1999,
        duration: '4.5 hrs',
        features: ['3 Bedrooms + Hall + Kitchen + 3 Baths', 'Full appliance wipe & steam', '4 Pro cleaners'],
        isPopular: false,
      }
    ],
    reviews: [
      {
        id: 'rev-1',
        userName: 'Aarav Sharma',
        rating: 5,
        date: '2 days ago',
        comment: 'Superb service! The cleaners were punctual, courteous, and brought industrial-grade equipment. My living room and kitchen look brand new!'
      },
      {
        id: 'rev-2',
        userName: 'Sneha Patel',
        rating: 4.8,
        date: '1 week ago',
        comment: 'Impressed with how meticulous they were with the bathroom tiles and stubborn kitchen grease. Highly recommended!'
      }
    ],
    faqs: [
      {
        question: 'Do I need to provide cleaning chemicals or equipment?',
        answer: 'No, our certified professionals bring all top-grade eco-friendly cleaning supplies, vacuum cleaners, and microfiber gear with them.'
      },
      {
        question: 'How long does the deep cleaning take?',
        answer: 'Depending on the property size, 1 BHK takes ~2.5 hrs, 2 BHK ~3.5 hrs, and 3 BHK ~4.5 hrs.'
      }
    ]
  },
  {
    id: '4b3c2d1e-0f9a-4b8c-7d6e-5f4a3b2c1d0e',
    serviceId: '4b3c2d1e-0f9a-4b8c-7d6e-5f4a3b2c1d0e',
    categoryId: REAL_CLEANING_CATEGORY_ID,
    categoryName: 'Cleaning',
    name: 'Home Cleaning',
    tagline: 'Quick, easy cleaning for every home.',
    startingPrice: 399,
    duration: '2 hrs',
    rating: 4.8,
    reviewsCount: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80',
    discountBadge: '20% Off',
    description: 'Routine general home cleaning including thorough sweeping, mopping, dusting, surface wipe down, and garbage clearing for busy weekdays.',
    included: [
      'Floor sweeping and mop with antiseptic cleanser',
      'Dusting of tables, TV units, shelves, and doors',
      'Making beds and neatly arranging cushions',
      'Kitchen sink wash and trash disposal'
    ],
    excluded: [
      'Deep stain tile scrubbing',
      'Interior oven / chimney cleaning'
    ]
  },
  {
    id: '5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f',
    serviceId: '5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f',
    categoryId: REAL_CLEANING_CATEGORY_ID,
    categoryName: 'Cleaning',
    name: 'Quick Bathroom Clean',
    tagline: 'Shiny bathroom in no time.',
    startingPrice: 250,
    duration: '45 mins',
    rating: 4.6,
    reviewsCount: 611,
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    discountBadge: 'Hot',
    description: 'Specialized hard water stain removal, toilet pot disinfection, mirror polishing, and exhaust fan dusting for sparkling hygiene.',
    included: [
      'Toilet bowl & seat descaling & sanitization',
      'Tile wall scrub and floor scrubbing',
      'Wash basin, mirror, and chrome tap shine',
      'Exhaust fan and vent dusting'
    ],
    excluded: [
      'Plumbing repairs (can be booked separately)'
    ]
  },
  {
    id: '6d5e4f3a-2b1c-4d0e-9f8a-7b6c5d4e3f2a',
    serviceId: '6d5e4f3a-2b1c-4d0e-9f8a-7b6c5d4e3f2a',
    categoryId: REAL_CLEANING_CATEGORY_ID,
    categoryName: 'Cleaning',
    name: 'Quick Kitchen Cleaning',
    tagline: 'Kitchen spotless quickly.',
    startingPrice: 220,
    duration: '1 hr',
    rating: 4.7,
    reviewsCount: 540,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    discountBadge: 'Best Seller',
    description: 'Degrease countertops, stovetops, sinks, and exterior cabinets to keep your culinary workspace safe and hygienic.',
    included: [
      'Stovetop and burner grease removal',
      'Countertop tile wipe & disinfectant rinse',
      'Exterior chimney & cabinet surface wipe',
      'Kitchen sink cleaning and drain deodorizer'
    ],
    excluded: [
      'Internal cabinet emptying (extra add-on)'
    ]
  },
  {
    id: '7e6f5a4b-3c2d-4e1f-0a9b-8c7d6e5f4a3b',
    serviceId: '7e6f5a4b-3c2d-4e1f-0a9b-8c7d6e5f4a3b',
    categoryId: REAL_CLEANING_CATEGORY_ID,
    categoryName: 'Cleaning',
    name: 'Sofa & Carpet Cleaning',
    tagline: 'Carpets & upholstery cleaned fast.',
    startingPrice: 699,
    duration: '2 hrs',
    rating: 4.6,
    reviewsCount: 520,
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    discountBadge: '30% Off',
    description: 'Deep shampoo injection and industrial extraction that removes allergens, embedded dust, stubborn beverage stains, and pet odors.',
    included: [
      'High-power dry vacuuming for debris & pet hair',
      'Eco-friendly foam shampoo wash',
      'Moisture suction with 85% drying immediately',
      'Fabric deodorizer spray'
    ],
    excluded: [
      'Leather recoloring or rip repair'
    ]
  },
  {
    id: '8f7a6b5c-4d3e-4f2a-1b0c-9d8e7f6a5b4c',
    serviceId: '8f7a6b5c-4d3e-4f2a-1b0c-9d8e7f6a5b4c',
    categoryId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    categoryName: 'Appliances',
    name: 'AC Master Jet Servicing',
    tagline: 'Pure cooling and fresh air.',
    startingPrice: 499,
    duration: '1 hr',
    rating: 4.9,
    reviewsCount: 2100,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    discountBadge: 'Summer Special',
    description: 'High pressure foam jet cleaning of indoor cooling coils, filters, and outdoor condenser unit for peak cooling power and lower electric bills.',
    included: [
      'Indoor unit coil foam jet wash with catch jacket',
      'Filter and blower wheel deep flush',
      'Outdoor condenser unit power wash',
      'Gas pressure check and cooling measurement'
    ],
    excluded: [
      'Refrigerant gas refill if found leaking (billed extra)'
    ]
  },
  {
    id: '9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d',
    serviceId: '9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d',
    categoryId: '7c9a4b21-8840-4fe7-b769-d3ef62c4a901',
    categoryName: 'Repairs',
    name: 'Plumbing Repair & Leakage',
    tagline: 'Fast fixes for taps, pipes, and drains.',
    startingPrice: 199,
    duration: '45 mins',
    rating: 4.7,
    reviewsCount: 890,
    imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80',
    discountBadge: '',
    description: 'Expert plumbers equipped to resolve dripping taps, clogged drains, toilet flush valve leaks, and pipeline blockages quickly.',
    included: [
      'Comprehensive leak diagnosis',
      'Washer and seal replacements',
      'Drain snare clearing up to 5 meters',
      '30-day post-service warranty'
    ],
    excluded: [
      'Cost of replacement fixtures or new piping'
    ]
  },
  {
    id: '0b9a8b7c-6d5e-4f4a-3b2c-1d0e9f8a7b6c',
    serviceId: '0b9a8b7c-6d5e-4f4a-3b2c-1d0e9f8a7b6c',
    categoryId: '7c9a4b21-8840-4fe7-b769-d3ef62c4a901',
    categoryName: 'Repairs',
    name: 'Electrical Inspection & Repair',
    tagline: 'Certified electricians at your doorstep.',
    startingPrice: 179,
    duration: '30 mins',
    rating: 4.8,
    reviewsCount: 740,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    discountBadge: '',
    description: 'Safe, certified electrical diagnostics for flickering lights, tripped MCBs, faulty switches, and wiring faults.',
    included: [
      'Digital multimeter voltage & ground testing',
      'Switch / socket tighten and repair',
      'Ceiling fan regulator testing',
      'Safety check'
    ],
    excluded: [
      'New electrical panel installation'
    ]
  }
];

export const MOCK_ADDRESSES: Address[] = [
  {
    id: 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
    title: 'Home',
    type: 'Home',
    label: 'Home',
    addressLine: 'Flat 402, Lotus Residency, Road No. 12, KPHB Colony, Hyderabad',
    houseFlat: 'Flat 402, Lotus Residency',
    street: 'Road No. 12, KPHB Colony',
    area: 'Kukatpally',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500072',
    landmark: 'Near Forum Sujana Mall',
    isDefault: true,
    lat: 17.4938,
    lng: 78.3986,
    coordinates: { latitude: 17.4938, longitude: 78.3986 }
  },
  {
    id: 'f2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
    title: 'Work',
    type: 'Work',
    label: 'Work',
    addressLine: 'Floor 5, Building 12, Mindspace IT Park, Hitech City, Hyderabad',
    houseFlat: 'Floor 5, Building 12',
    street: 'Mindspace IT Park',
    area: 'Hitech City',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    landmark: 'Opposite Inorbit Mall',
    isDefault: false,
    lat: 17.4399,
    lng: 78.3758,
    coordinates: { latitude: 17.4399, longitude: 78.3758 }
  },
  {
    id: '03c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e',
    title: 'Other',
    type: 'Other',
    label: "Parents' House",
    addressLine: 'Villa 18, Green Meadows, Gachibowli Main Rd, Hyderabad',
    houseFlat: 'Villa 18, Green Meadows',
    street: 'Gachibowli Main Rd',
    area: 'Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    landmark: 'Behind DLF Cyber City',
    isDefault: false,
    lat: 17.4401,
    lng: 78.3489,
    coordinates: { latitude: 17.4401, longitude: 78.3489 }
  }
];

export const MOCK_PROFESSIONAL: Professional = {
  id: '6f2e1a3b-4c5d-6e7f-6a9b-1c2d3e4f5a6b',
  name: 'Raj Kumar',
  role: 'Home Cleaning Professional',
  rating: 4.9,
  reviewsCount: 320,
  phone: '+91 98765 12345',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  badge: 'Top Rated Pro',
  completedJobsCount: 480
};

export const MOCK_COUPONS: Coupon[] = [
  {
    code: 'WELCOME50',
    title: '50% Flat Off',
    description: 'Get 50% discount up to ₹250 on your very first home service booking.',
    discountPercent: 50,
    minOrderValue: 499,
    expiresOn: '31 Dec 2026',
    isValid: true,
  },
  {
    code: 'CLEAN200',
    title: '₹200 Instant Off',
    description: 'Save ₹200 on deep cleaning & hygiene packages.',
    discountAmount: 200,
    minOrderValue: 899,
    expiresOn: '15 Oct 2026',
    isValid: true,
  },
  {
    code: 'FESTIVE20',
    title: '20% Festive Savings',
    description: 'Valid across all appliance repairs and plumbing services.',
    discountPercent: 20,
    minOrderValue: 399,
    expiresOn: '05 Nov 2026',
    isValid: true,
  }
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    bookingId: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    userId: 'd3b07384-d113-4a1d-8d2a-c45f4486ecbc',
    userName: 'Rahul Sharma',
    userPhone: '+919876543210',
    workerId: '6f2e1a3b-4c5d-6e7f-6a9b-1c2d3e4f5a6b',
    workerName: 'Raj Kumar',
    workerPhone: '+919876512345',
    serviceId: '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
    serviceName: 'Home Deep Cleaning',
    serviceImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    address: MOCK_ADDRESSES[0],
    date: '20 Sep 2026',
    timeSlot: '10:00 AM – 12:00 PM',
    status: 'IN_PROGRESS',
    pinCode: '4821', // 4-digit security PIN from guide
    scheduledAt: '2026-09-20T10:00:00Z',
    userLat: 17.448293,
    userLng: 78.374182,
    baseAmount: 999,
    extraAmount: 0,
    discountAmount: 0,
    totalAmount: 1214,
    paymentStatus: 'COMPLETED',
    paymentMethod: 'ONLINE',
    payment: {
      method: 'UPI',
      status: 'success',
      transactionId: 'TXN-98421094',
      paidAt: '18 Sep 2026, 04:30 PM',
      subtotal: 999,
      platformFee: 30,
      taxes: 185,
      discount: 0,
      total: 1214
    },
    professional: MOCK_PROFESSIONAL,
    notes: 'Please sanitize balcony and use low perfume cleaners.',
    createdAt: '18 Sep 2026'
  },
  {
    id: 'c2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6e',
    bookingId: 'c2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6e',
    serviceId: '8f7a6b5c-4d3e-4f2a-1b0c-9d8e7f6a5b4c',
    serviceName: 'AC Master Jet Servicing',
    serviceImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    address: MOCK_ADDRESSES[1],
    date: '24 Sep 2026',
    timeSlot: '02:00 PM – 04:00 PM',
    status: 'upcoming',
    payment: {
      method: 'Card',
      status: 'success',
      transactionId: 'TXN-55219082',
      paidAt: '20 Sep 2026, 11:15 AM',
      subtotal: 499,
      platformFee: 30,
      taxes: 95,
      discount: 50,
      total: 574
    },
    createdAt: '20 Sep 2026'
  },
  {
    id: 'd3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7f',
    bookingId: 'd3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7f',
    serviceId: '5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f',
    serviceName: 'Quick Bathroom Clean',
    serviceImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    address: MOCK_ADDRESSES[0],
    date: '10 Aug 2026',
    timeSlot: '08:00 AM – 10:00 AM',
    status: 'completed',
    payment: {
      method: 'UPI',
      status: 'success',
      transactionId: 'TXN-31849102',
      paidAt: '10 Aug 2026, 09:45 AM',
      subtotal: 250,
      platformFee: 20,
      taxes: 48,
      discount: 0,
      total: 318
    },
    professional: {
      id: 'e4d5c6b7-a8f9-4a0b-1c2d-3e4f5a6b7c8d',
      name: 'Priya Sharma',
      role: 'Sanitation Expert',
      rating: 4.8,
      reviewsCount: 190,
      phone: '+91 98765 54321',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      completedJobsCount: 230
    },
    createdAt: '08 Aug 2026'
  }
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Professional Assigned',
    message: 'Raj Kumar has been assigned for your Home Deep Cleaning booking on 20 Sep 2026.',
    timestamp: '10 mins ago',
    read: false,
    type: 'professional',
    targetScreen: 'LiveTracking',
    targetParams: { bookingId: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
  },
  {
    id: 'notif-2',
    title: 'Booking Confirmed!',
    message: 'Your booking #b1a2c3d4 has been confirmed. Total paid: ₹1,214.',
    timestamp: '2 hours ago',
    read: false,
    type: 'booking',
    targetScreen: 'BookingDetails',
    targetParams: { bookingId: 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
  },
  {
    id: 'notif-3',
    title: '40% Off Weekend Sale 🌟',
    message: 'Get up to 40% discount on AC and sofa cleaning this weekend using code FESTIVE20.',
    timestamp: '1 day ago',
    read: true,
    type: 'offer',
    targetScreen: 'OffersCoupons'
  }
];
