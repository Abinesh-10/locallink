import { apiClient } from '@/lib/api-client';

export interface ProductListingInput {
  categoryId?: string;
  title: string;
  description?: string;
  price: number;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  qty?: number;
  photos?: string[];
  deliveryOption?: 'pickup' | 'local_delivery' | 'both';
  lat?: number;
  lng?: number;
}

export interface SearchProductsParams {
  category?: string;
  condition?: string;
  lat?: number;
  lng?: number;
  radius?: 5 | 10 | 15 | 25;
  page?: number;
  limit?: number;
}

export const marketApi = {
  getProductCategories: () => apiClient.get('/product-categories'),

  createListing: (input: ProductListingInput) => apiClient.post('/products', input),
  updateListing: (id: string, input: Partial<ProductListingInput>) => apiClient.patch(`/products/${id}`, input),
  deleteListing: (id: string) => apiClient.delete(`/products/${id}`),
  markAsSold: (id: string) => apiClient.patch(`/products/${id}/mark-sold`),
  getListing: (id: string) => apiClient.get(`/products/${id}`),
  searchListings: (params: SearchProductsParams) => apiClient.get('/products', { params }),
  getMyListings: () => apiClient.get('/products-mine'),

  createOrder: (productId: string, qty?: number, message?: string) =>
    apiClient.post('/orders', { productId, qty, message }),
  listMyOrders: () => apiClient.get('/orders/mine'),
  listSellerOrders: () => apiClient.get('/orders/seller'),
  updateOrderStatus: (orderId: string, status: string) => apiClient.patch(`/orders/${orderId}/status`, { status }),
};
