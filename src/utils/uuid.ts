/**
 * Utility functions for UUID handling and date formatting compatible with PostgreSQL backend.
 * Ensures the PostgreSQL database never receives invalid strings like 'cat-cleaning' or 'srv-deep-clean'.
 */

export const REAL_CLEANING_CATEGORY_ID = 'be8bb640-cc11-4243-ab4a-5cbdf34a0937';

const KNOWN_ID_MAP: Record<string, string> = {
  // Categories
  'cat-cleaning': REAL_CLEANING_CATEGORY_ID,
  'cat-repairs': '7c9a4b21-8840-4fe7-b769-d3ef62c4a901',
  'cat-beauty': 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'cat-appliances': 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  'cat-plumbing': 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
  'cat-electrical': 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
  'cat-carpentry': 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
  'cat-painting': 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
  'cat-pest': '0a1b2c3d-4e5f-4a6b-7c8d-9e0f1a2b3c4d',
  'cat-moving': '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',

  // Services
  'srv-deep-clean': '3a2b1c0d-9e8f-4a7b-6c5d-4e3f2a1b0c9d',
  'srv-home-cleaning': '4b3c2d1e-0f9a-4b8c-7d6e-5f4a3b2c1d0e',
  'srv-bathroom-clean': '5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f',
  'srv-kitchen-clean': '6d5e4f3a-2b1c-4d0e-9f8a-7b6c5d4e3f2a',
  'srv-sofa-carpet': '7e6f5a4b-3c2d-4e1f-0a9b-8c7d6e5f4a3b',
  'srv-ac-service': '8f7a6b5c-4d3e-4f2a-1b0c-9d8e7f6a5b4c',
  'srv-plumbing-fix': '9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d',
  'srv-electrical-fix': '0b9a8b7c-6d5e-4f4a-3b2c-1d0e9f8a7b6c',

  // Packages / Sub-services
  'pkg-1bhk': 'c34b4032-95ed-4ed5-b5e9-a7f5ab8cd4f7',
  'pkg-2bhk': 'd45c5143-a6fe-4fe6-c6fa-b8f6bc9de5a8',
  'pkg-3bhk': 'e56d6254-b7af-4af7-d7ab-c9a7cdaef6b9',
  'pkg-villa': 'f67e7365-c8ba-4ba8-e8bc-d0b8debf07ca',

  // Users
  'usr-1': 'd3b07384-d113-4a1d-8d2a-c45f4486ecbc',

  // Addresses
  'addr-1': 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
  'addr-2': 'f2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
  'addr-3': '03c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e',

  // Bookings
  'BK-89241': 'b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  'BK-87110': 'c2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6e',
  'BK-75302': 'd3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7f',
};

const LOOSE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: any): boolean {
  if (typeof id !== 'string') return false;
  return LOOSE_UUID_REGEX.test(id.trim());
}

export function generateUUID(): string {
  // RFC4122 version 4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function toValidUUID(id?: string, defaultUuid?: string): string {
  if (!id) return defaultUuid || generateUUID();
  const clean = id.trim();
  if (isValidUUID(clean)) return clean;
  if (KNOWN_ID_MAP[clean]) return KNOWN_ID_MAP[clean];
  return defaultUuid || generateUUID();
}

/**
 * Format any date string or Date object to YYYY-MM-DD for backend APIs
 */
export function formatDateToYYYYMMDD(dateInput?: string | Date): string {
  if (!dateInput) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
