/**
 * mapStyle.ts
 *
 * Minimal White / Light-Gray Google Maps Theme for HomeEase.
 *
 * Specification:
 * - White/off-white background: #FAFAFA
 * - Roads: light gray #E5E7EB
 * - Major roads: slightly darker #D1D5DB
 * - Water: very light blue #E0F2FE
 * - Parks: muted light green #F1F5F0
 * - Road names: dark gray #475569
 * - Locality names: gray #64748B
 * - Hide distracting business POIs and icons while preserving road labels, junctions, and landmarks.
 * - Light theme, fully compatible with Google Maps Android SDK.
 */

export const MINIMAL_LIGHT_MAP_STYLE = [
  // 1. Clean off-white background
  {
    elementType: 'geometry',
    stylers: [{ color: '#FAFAFA' }],
  },
  // 2. Hide POI icons to eliminate visual clutter
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  // 3. Crisp text labels for streets and landmarks
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FAFAFA' }, { weight: 2 }],
  },
  // 4. Locality and neighborhood labels in soft gray
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }],
  },
  // 5. Hide commercial / business POIs
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  // 6. Parks: muted light green
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'simplified' }, { color: '#F1F5F0' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }],
  },
  // 7. Standard local roads: light gray
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#E5E7EB' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#FAFAFA' }, { weight: 1 }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  // 8. Major roads and highways: slightly darker for clarity
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#D1D5DB' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E5E7EB' }, { weight: 1.5 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
  // 9. Arterial roads
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#E5E7EB' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  // 10. Hide transit stations / tracks for minimalist look
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  // 11. Water: very light refreshing blue
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#E0F2FE' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }],
  },
];
