/**
 * Google S2 Geometry utilities using the node-s2 package.
 * Level 13 cells = ~1.2km² — used for neighbourhood safety scoring.
 * If node-s2 fails to import (build issues), falls back to a simple
 * grid hash based on rounding lat/lng to 2 decimal places.
 */

type NodeS2Module = {
  latLngToKey?: (lat: number, lng: number, level: number) => string;
  S2Cell?: {
    FromLatLng?: (latLng: { lat: number; lng: number }, level?: number) => { toHilbertQuadkey?: () => string };
  };
};

let cachedNodeS2: NodeS2Module | null | undefined;

function loadNodeS2(): NodeS2Module | null {
  if (cachedNodeS2 !== undefined) {
    return cachedNodeS2;
  }

  try {
    // Dynamic import to avoid hard failure when native build is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedNodeS2 = require('node-s2') as NodeS2Module;
  } catch {
    cachedNodeS2 = null;
  }

  return cachedNodeS2;
}

export function latLngToS2Cell(lat: number, lng: number): string {
  const nodeS2 = loadNodeS2();
  if (nodeS2) {
    if (typeof nodeS2.latLngToKey === 'function') {
      return nodeS2.latLngToKey(lat, lng, 13);
    }

    const cellFactory = nodeS2.S2Cell?.FromLatLng;
    if (typeof cellFactory === 'function') {
      const cell = cellFactory({ lat, lng }, 13);
      const key = cell?.toHilbertQuadkey?.();
      if (typeof key === 'string' && key.length > 0) {
        return key;
      }
    }
  }

  return `${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
}

export function calculateSafetyScore(incidents: Array<{ timestamp: Date; severity: number }>): number {
  if (incidents.length === 0) {
    return 100;
  }

  const now = Date.now();
  const totalImpact = incidents.reduce((sum, incident) => {
    const ageMs = now - new Date(incident.timestamp).getTime();
    const daysSince = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
    const decay = Math.exp(-daysSince / 15);
    return sum + Number(incident.severity) * decay * 5;
  }, 0);

  const score = 100 - totalImpact;
  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}
