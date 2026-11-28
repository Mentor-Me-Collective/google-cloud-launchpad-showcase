export interface SerializedChange {
  status: string;
  steps: { key: string; label: string; status: string; detail?: string }[];
  impact: { system: string; status: string; detail?: string }[];
  impactSummary: { updated: number; total: number; text: string };
}

export interface MeParent {
  kind: "parent";
  id: string;
  name: string;
  parentId: string;
  learnerId: string;
  learnerName: string;
  verified: boolean;
}

export interface MeStaff {
  kind: "staff";
  id: string;
  name: string;
  staffId: string;
  role: string;
  roleLabel: string;
}

export interface MeAdmin {
  kind: "admin";
  id: string;
  name: string;
  roleLabel: string;
}

export type Me = MeParent | MeStaff | MeAdmin;

/** Where each role lands after signing in. */
export function homeFor(me: Me | null): string {
  if (!me) return "/";
  return me.kind === "admin" ? "/admin" : me.kind === "staff" ? "/staff" : "/dashboard";
}

/** One line saying who is signed in, for the top bar. */
export function roleSummary(me: Me): string {
  return me.kind === "parent" ? `Parent of ${me.learnerName}` : me.roleLabel;
}
