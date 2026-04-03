import type { Request, Response } from 'express';
import { SOSEvent } from '@nexus-civic/db';

import { calculateSafetyScore, latLngToS2Cell } from '../utils/s2geometry';

type HeatmapGroup = {
  _id: string;
  incidents: Array<{ timestamp: Date; severity: number }>;
  incidentCount: number;
  centroidLat: number;
  centroidLng: number;
};

export async function getSafetyHeatmap(_req: Request, res: Response): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const grouped = (await SOSEvent.aggregate([
    {
      $match: {
        createdAt: { $gte: cutoff },
        'location.s2CellId': { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$location.s2CellId',
        incidents: {
          $push: {
            timestamp: '$createdAt',
            severity: '$severity',
          },
        },
        incidentCount: { $sum: 1 },
        centroidLat: { $avg: '$location.lat' },
        centroidLng: { $avg: '$location.lng' },
      },
    },
  ])) as HeatmapGroup[];

  const featureCollection = {
    type: 'FeatureCollection',
    features: grouped.map((group) => {
      const score = calculateSafetyScore(group.incidents);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [group.centroidLng, group.centroidLat],
        },
        properties: {
          cellId: group._id,
          score,
          incidentCount: group.incidentCount,
        },
      };
    }),
  };

  res.json(featureCollection);
}

export async function getSafetyScore(req: Request, res: Response): Promise<void> {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({ success: false, error: 'lat and lng are required numeric query params', code: 400 });
    return;
  }

  const cellId = latLngToS2Cell(lat, lng);

  const incidents = await SOSEvent.find({ 'location.s2CellId': cellId }).select({ createdAt: 1, severity: 1 }).lean();
  const score = calculateSafetyScore(
    incidents.map((incident) => ({
      timestamp: new Date(incident.createdAt ?? new Date()),
      severity: Number(incident.severity ?? 1),
    }))
  );

  res.json({
    cellId,
    score,
    incidentCount: incidents.length,
  });
}

export async function getNearbyEvents(req: Request, res: Response): Promise<void> {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm ?? 2);

  if (Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radiusKm) || radiusKm <= 0) {
    res.status(400).json({ success: false, error: 'lat, lng and positive radiusKm are required', code: 400 });
    return;
  }

  let events;
  try {
    events = await SOSEvent.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .sort({ createdAt: -1 })
      .limit(20);
  } catch {
    // Backward-compatible fallback for legacy documents without GeoJSON location shape.
    events = await SOSEvent.find({
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusKm / 6378.1],
        },
      },
    })
      .sort({ createdAt: -1 })
      .limit(20);
  }

  res.json(events);
}
