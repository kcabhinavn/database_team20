import { Navigate, Route, Routes } from 'react-router-dom';
import { useActor } from '@/context/ActorContext';
import AnalyticsPage from '@/features/analytics/AnalyticsPage';
import BookTripPage from '@/features/booking/BookTripPage';
import MapPage from '@/features/map/MapPage';
import NotFoundPage from '@/features/NotFoundPage';
import ReviewsPage from '@/features/reviews/ReviewsPage';
import RiderDetailPage from '@/features/riders/RiderDetailPage';
import RidersPage from '@/features/riders/RidersPage';
import TripDetailPage from '@/features/trips/TripDetailPage';
import TripsPage from '@/features/trips/TripsPage';
import VehicleDetailPage from '@/features/vehicles/VehicleDetailPage';
import VehiclesPage from '@/features/vehicles/VehiclesPage';
import WalletAuditPage from '@/features/wallet/WalletAuditPage';
import { AppShell } from '@/layout/AppShell';
import { HOME } from '@/layout/navigation';

function Home() {
  const { role } = useActor();
  return <Navigate to={HOME[role]} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="map" element={<MapPage />} />
        <Route path="book" element={<BookTripPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:tripId" element={<TripDetailPage />} />
        <Route path="wallet" element={<WalletAuditPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="riders" element={<RidersPage />} />
        <Route path="riders/:riderId" element={<RiderDetailPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
