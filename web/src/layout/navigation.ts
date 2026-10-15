import type { Role } from '@/context/ActorContext';

export interface NavItem {
  to: string;
  label: string;
}

/** Each user type gets its own navigation over the same shared screens. */
export const NAV: Record<Role, NavItem[]> = {
  rider: [
    { to: '/map', label: 'Find a vehicle' },
    { to: '/book', label: 'Book a trip' },
    { to: '/trips', label: 'My trips' },
    { to: '/wallet', label: 'My wallet' },
    { to: '/reviews', label: 'Reviews' },
  ],
  ops: [
    { to: '/analytics', label: 'Overview' },
    { to: '/riders', label: 'Riders' },
    { to: '/vehicles', label: 'Vehicles' },
    { to: '/trips', label: 'Trips' },
    { to: '/map', label: 'Live map' },
    { to: '/reviews', label: 'Reviews' },
    { to: '/wallet', label: 'Wallet audit' },
  ],
};

export const HOME: Record<Role, string> = { rider: '/map', ops: '/analytics' };

/** Does `pathname` belong to a screen in this role's navigation? */
export function isInNav(role: Role, pathname: string): boolean {
  const first = `/${pathname.split('/')[1] ?? ''}`;
  return NAV[role].some((item) => item.to === first);
}
