import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CreatorsPage from './pages/CreatorsPage';
import CreatorDetailPage from './pages/CreatorDetailPage';
import BriefsPage from './pages/BriefsPage';
import BriefDetailPage from './pages/BriefDetailPage';
import PostBriefPage from './pages/brand/PostBriefPage';
import CreatorDashboard from './pages/creator/CreatorDashboard';
import PortfolioManagerPage from './pages/creator/PortfolioManagerPage';
import BrandDashboard from './pages/brand/BrandDashboard';
import SavedCreatorsPage from './pages/brand/SavedCreatorsPage';
import DataModelAndPitchPage from './pages/DataModelAndPitchPage';

export default function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#13131f',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1rem',
            fontSize: '0.875rem',
          },
        }}
      />
      <Layout>
        <Routes>
          {/* Public Market Discovery Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/creators/:id" element={<CreatorDetailPage />} />
          <Route path="/briefs" element={<BriefsPage />} />
          <Route path="/briefs/:id" element={<BriefDetailPage />} />
          <Route path="/demo-deck" element={<DataModelAndPitchPage />} />

          {/* Brand Dedicated Routes */}
          <Route path="/brand/dashboard" element={<BrandDashboard />} />
          <Route path="/brand/my-briefs" element={<BrandDashboard />} />
          <Route path="/brand/profile" element={<BrandDashboard />} />
          <Route path="/brand/post-brief" element={<PostBriefPage />} />
          <Route path="/brand/saved" element={<SavedCreatorsPage />} />

          {/* Creator Dedicated Routes */}
          <Route path="/creator/dashboard" element={<CreatorDashboard />} />
          <Route path="/creator/portfolio" element={<PortfolioManagerPage />} />
          <Route path="/creator/profile" element={<CreatorDetailPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
