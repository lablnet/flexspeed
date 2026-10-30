import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { TestRuntime } from './stores/TestRuntime';
import { AboutPage } from './pages/AboutPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SpeedTestPage } from './pages/SpeedTestPage';
import { AuthProvider } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SharedResultPage } from './pages/SharedResultPage';
import { PrivacyPage } from './pages/PrivacyPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TestRuntime>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<SpeedTestPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="r/:id" element={<SharedResultPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </TestRuntime>
      </AuthProvider>
    </BrowserRouter>
  );
}
