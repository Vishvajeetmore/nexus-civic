export const SERVICE_URLS = {
  guardianNet:   process.env.NEXT_PUBLIC_GUARDIAN_NET_URL   || 'http://localhost:3001',
  pulseReport:   process.env.NEXT_PUBLIC_PULSE_REPORT_URL   || 'http://localhost:3002',
  civicPulse:    process.env.NEXT_PUBLIC_CIVIC_PULSE_URL    || 'http://localhost:3003',
  gigForge:      process.env.NEXT_PUBLIC_GIG_FORGE_URL      || 'http://localhost:3004',
  nearGive:      process.env.NEXT_PUBLIC_NEAR_GIVE_URL      || 'http://localhost:3005',
  terraScan:     process.env.NEXT_PUBLIC_TERRA_SCAN_URL     || 'http://localhost:3006',
  sentinelAI:    process.env.NEXT_PUBLIC_SENTINEL_AI_URL    || 'http://localhost:3007',
  voiceAssembly: process.env.NEXT_PUBLIC_VOICE_ASSEMBLY_URL || 'http://localhost:3008',
  ledgerCivic:   process.env.NEXT_PUBLIC_LEDGER_CIVIC_URL   || 'http://localhost:3009',
  meshAlert:     process.env.NEXT_PUBLIC_MESH_ALERT_URL     || 'http://localhost:3010',
  auraAssist:    process.env.NEXT_PUBLIC_AURA_ASSIST_URL    || 'http://localhost:3011',
};
export const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data);
