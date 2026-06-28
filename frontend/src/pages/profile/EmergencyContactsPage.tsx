import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export function EmergencyContactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/users/me/emergency-contacts');
      setContacts(res.data.contacts);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !phone) {
      setError('Name and phone are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/users/me/emergency-contacts', { name, phone });
      setName('');
      setPhone('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add contact.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(contactId: string) {
    await apiClient.delete(`/users/me/emergency-contacts/${contactId}`);
    await load();
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate('/profile')} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('profile.title')}
        </button>

        <h1 className="font-display text-xl font-semibold text-ink-900">Emergency contacts</h1>
        <p className="mt-1 text-sm text-ink-500">
          These contacts get an SMS with your location if you ever send an SOS alert.
        </p>

        <form onSubmit={handleAdd} className="mt-6 space-y-3 rounded-lg border border-ink-100 bg-white p-4">
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Phone" type="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {error && <p className="text-sm text-sos-500">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Add contact
          </Button>
        </form>

        {isLoading ? (
          <div className="mt-6 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded border border-ink-100 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{contact.name}</p>
                  <p className="text-xs text-ink-500">{contact.phone}</p>
                </div>
                <button type="button" onClick={() => handleDelete(contact.id)} aria-label="Delete contact">
                  <Trash2 className="h-4 w-4 text-sos-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
