import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BarberPage from './pages/BarberPage.jsx';
import DisplayPage from './pages/DisplayPage.jsx';
import HomePage from './pages/HomePage.jsx';
import JoinQueuePage from './pages/JoinQueuePage.jsx';
import LoadingPage from './pages/LoadingPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ReceptionPage from './pages/ReceptionPage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import StatusAccessPage from './pages/StatusAccessPage.jsx';
import { StaffAuthProvider } from './contexts/StaffAuthContext.jsx';

export default function App() {
  return (
    <StaffAuthProvider>
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinQueuePage />} />
          <Route path="/status" element={<StatusAccessPage />} />
          <Route path="/status/:id" element={<StatusPage />} />
          <Route path="/reception" element={<ReceptionPage />} />
          <Route path="/barber/:name" element={<BarberPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/display" element={<DisplayPage />} />
      </Routes>
    </Suspense>
    </StaffAuthProvider>
  );
}
