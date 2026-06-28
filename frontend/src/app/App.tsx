import { AuthProvider } from '@/lib/auth';
import { AppRouter } from './router';
import '@/lib/i18n';

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
