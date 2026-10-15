import { NavLink } from 'react-router-dom';
import { useHealth } from '@/api/health';
import { useActor } from '@/context/ActorContext';
import { NAV } from './navigation';
import styles from './Sidebar.module.css';

function HealthDot({ label, state }: { label: string; state: 'ok' | 'down' | 'unknown' }) {
  const text = state === 'ok' ? 'connected' : state === 'down' ? 'not responding' : 'checking';
  return (
    <li className={styles.health}>
      <span className={[styles.dot, styles[state]].join(' ')} aria-hidden="true" />
      {label}
      <span className="visually-hidden">: {text}</span>
    </li>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role } = useActor();
  const health = useHealth();
  const pg = health.data?.postgres ?? (health.isError ? 'down' : 'unknown');
  const mongo = health.data?.mongo ?? (health.isError ? 'down' : 'unknown');

  return (
    <>
      <div className={[styles.backdrop, open ? styles.backdropOpen : ''].join(' ')} onClick={onClose} aria-hidden="true" />
      <aside className={[styles.sidebar, open ? styles.open : ''].join(' ')} aria-label="Main navigation">
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            R
          </span>
          RideSync
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
            {'✕'}
          </button>
        </div>
        <p className={styles.section}>{role === 'rider' ? 'Rider' : 'Operations'}</p>
        <nav>
          <ul className={styles.nav}>
            {NAV[role].map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.footer}>
          <p className={styles.section}>Data sources</p>
          <ul className={styles.healthList} aria-live="polite">
            <HealthDot label="Postgres" state={pg} />
            <HealthDot label="MongoDB" state={mongo} />
          </ul>
          <p className={styles.demo}>Demo mode {'·'} no login</p>
        </div>
      </aside>
    </>
  );
}
