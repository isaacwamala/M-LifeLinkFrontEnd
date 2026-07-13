export const DASHBOARD_ROLES = {
  1: { key: 'administrator', label: 'Administrator Dashboard', path: '/dashboard/administrator' },
  3: { key: 'doctor',        label: 'Doctor Dashboard',        path: '/dashboard/doctor' },
  5: { key: 'pharmacist',    label: 'Pharmacist Dashboard',    path: '/dashboard/pharmacist' },
  6: { key: 'lab',           label: 'Laboratory Dashboard',    path: '/dashboard/laboratory' },
  9: { key: 'receptionist',  label: 'Receptionist Dashboard',  path: '/dashboard/receptionist' },
};

export const ROLE_PRIORITY_ORDER = [1, 3, 5, 6, 9];

/**
 * Returns the ordered list of dashboard entries the user qualifies for,
 * sorted by ROLE_PRIORITY_ORDER.
 *
 * @param {number[]|undefined} roleIds - array of numeric role IDs from the auth store
 * @returns {{ key: string, label: string, path: string }[]}
 */
export function getAvailableDashboards(roleIds) {
  if (!Array.isArray(roleIds) || roleIds.length === 0) return [];
  const idSet = new Set(roleIds.map(Number));
  return ROLE_PRIORITY_ORDER
    .filter((id) => idSet.has(id))
    .map((id) => DASHBOARD_ROLES[id]);
}
