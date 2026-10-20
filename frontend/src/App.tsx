import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { HealthPage } from './pages/HealthPage';
import { BatchListPage } from './pages/BatchListPage';
import { BatchCreatePage } from './pages/BatchCreatePage';
import { BatchDetailPage } from './pages/BatchDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/batches" element={<BatchListPage />} />
      <Route path="/batches/new" element={<BatchCreatePage />} />
      <Route path="/batches/:id" element={<BatchDetailPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
