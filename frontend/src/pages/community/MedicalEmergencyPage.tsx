import { Navigate } from 'react-router-dom';

/**
 * Per doc: "Medical Emergency shortcut: pre-fills type=medical with
 * urgency=critical." NewRequestPage's preset logic already sets
 * urgency to 'critical' whenever presetType === 'medical'.
 */
export function MedicalEmergencyPage() {
  return <Navigate to="/community/new?preset=medical" replace />;
}
