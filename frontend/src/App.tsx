import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { HealthPage } from './pages/HealthPage';
import { DemandForecastPage } from './pages/DemandForecastPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/demand-forecast" element={<DemandForecastPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
