import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useActor, type Role } from '@/context/ActorContext';
import { useCurrentPageTitle } from '@/context/PageTitleContext';
import { HOME, isInNav } from './navigation';
import { RiderPicker } from './RiderPicker';
import styles from './TopBar.module.css';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'rider', label: 'Rider' },
  { value: 'ops', label: 'Ops manager' },
];

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { role, setRole } = useActor();
  const { title, crumb } = useCurrentPageTitle();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const changeRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    if (!isInNav(next, pathname)) navigate(HOME[next]);
  };

  return (
    <header className={styles.bar}>
      <button type="button" className={styles.menu} onClick={onOpenNav} aria-label="Open menu">
        <span aria-hidden="true" />
      </button>
      <div className={styles.title}>
        {crumb ? (
          <>
            <Link to={crumb.to} className={styles.crumb}>
              {crumb.label}
            </Link>
            <span className={styles.slash} aria-hidden="true">
              /
            </span>
          </>
        ) : null}
        <h1>{title}</h1>
      </div>
      <div className={styles.actor}>
        <div className={styles.viewAs}>
          <span className={styles.viewAsLabel}>View as</span>
          <SegmentedControl label="View as" options={ROLE_OPTIONS} value={role} onChange={changeRole} />
        </div>
        <div className={styles.picker}>
          {role === 'rider' ? <RiderPicker /> : <p className={styles.opsChip}>Ops manager (demo)</p>}
        </div>
      </div>
    </header>
  );
}
