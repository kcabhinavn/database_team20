import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UUID } from '@/api/types';
import { readStored, writeStored } from '@/lib/storage';

/**
 * Demo "login": who is using the app. The View-as switch picks the role; in
 * Rider mode `riderId` is the rider being acted as. Remembered per browser.
 */
export type Role = 'rider' | 'ops';

interface ActorState {
  role: Role;
  riderId: UUID | null;
  setRole: (role: Role) => void;
  setRiderId: (id: UUID | null) => void;
}

const ActorContext = createContext<ActorState | null>(null);

const ROLE_KEY = 'ridesync.role';
const RIDER_KEY = 'ridesync.riderId';

/** `?as=ops` or `?as=rider` in a link picks the role (handy for demo links). */
function roleFromUrl(): Role | null {
  try {
    const value = new URLSearchParams(window.location.search).get('as');
    return value === 'ops' || value === 'rider' ? value : null;
  } catch {
    return null;
  }
}

export function ActorProvider({ children, initialRole, initialRiderId }: {
  children: ReactNode;
  initialRole?: Role;
  initialRiderId?: UUID | null;
}) {
  const [role, setRoleState] = useState<Role>(() => {
    const fromUrl = roleFromUrl();
    if (fromUrl) writeStored(ROLE_KEY, fromUrl);
    return initialRole ?? fromUrl ?? (readStored(ROLE_KEY) === 'ops' ? 'ops' : 'rider');
  });
  const [riderId, setRiderIdState] = useState<UUID | null>(() =>
    initialRiderId !== undefined ? initialRiderId : readStored(RIDER_KEY),
  );

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    writeStored(ROLE_KEY, next);
  }, []);

  const setRiderId = useCallback((id: UUID | null) => {
    setRiderIdState(id);
    writeStored(RIDER_KEY, id);
  }, []);

  const value = useMemo(() => ({ role, riderId, setRole, setRiderId }), [role, riderId, setRole, setRiderId]);
  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

export function useActor(): ActorState {
  const ctx = useContext(ActorContext);
  if (!ctx) throw new Error('useActor must be used inside <ActorProvider>');
  return ctx;
}
