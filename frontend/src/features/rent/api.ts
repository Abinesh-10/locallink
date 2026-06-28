import { apiClient } from '@/lib/api-client';

export interface ListingInput {
  categoryId: string;
  title: string;
  description?: string;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  deposit?: number;
  deliveryOption?: 'pickup' | 'delivery' | 'both';
  photos?: string[];
  lat?: number;
  lng?: number;
}

export interface SearchListingsParams {
  category?: string;
  lat?: number;
  lng?: number;
  radius?: 5 | 10 | 15 | 25;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export const rentApi = {
  getRentalCategories: () => apiClient.get('/rental-categories'),

  createListing: (input: ListingInput) => apiClient.post('/rentals', input),
  updateListing: (id: string, input: Partial<ListingInput>) => apiClient.patch(`/rentals/${id}`, input),
  deleteListing: (id: string) => apiClient.delete(`/rentals/${id}`),
  getListing: (id: string) => apiClient.get(`/rentals/${id}`),
  searchListings: (params: SearchListingsParams) => apiClient.get('/rentals', { params }),
  getMyListings: () => apiClient.get('/rentals-mine'),
  getAvailability: (id: string) => apiClient.get(`/rentals/${id}/availability`),

  createBooking: (listingId: string, startDate: string, endDate: string, totalAmount?: number) =>
    apiClient.post('/rental-bookings', { listingId, startDate, endDate, totalAmount }),
  listMyBookings: () => apiClient.get('/rental-bookings/mine'),
  listOwnerBookings: () => apiClient.get('/rental-bookings/owner'),
  updateBookingStatus: (bookingId: string, status: string) =>
    apiClient.patch(`/rental-bookings/${bookingId}/status`, { status }),

  createReview: (listingId: string, bookingId: string, rating: number, comment?: string) =>
    apiClient.post('/rental-reviews', { listingId, bookingId, rating, comment }),
};
