import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyOtpPage } from '@/pages/auth/VerifyOtpPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { OAuthSuccessPage } from '@/pages/auth/OAuthSuccessPage';
import { OnboardingLocationPage } from '@/pages/onboarding/OnboardingLocationPage';
import { OnboardingRolesPage } from '@/pages/onboarding/OnboardingRolesPage';
import { HomePage } from '@/pages/HomePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LanguageSettingsPage } from '@/pages/settings/LanguageSettingsPage';
import { HireBrowsePage } from '@/pages/hire/HireBrowsePage';
import { HireCategoryPage } from '@/pages/hire/HireCategoryPage';
import { WorkerDetailPage } from '@/pages/hire/WorkerDetailPage';
import { BecomeWorkerPage } from '@/pages/hire/BecomeWorkerPage';
import { RequestsInboxPage } from '@/pages/hire/RequestsInboxPage';
import { RequestsSentPage } from '@/pages/hire/RequestsSentPage';
import { ProfileVerifyPage } from '@/pages/profile/ProfileVerifyPage';
import { RentBrowsePage } from '@/pages/rent/RentBrowsePage';
import { RentCategoryPage } from '@/pages/rent/RentCategoryPage';
import { RentalDetailPage } from '@/pages/rent/RentalDetailPage';
import { ListAnItemPage } from '@/pages/rent/ListAnItemPage';
import { OwnerBookingsPage } from '@/pages/rent/OwnerBookingsPage';
import { MyBookingsPage } from '@/pages/rent/MyBookingsPage';
import { MarketBrowsePage } from '@/pages/market/MarketBrowsePage';
import { MarketCategoryPage } from '@/pages/market/MarketCategoryPage';
import { ProductDetailPage } from '@/pages/market/ProductDetailPage';
import { SellItemPage } from '@/pages/market/SellItemPage';
import { OrdersSellerPage } from '@/pages/market/OrdersSellerPage';
import { OrdersMinePage } from '@/pages/market/OrdersMinePage';
import { CommunityFeedPage } from '@/pages/community/CommunityFeedPage';
import { NewRequestPage } from '@/pages/community/NewRequestPage';
import { BloodRequestPage } from '@/pages/community/BloodRequestPage';
import { MedicalEmergencyPage } from '@/pages/community/MedicalEmergencyPage';
import { VolunteersPage } from '@/pages/community/VolunteersPage';
import { LostFoundPage } from '@/pages/community/LostFoundPage';
import { RequestDetailPage } from '@/pages/community/RequestDetailPage';
import { EmergencyContactsPage } from '@/pages/profile/EmergencyContactsPage';
import { LearnBrowsePage } from '@/pages/learn/LearnBrowsePage';
import { LearnSubjectPage } from '@/pages/learn/LearnSubjectPage';
import { CourseDetailPage } from '@/pages/learn/CourseDetailPage';
import { BecomeTrainerPage } from '@/pages/learn/BecomeTrainerPage';
import { MyCoursesPage } from '@/pages/learn/MyCoursesPage';
import { MyEnrollmentsPage } from '@/pages/learn/MyEnrollmentsPage';
import { TrainerEnrollmentsPage } from '@/pages/learn/TrainerEnrollmentsPage';
import { MessagesListPage } from '@/pages/chat/MessagesListPage';
import { ConversationPage } from '@/pages/chat/ConversationPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { AdminRoute } from './AdminRoute';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminVerificationsPage } from '@/pages/admin/AdminVerificationsPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminAnalyticsPage } from '@/pages/admin/AdminAnalyticsPage';

const router = createBrowserRouter([
  // Catch-all — must be first so React Router evaluates specific routes before it
  { path: '*', element: <NotFoundPage /> },

  // Public auth routes
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/auth/register', element: <RegisterPage /> },
  { path: '/auth/verify-otp', element: <VerifyOtpPage /> },
  { path: '/auth/forgot', element: <ForgotPasswordPage /> },
  { path: '/auth/reset', element: <ResetPasswordPage /> },
  { path: '/auth/oauth-success', element: <OAuthSuccessPage /> },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/onboarding/location', element: <OnboardingLocationPage /> },
      { path: '/onboarding/roles', element: <OnboardingRolesPage /> },
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/settings/language', element: <LanguageSettingsPage /> },
          { path: '/hire', element: <HireBrowsePage /> },
          { path: '/hire/:category', element: <HireCategoryPage /> },
          { path: '/workers/:id', element: <WorkerDetailPage /> },
          { path: '/become-a-worker', element: <BecomeWorkerPage /> },
          { path: '/requests/inbox', element: <RequestsInboxPage /> },
          { path: '/requests/sent', element: <RequestsSentPage /> },
          { path: '/profile/verify', element: <ProfileVerifyPage /> },
          { path: '/rent', element: <RentBrowsePage /> },
          { path: '/rent/:category', element: <RentCategoryPage /> },
          { path: '/rentals/:id', element: <RentalDetailPage /> },
          { path: '/list-an-item', element: <ListAnItemPage /> },
          { path: '/bookings/owner', element: <OwnerBookingsPage /> },
          { path: '/bookings/mine', element: <MyBookingsPage /> },
          { path: '/marketplace', element: <MarketBrowsePage /> },
          { path: '/marketplace/:category', element: <MarketCategoryPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/sell', element: <SellItemPage /> },
          { path: '/orders/seller', element: <OrdersSellerPage /> },
          { path: '/orders/mine', element: <OrdersMinePage /> },
          { path: '/community', element: <CommunityFeedPage /> },
          { path: '/community/blood', element: <BloodRequestPage /> },
          { path: '/community/emergency', element: <MedicalEmergencyPage /> },
          { path: '/community/volunteers', element: <VolunteersPage /> },
          { path: '/community/lost-found', element: <LostFoundPage /> },
          { path: '/community/new', element: <NewRequestPage /> },
          { path: '/community/:id', element: <RequestDetailPage /> },
          { path: '/profile/emergency-contacts', element: <EmergencyContactsPage /> },
          { path: '/learn', element: <LearnBrowsePage /> },
          { path: '/learn/:subject', element: <LearnSubjectPage /> },
          { path: '/courses/:id', element: <CourseDetailPage /> },
          { path: '/become-a-trainer', element: <BecomeTrainerPage /> },
          { path: '/my-courses', element: <MyCoursesPage /> },
          { path: '/my-courses/enrollments', element: <TrainerEnrollmentsPage /> },
          { path: '/my-enrollments', element: <MyEnrollmentsPage /> },
          { path: '/messages', element: <MessagesListPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
      // ConversationPage is deliberately outside AppShell — a full-screen
      // chat view shouldn't compete with the bottom nav bar for vertical
      // space, the same way most chat apps hide their tab bar while a
      // conversation is open.
      { path: '/messages/:roomId', element: <ConversationPage /> },

      // Admin pages: auth (outer ProtectedRoute) + role check (AdminRoute),
      // also outside AppShell — admin tooling doesn't belong in the
      // consumer-facing bottom nav, and each admin page has its own
      // back-to-dashboard link instead.
      {
        element: <AdminRoute />,
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/users', element: <AdminUsersPage /> },
          { path: '/admin/verifications', element: <AdminVerificationsPage /> },
          { path: '/admin/reports', element: <AdminReportsPage /> },
          { path: '/admin/categories', element: <AdminCategoriesPage /> },
          { path: '/admin/analytics', element: <AdminAnalyticsPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
