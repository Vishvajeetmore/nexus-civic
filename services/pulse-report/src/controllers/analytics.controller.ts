import type { Request, Response } from 'express';
import { Grievance } from '@nexus-civic/db';

import { DEPARTMENT_ROUTING } from '../config/departments';
import { successResponse } from '../utils/response';

function getSlaHoursForRecord(priority: string, category: string): number {
  const department = DEPARTMENT_ROUTING[category] ?? DEPARTMENT_ROUTING.other;

  switch (priority) {
    case 'CRITICAL':
      return department.slaHours.critical;
    case 'HIGH':
      return department.slaHours.high;
    case 'LOW':
      return department.slaHours.low;
    case 'MEDIUM':
    default:
      return department.slaHours.medium;
  }
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

type ResolutionInput = {
  createdAt: Date;
  statusHistory?: Array<{ status: string; timestamp: Date }>;
};

function getResolvedAt(record: ResolutionInput): Date | null {
  if (!record.statusHistory || record.statusHistory.length === 0) {
    return null;
  }

  const resolvedEntry = [...record.statusHistory]
    .reverse()
    .find((entry) => entry.status === 'RESOLVED' || entry.status === 'CLOSED');

  return resolvedEntry?.timestamp ?? null;
}

export async function getSummary(_req: Request, res: Response): Promise<void> {
  const [statusSummary, categorySummary, total, criticalOpen, resolvedRows] = await Promise.all([
    Grievance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Grievance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Grievance.countDocuments({}),
    Grievance.countDocuments({
      priority: 'CRITICAL',
      status: { $nin: ['RESOLVED', 'CLOSED'] },
    }),
    Grievance.find({ status: { $in: ['RESOLVED', 'CLOSED'] } }).select({
      createdAt: 1,
      statusHistory: 1,
    }),
  ]);

  const resolutionHours = resolvedRows
    .map((row) => {
      const resolvedAt = getResolvedAt(row as ResolutionInput);
      if (!resolvedAt) {
        return null;
      }
      return (resolvedAt.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60);
    })
    .filter((hours): hours is number => typeof hours === 'number' && Number.isFinite(hours));

  const avgResolutionHours =
    resolutionHours.length > 0
      ? Number((resolutionHours.reduce((sum, item) => sum + item, 0) / resolutionHours.length).toFixed(2))
      : 0;

  res.json(
    successResponse({
      total,
      byStatus: statusSummary,
      byCategory: categorySummary,
      avgResolutionHours,
      criticalOpen,
    })
  );
}

export async function getTrends(_req: Request, res: Response): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = (await Grievance.aggregate([
    { $match: { createdAt: { $gte: cutoff } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          category: '$category',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1, '_id.category': 1 } },
  ])) as Array<{ _id: { date: string; category: string }; count: number }>;

  res.json(
    successResponse(
      rows.map((row) => ({
        date: row._id.date,
        category: row._id.category,
        count: row.count,
      }))
    )
  );
}

export async function getSLAReport(_req: Request, res: Response): Promise<void> {
  const grievances = await Grievance.find({}).select({
    category: 1,
    priority: 1,
    status: 1,
    createdAt: 1,
    statusHistory: 1,
  });

  const complianceByDepartment: Record<
    string,
    { departmentId: string; departmentName: string; resolved: number; withinSLA: number }
  > = {};

  grievances.forEach((row) => {
    const department = DEPARTMENT_ROUTING[row.category] ?? DEPARTMENT_ROUTING.other;
    const key = department.departmentId;

    if (!complianceByDepartment[key]) {
      complianceByDepartment[key] = {
        departmentId: department.departmentId,
        departmentName: department.name,
        resolved: 0,
        withinSLA: 0,
      };
    }

    const resolvedAt = getResolvedAt(row as ResolutionInput);
    if (!resolvedAt) {
      return;
    }

    const slaHours = getSlaHoursForRecord(row.priority, row.category);
    const elapsedHours = (resolvedAt.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60);

    complianceByDepartment[key].resolved += 1;
    if (elapsedHours < slaHours) {
      complianceByDepartment[key].withinSLA += 1;
    }
  });

  const report = Object.values(complianceByDepartment)
    .map((row) => ({
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      resolvedCount: row.resolved,
      resolvedWithinSLA: row.withinSLA,
      compliancePercent: row.resolved > 0 ? Number(((row.withinSLA / row.resolved) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.compliancePercent - b.compliancePercent);

  res.json(successResponse(report));
}
