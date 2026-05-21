import type { Plan } from '@/app/community/types';

/** Pristine or user-edited V1 import */
export function isV1Version(v: number | null | undefined): boolean {
  return v === 1 || v === 3;
}

/** Manual / V2 or user-edited V2; null/undefined treated as V2 for legacy rows */
export function isV2Version(v: number | null | undefined): boolean {
  return v === 2 || v === 4 || v == null;
}

/** Row counts as V1 for filters/UI (DB `version` or legacy synthetic id from old external merge). */
export function isV1Plan(plan: Plan): boolean {
  return isV1Version(plan.version) || plan._id?.toString().startsWith('v1-') === true;
}

/** After a user edit (table, chart prediction, scrape upsert, etc.): 1→3, 2→4; 3 and 4 unchanged. */
export function bumpPlanVersionOnUserEdit(version: number | null | undefined): number {
  if (version === 1) return 3;
  if (version === 2) return 4;
  if (version === 3 || version === 4) return version;
  return 4;
}
