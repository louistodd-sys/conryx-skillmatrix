import { Toaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import SkillsMatrix from './pages/SkillsMatrix';
import GapAnalysis from './pages/GapAnalysis';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import UsersPage from './pages/UsersPage';
import UserProfile from './pages/UserProfile';
import SkillsLibrary from './pages/SkillsLibrary';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import MyProfile from './pages/MyProfile';
import Onboarding from './pages/Onboarding';
import People from './pages/People';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import DataProcessingAgreement from './pages/DataProcessingAgreement';
import CookieConsentBanner from './components/CookieConsentBanner';
import UpgradeBrc from './pages/UpgradeBrc';
import BrcDashboard from './pages/brc/BrcDashboard';
import BrcClauses from './pages/brc/BrcClauses';
import BrcClauseDetail from './pages/brc/BrcClauseDetail';
import BrcDocuments from './pages/brc/BrcDocuments';
import BrcSettings from './pages/brc/BrcSettings';
import BrcAudits from './pages/brc/BrcAudits';
import BrcNonConformances from './pages/brc/BrcNonConformances';
import BrcCapas from './pages/brc/BrcCapas';
import BrcSuppliers from './pages/brc/BrcSuppliers';
import BrcCalibration from './pages/brc/BrcCalibration';
import BrcComplaints from './pages/brc/BrcComplaints';
import BrcManagementReview from './pages/brc/BrcManagementReview';
import BrcGlassRegister from './pages/brc/BrcGlassRegister';
import BrcPestControl from './pages/brc/BrcPestControl';
import BrcTraining from './pages/brc/BrcTraining';
import BrcActionCentre from './pages/brc/BrcActionCentre';
import BrcAnalytics from './pages/brc/BrcAnalytics';
import BrcAuditChecklist from './pages/brc/BrcAuditChecklist';
import BrcDocumentDetail from './pages/brc/BrcDocumentDetail';
import BrcGuide from './pages/brc/BrcGuide';
import { BrcAuditDetail, BrcNonConformanceDetail, BrcSupplierDetail, BrcCalibrationDetail, BrcComplaintDetail } from './pages/brc/BrcStub';
import { Navigate } from 'react-router-dom';
import LoginPage from './lib/LoginPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Not authenticated — show landing page, legal pages; everything else → landing
  if (!isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/dpa" element={<DataProcessingAgreement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieConsentBanner />
      </>
    );
  }

  // Authenticated but no org yet — must complete onboarding
  const { user } = useAuth();
  if (user && !user.organisation_id) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/dpa" element={<DataProcessingAgreement />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* Legal pages — accessible without sidebar layout */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="/dpa" element={<DataProcessingAgreement />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matrix" element={<SkillsMatrix />} />
          <Route path="/gap-analysis" element={<GapAnalysis />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<TeamDetail />} />
          <Route path="/people" element={<People />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:userId" element={<UserProfile />} />
          <Route path="/skills-library" element={<SkillsLibrary />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/my-profile" element={<MyProfile />} />
        </Route>
        {/* BRC upgrade page — visible to Skills-Matrix-only orgs */}
        <Route path="/upgrade-brc" element={<UpgradeBrc />} />

        {/* BRC Compliance Readiness routes */}
        <Route element={<Layout />}>
          <Route path="/brc"                                  element={<BrcDashboard />} />
          <Route path="/brc/clauses"                          element={<BrcClauses />} />
          <Route path="/brc/clauses/:clauseId"                element={<BrcClauseDetail />} />
          <Route path="/brc/documents"                        element={<BrcDocuments />} />
          <Route path="/brc/documents/new"                    element={<BrcDocumentDetail />} />
          <Route path="/brc/documents/:documentId"            element={<BrcDocumentDetail />} />
          <Route path="/brc/audits"                           element={<BrcAudits />} />
          <Route path="/brc/audits/:auditId"                  element={<BrcAuditDetail />} />
          <Route path="/brc/non-conformances"                 element={<BrcNonConformances />} />
          <Route path="/brc/non-conformances/:ncId"           element={<BrcNonConformanceDetail />} />
          <Route path="/brc/capas"                            element={<BrcCapas />} />
          <Route path="/brc/suppliers"                        element={<BrcSuppliers />} />
          <Route path="/brc/suppliers/:supplierId"            element={<BrcSupplierDetail />} />
          <Route path="/brc/calibration"                      element={<BrcCalibration />} />
          <Route path="/brc/calibration/:recordId"            element={<BrcCalibrationDetail />} />
          <Route path="/brc/complaints"                       element={<BrcComplaints />} />
          <Route path="/brc/complaints/:complaintId"          element={<BrcComplaintDetail />} />
          <Route path="/brc/management-review"                element={<BrcManagementReview />} />
          <Route path="/brc/glass-register"                   element={<BrcGlassRegister />} />
          <Route path="/brc/pest-control"                     element={<BrcPestControl />} />
          <Route path="/brc/training"                         element={<BrcTraining />} />
          <Route path="/brc/action-centre"                    element={<BrcActionCentre />} />
          <Route path="/brc/analytics"                        element={<BrcAnalytics />} />
          <Route path="/brc/audit-checklist"                  element={<BrcAuditChecklist />} />
          <Route path="/brc/guide"                            element={<BrcGuide />} />
          <Route path="/brc/settings"                         element={<BrcSettings />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <CookieConsentBanner />
    </>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster position="top-right" richColors closeButton />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App