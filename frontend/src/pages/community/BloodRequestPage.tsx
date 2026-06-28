import { Navigate } from 'react-router-dom';

/**
 * Per doc: "Blood Request shortcut: pre-fills type=blood with blood group
 * selector." Rather than duplicate NewRequestPage's form, this is a thin
 * redirect that pre-selects the type via query param — NewRequestPage
 * already reads `?preset=` and shows the blood group selector whenever
 * type==='blood'.
 */
export function BloodRequestPage() {
  return <Navigate to="/community/new?preset=blood" replace />;
}
