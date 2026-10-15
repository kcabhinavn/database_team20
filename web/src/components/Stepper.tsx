import styles from './Stepper.module.css';

interface StepperProps {
  steps: { key: string; label: string }[];
  /** Index of the current step. */
  current: number;
  label: string;
}

/** Progress through ordered states (trip status). The current step is ringed. */
export function Stepper({ steps, current, label }: StepperProps) {
  return (
    <ol className={styles.stepper} aria-label={label}>
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={step.key} className={[styles.step, styles[state]].join(' ')} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={styles.dot} aria-hidden="true">
              {state === 'done' ? '✓' : ''}
            </span>
            <span className={styles.label}>
              {step.label}
              <span className="visually-hidden">{state === 'done' ? ' (done)' : state === 'current' ? ' (current)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
