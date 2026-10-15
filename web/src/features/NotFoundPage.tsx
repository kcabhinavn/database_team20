import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { HOME } from '@/layout/navigation';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  const { role } = useActor();
  return (
    <EmptyState title="There is no page at this address" action={<ButtonLink to={HOME[role]} variant="primary">Go to the start page</ButtonLink>}>
      The link may be old, or the address was mistyped.
    </EmptyState>
  );
}
