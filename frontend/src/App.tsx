import { Navigate, Route, Routes } from 'react-router-dom';
import { HealthPage } from './pages/HealthPage';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { M4DashboardPage } from './modules/M4/pages/M4DashboardPage';
import { OptimizationWorkspacePage } from './modules/M4/pages/OptimizationWorkspacePage';
import { ScenariosPage } from './modules/M4/pages/ScenariosPage';
import { ResultsPage } from './modules/M4/pages/ResultsPage';
import { SensitivityPage } from './modules/M4/pages/SensitivityPage';
import { BacktestingPage } from './modules/M4/pages/BacktestingPage';
import { DatasetManagementPage } from './modules/M4/pages/DatasetManagementPage';
import { ModelManagementPage } from './modules/M4/pages/ModelManagementPage';
import { AppShellLayout } from './shared/layouts/AppShellLayout';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/health" element={<HealthPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Application Shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppShellLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<M4DashboardPage />} />
          <Route path="/m4/workspace" element={<OptimizationWorkspacePage />} />
          <Route path="/m4/scenarios" element={<ScenariosPage />} />
          <Route path="/m4/results" element={<ResultsPage />} />
          <Route path="/m4/sensitivity" element={<SensitivityPage />} />
          <Route path="/m4/backtesting" element={<BacktestingPage />} />
          <Route path="/m4/datasets" element={<DatasetManagementPage />} />
          <Route path="/m4/models" element={<ModelManagementPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
