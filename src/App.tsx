import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState, useEffect } from 'react';
import usePageStatePersistence from './hooks/usePageStatePersistence';
import { clearDummyData } from './utils/clearDummyData';

import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import WorkshopPage from './pages/workshopPage';
import Resort from './pages/Resort';
import Blog from './pages/Blog';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import UserAccount from './pages/UserAccount';
import AdminSignIn from './pages/AdminSignIn';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminWorkshops from './pages/admin/AdminWorkshops';
import AdminSignupData from './pages/admin/AdminSignupData';
import AdminSigninData from './pages/admin/AdminSigninData';
import AdminCartData from './pages/admin/AdminCartData';
import AdminContactData from './pages/admin/AdminContactData';
import AdminAccounting from './pages/admin/AdminAccounting';
import CertificateCreator from './pages/admin/CertificateCreator';
import SadhakaPlannerPage from './pages/SadhakaPlannerPage';
import SwarCalendar from './pages/SwarCalendar';
import NotFoundPage from './pages/NotFoundPage';
import WorkshopListPage from './pages/WorkshopListPage';
import WorkshopDetailPage from './pages/WorkshopDetailPage';
import RegistrationPage from './pages/RegistrationPage';
import MyCoursesPage from './pages/MyCoursesPage';
import CoursePlayerPage from './pages/CoursePlayerPage';
import AdminWorkshopPage from './pages/AdminWorkshopPage';

// Note: AuthProvider, AdminProvider, AdminAuthProvider, AdminDataProvider
// are already provided in main.tsx
// We only add the remaining context providers here
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';

// Protected Route Component for Admin Pages
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin session exists
    const adminUser = localStorage.getItem('adminUser');
    setIsAuthenticated(!!adminUser);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <AdminSignIn />;
};

function App() {
  const { restoreLastPage } = usePageStatePersistence();
  const [pageRestored, setPageRestored] = useState(false);

  useEffect(() => {
    // Clean up any dummy/sample data on app mount
    clearDummyData();
    
    // Restore last visited page on app mount
    const restorePage = async () => {
      const restored = await restoreLastPage();
      setPageRestored(true);
    };
    
    restorePage();
  }, []);

  // Show loading while page restoration is in progress
  if (!pageRestored) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <CartProvider>
        <div className="min-h-screen bg-white">
          <ScrollToTop />
          <Routes>
                  <Route path="/" element={<><Header /><HomePage /><Footer /></>} />
                  <Route path="/about" element={<><Header /><AboutPage /><Footer /></>} />
                  <Route path="/contact" element={<><Header /><ContactPage /><Footer /></>} />
                  <Route path="/workshops" element={<><Header /><WorkshopPage /><Footer /></>} />
                  {/* Block legacy/invalid register shortcut */}
                  <Route path="/workshops/register" element={<Navigate to="/workshops" replace />} />
                  {/* Slug-based workshop URLs */}
                  <Route path="/workshops/:workshopId" element={<><Header /><WorkshopDetailPage /><Footer /></>} />
                  <Route path="/workshops/:workshopId/register" element={<><Header /><RegistrationPage /><Footer /></>} />
                  <Route path="/resort" element={<><Header /><Resort /><Footer /></>} />
                  <Route path="/blog" element={<><Header /><Blog /><Footer /></>} />
                  <Route path="/cart" element={<><Header /><CartPage /><Footer /></>} />
                  <Route path="/checkout" element={<><Header /><CheckoutPage /><Footer /></>} />
                  <Route path="/signin" element={<><Header /><SignInPage /><Footer /></>} />
                  <Route path="/signup" element={<><Header /><SignUpPage /><Footer /></>} />
                  <Route path="/account" element={<><Header /><UserAccount /><Footer /></>} />
                  <Route path="/workshop-list" element={<><Header /><WorkshopListPage /><Footer /></>} />
                  <Route path="/workshop/:workshopId" element={<><Header /><WorkshopDetailPage /><Footer /></>} />
                  <Route path="/workshop/:workshopId/register" element={<><Header /><RegistrationPage /><Footer /></>} />
                  <Route path="/my-courses" element={<><Header /><MyCoursesPage /><Footer /></>} />
                  <Route path="/course/:enrollmentId/player" element={<CoursePlayerPage />} />
                  <Route path="/admin/workshop-management" element={<ProtectedAdminRoute><AdminWorkshopPage /></ProtectedAdminRoute>} />
                  <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
                  <Route path="/admin/workshops" element={<ProtectedAdminRoute><AdminWorkshops /></ProtectedAdminRoute>} />
                  <Route path="/admin/signup-data" element={<ProtectedAdminRoute><AdminSignupData /></ProtectedAdminRoute>} />
                  <Route path="/admin/signin-data" element={<ProtectedAdminRoute><AdminSigninData /></ProtectedAdminRoute>} />
                  <Route path="/admin/cart-data" element={<ProtectedAdminRoute><AdminCartData /></ProtectedAdminRoute>} />
                  <Route path="/admin/contact-data" element={<ProtectedAdminRoute><AdminContactData /></ProtectedAdminRoute>} />
                  <Route path="/admin/accounting" element={<ProtectedAdminRoute><AdminAccounting /></ProtectedAdminRoute>} />
                  <Route path="/admin/certificates" element={<ProtectedAdminRoute><CertificateCreator /></ProtectedAdminRoute>} />
                  <Route path="/accounting" element={<ProtectedAdminRoute><AdminAccounting /></ProtectedAdminRoute>} />
                  <Route path="/sadhaka-planner" element={<><Header /><SadhakaPlannerPage /><Footer /></>} />
                  <Route path="/swar-calendar" element={<><Header /><SwarCalendar /><Footer /></>} />
                  {/* Catch-all route - 404 page */}
                  <Route path="*" element={<><Header /><NotFoundPage /><Footer /></>} />
                </Routes>

                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="light"
                />
              </div>
            </CartProvider>
          </ThemeProvider>
        );
      }

export default App;