import { useEffect, useState, type FormEvent, type Ref } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Combobox, type ComboOption } from '@/components/Combobox';
import { TextInput } from '@/components/Field';
import { validateFare } from '@/lib/bookingMessages';
import { loadVehicleOptions } from '../vehicles/vehicleOptions';
import styles from './BookingForm.module.css';

export interface BookingInput {
  vehicleId: string;
  fare: string;
}

interface BookingFormProps {
  riderName: string;
  initialVehicle: ComboOption | null;
  submitting: boolean;
  onSubmit: (input: BookingInput) => void;
  fareRef?: Ref<HTMLInputElement>;
}

/**
 * Vehicle + fare. Checks the fare before sending (quick feedback);
 * sp_atomic_booking validates again and has the final word. Values are kept
 * after a failed booking so nothing has to be retyped.
 */
export function BookingForm({ riderName, initialVehicle, submitting, onSubmit, fareRef }: BookingFormProps) {
  const [vehicle, setVehicle] = useState<ComboOption | null>(initialVehicle);
  const [fare, setFare] = useState('');
  const [touched, setTouched] = useState(false);

  // A vehicle chosen on the map arrives after the form first renders.
  useEffect(() => {
    if (initialVehicle) setVehicle(initialVehicle);
  }, [initialVehicle]);

  const fareError = touched ? validateFare(fare) : null;
  const vehicleError = touched && !vehicle ? 'Choose a vehicle.' : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!vehicle || validateFare(fare)) return;
    onSubmit({ vehicleId: vehicle.id, fare: fare.trim() });
  };

  const reset = () => {
    setVehicle(null);
    setFare('');
    setTouched(false);
  };

  return (
    <Card title="New trip">
      <form className={styles.form} onSubmit={submit} noValidate>
        <fieldset className={styles.fields} disabled={submitting}>
          <TextInput label="Rider" value={`${riderName} (from View as)`} readOnly />
          <Combobox
            label="Vehicle"
            queryKey="vehicles"
            loadOptions={loadVehicleOptions}
            value={vehicle}
            onChange={setVehicle}
            placeholder="Search by plate…"
            error={vehicleError}
          />
          <TextInput
            ref={fareRef}
            label="Fare"
            prefix="$"
            inputMode="decimal"
            autoComplete="off"
            placeholder="24.50"
            value={fare}
            onChange={(e) => setFare(e.target.value)}
            onBlur={() => fare && setTouched(true)}
            error={fareError}
            helper="More than $0.00 and no more than your balance."
            fieldClassName={styles.fare}
          />
        </fieldset>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitting ? 'Booking…' : 'Book trip'}
          </Button>
          <Button onClick={reset} disabled={submitting}>
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
