/**
 * Generates density-aware transparent 3D-style navigation marker sprites.
 * Run: npm install --save-dev sharp && node scripts/generate-worker-marker.mjs
 * The generated PNG is a dimensional illustration, NOT a true 3D mesh/model.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'assets');
await mkdir(outputDir, { recursive: true });

const svg = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200" viewBox="0 0 160 200">
 <defs>
  <linearGradient id="helmet" x1="0" y1="0" x2="0.94" y2="1">
   <stop offset="0" stop-color="#f4fbff"/><stop offset="0.19" stop-color="#91c9ff"/>
   <stop offset="0.47" stop-color="#377ff2"/><stop offset="0.72" stop-color="#1650aa"/>
   <stop offset="1" stop-color="#081f54"/>
  </linearGradient>
  <linearGradient id="shirt" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stop-color="#c0e1ff"/><stop offset="0.24" stop-color="#599ffb"/>
   <stop offset="0.57" stop-color="#2462d6"/><stop offset="1" stop-color="#0a317e"/>
  </linearGradient>
  <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stop-color="#d2ecff"/><stop offset="0.16" stop-color="#60a5fa"/>
   <stop offset="0.48" stop-color="#2a69e5"/><stop offset="0.77" stop-color="#1450ac"/>
   <stop offset="1" stop-color="#061c4b"/>
  </linearGradient>
  <linearGradient id="rubber" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stop-color="#738397"/><stop offset="0.35" stop-color="#253348"/>
   <stop offset="0.8" stop-color="#080e1b"/><stop offset="1" stop-color="#475569"/>
  </linearGradient>
  <radialGradient id="glare" cx="0.27" cy="0.14" r="0.8">
   <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
   <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.1"/>
   <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
 </defs>
 <!-- Layered feathered contact shadow and soft ambient reflection -->
 <ellipse cx="82" cy="184" rx="60" ry="12" fill="#020617" opacity="0.065"/>
 <ellipse cx="82" cy="184" rx="47" ry="9" fill="#020617" opacity="0.095"/>
 <ellipse cx="82" cy="181" rx="31" ry="6" fill="#020617" opacity="0.18"/>
 <!-- back wheel behind body; far front tire -->
 <path d="M65 78 C65 60 95 60 96 78 L95 106 C90 115 71 115 65 106Z" fill="url(#rubber)"/>
 <path d="M68 86 Q81 80 93 86 L90 115 L72 115 Z" fill="#1e293b"/>
 <ellipse cx="81" cy="163" rx="21" ry="24" fill="url(#rubber)"/>
 <ellipse cx="81" cy="162" rx="12" ry="15" fill="#b1becc"/>
 <ellipse cx="81" cy="162" rx="7.5" ry="10" fill="#f1f5f9"/>
 <ellipse cx="81" cy="161" rx="3.6" ry="5.4" fill="#64748b"/>
 <!-- fork and polished back frame -->
 <path d="M67 77 Q61 84 57 114 L54 143 Q58 165 81 166 Q106 165 110 143 L106 114 Q100 84 94 77Z" fill="#061f4e"/>
 <path d="M69 84 Q61 106 58 142 Q66 154 82 155 Q101 152 107 142 L94 85Z" fill="url(#body)"/>
 <path d="M69 96 Q66 121 65 143 Q74 149 89 147 Q100 146 101 137 L92 95Z" fill="#76b5ff" opacity="0.37"/>
 <path d="M60 136 Q81 149 104 136 L109 151 Q80 170 54 149Z" fill="#0b3685"/>
 <path d="M64 144 Q81 151 99 144" stroke="#d9f0ff" stroke-width="3.5" opacity="0.7" fill="none" stroke-linecap="round"/>
 <!-- side panels and purposeful thin specular shine -->
 <path d="M60 113 L52 133 Q50 143 56 148 L64 153 Q61 139 65 123Z" fill="#072e76"/>
 <path d="M103 114 L111 133 Q116 145 108 151 L102 153 Q105 137 97 123Z" fill="#08275e"/>
 <path d="M61 113 Q56 128 58 137" stroke="#bfe2ff" opacity="0.55" stroke-width="2.5" fill="none"/>
 <!-- handlebars: dark curved metal and grips -->
 <path d="M42 82 Q80 65 119 82" fill="none" stroke="#0d1c36" stroke-width="11" stroke-linecap="round"/>
 <path d="M41 81 L29 78 M119 81 L131 78" fill="none" stroke="#172033" stroke-width="8" stroke-linecap="round"/>
 <path d="M32 78 L27 73 M128 78 L133 73" fill="none" stroke="#aebac9" stroke-width="3" stroke-linecap="round"/>
 <!-- arms and charcoal gloves -->
 <path d="M58 76 Q46 78 43 93 Q44 108 59 114 L72 94Z" fill="#0e3e91"/>
 <path d="M101 76 Q113 81 117 96 Q112 108 100 115 L89 93Z" fill="#0e316f"/>
 <path d="M45 92 Q41 90 34 87" fill="none" stroke="#192439" stroke-width="9" stroke-linecap="round"/>
 <path d="M115 93 Q122 90 127 87" fill="none" stroke="#172136" stroke-width="9" stroke-linecap="round"/>
 <!-- rider's shoulders and jacket with 3D contour -->
 <path d="M58 75 Q80 66 102 76 Q108 86 107 107 Q81 126 53 108 Q52 86 58 75Z" fill="url(#shirt)"/>
 <path d="M62 81 Q73 75 82 79 L80 113 Q64 109 58 105Z" fill="#b9dcff" opacity="0.26"/>
 <path d="M92 78 Q101 87 101 103 Q93 112 81 114 L83 80Z" fill="#072e75" opacity="0.38"/>
 <path d="M80 83 L80 111" stroke="#e5f4ff" stroke-width="2.4" opacity="0.5"/>
 <path d="M57 106 Q78 119 104 106" fill="none" stroke="#0a2b68" stroke-width="6" stroke-linecap="round"/>
 <!-- neck, helmet and visor as a 3D round volume -->
 <path d="M67 67 Q80 75 94 67 L92 78 Q80 83 69 77Z" fill="#253347"/>
 <path d="M56 46 C55 23 64 15 78 14 C96 14 107 27 107 48 L101 65 Q82 77 61 64Z" fill="url(#helmet)"/>
 <path d="M62 33 Q81 16 100 34 L103 47 Q82 54 60 47Z" fill="url(#glare)" opacity="0.85"/>
 <path d="M58 48 Q81 55 105 48 L100 62 Q82 67 62 60Z" fill="#101d38"/>
 <path d="M60 48 Q81 54 103 48" stroke="#d6f0ff" stroke-width="2" fill="none" opacity="0.85"/>
 <path d="M65 25 Q72 19 82 19" stroke="#fff" stroke-width="4.5" opacity="0.78" fill="none" stroke-linecap="round"/>
 <path d="M67 65 Q80 71 96 65" stroke="#061f4d" stroke-width="3.5" fill="none"/>
 <circle cx="66" cy="56" r="2" fill="#93c5fd"/>
 <circle cx="98" cy="56" r="2" fill="#93c5fd"/>
 <!-- rear light visible from the destination-facing view -->
 <path d="M68 132 Q81 136 94 132" stroke="#f8757d" stroke-width="5" stroke-linecap="round"/>
 <path d="M73 131 L89 131" stroke="#ffd0d3" stroke-width="1.5" opacity="0.85"/>
</svg>`;

for (const scale of [1, 2, 3, 4]) {
  const file = `worker-scooter-3d${scale === 1 ? '' : `@${scale}x`}.png`;
  await sharp(Buffer.from(svg))
    .resize({ width: 80 * scale, height: 100 * scale, fit: 'fill' })
    .png()
    .toFile(resolve(outputDir, file));
  console.log(`Wrote assets/${file}`);
}
