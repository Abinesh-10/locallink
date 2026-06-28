import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Truck, MapPin, MessageSquare } from 'lucide-react';
import { marketApi } from '@/features/market/api';
import { chatApi } from '@/features/chat/api';
import { ReportButton } from '@/features/reports/components/ReportButton';
import { VerifiedBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderModal } from '@/features/market/components/OrderModal';
import { useAuth } from '@/lib/auth';

interface ProductDetail {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: string;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  qty: number;
  photos: string[];
  delivery_option: 'pickup' | 'local_delivery' | 'both';
  status: 'available' | 'reserved' | 'sold';
  seller_name: string;
  seller_photo_url: string | null;
  category_names: Record<string, string> | null;
  is_verified_seller: boolean;
}

const CONDITION_LABEL_KEY: Record<string, string> = {
  new: 'market.conditionNew',
  like_new: 'market.conditionLikeNew',
  used: 'market.conditionUsed',
  refurbished: 'market.conditionRefurbished',
};

const DELIVERY_LABEL_KEY: Record<string, string> = {
  pickup: 'market.deliveryPickup',
  local_delivery: 'market.deliveryLocalDelivery',
  both: 'market.deliveryBoth',
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    if (!id) return;
    marketApi
      .getListing(id)
      .then((res) => setProduct(res.data.listing))
      .catch((err) => setError(err.response?.data?.detail || 'Listing not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return <p className="px-4 py-8 text-center text-sm text-sos-500">{error}</p>;
  }

  const isOwnListing = user?.id === product.seller_id;
  const isAvailable = product.status === 'available' && product.qty > 0;

  async function handleStartChat() {
    setIsStartingChat(true);
    try {
      const res = await chatApi.startChat(product.seller_id);
      navigate(`/messages/${res.data.room.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start chat.');
    } finally {
      setIsStartingChat(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-md">
        <button type="button" onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-ink-500">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        {product.photos?.length > 0 ? (
          <img src={product.photos[0]} alt={product.title} className="mb-4 h-48 w-full rounded-lg object-cover" />
        ) : (
          <div className="mb-4 h-48 w-full rounded-lg bg-brand-50" />
        )}

        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-ink-900">{product.title}</h1>
          {product.is_verified_seller && <VerifiedBadge label={t('market.verifiedSeller')} />}
        </div>
        <p className="mt-1 text-sm text-ink-500">{product.category_names?.en}</p>
        {!isOwnListing && (
          <div className="mt-1">
            <ReportButton targetType="product_listing" targetId={product.id} />
          </div>
        )}

        <p className="mt-3 font-display text-2xl font-semibold text-ink-900">₹{parseFloat(product.price).toFixed(0)}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-500">
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700">
            {t(CONDITION_LABEL_KEY[product.condition])}
          </span>
          <span className="inline-flex items-center gap-1">
            <Truck className="h-4 w-4" />
            {t(DELIVERY_LABEL_KEY[product.delivery_option])}
          </span>
          {product.qty > 1 && <span>{t('market.qtyAvailable', { qty: product.qty })}</span>}
        </div>

        {product.description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{product.description}</p>}

        <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
          <MapPin className="h-4 w-4" />
          {product.seller_name}
        </div>

        {!isOwnListing && isAvailable && (
          <div className="mt-6 space-y-2">
            {orderSent ? (
              <p className="rounded border border-trust-300 bg-trust-50 px-4 py-3 text-center text-sm text-trust-700">
                {t('market.orderSent')}
              </p>
            ) : (
              <Button type="button" className="w-full" onClick={() => setShowOrderModal(true)}>
                {t('market.contactSeller')}
              </Button>
            )}
            <Button type="button" variant="secondary" className="w-full" isLoading={isStartingChat} onClick={handleStartChat}>
              <MessageSquare className="h-4 w-4" />
              {t('chat.startChat')}
            </Button>
          </div>
        )}

        {!isOwnListing && !isAvailable && (
          <p className="mt-6 rounded border border-ink-100 bg-ink-50 px-4 py-3 text-center text-sm text-ink-500">
            No longer available
          </p>
        )}
      </div>

      {showOrderModal && (
        <OrderModal
          productId={product.id}
          maxQty={product.qty}
          onClose={() => setShowOrderModal(false)}
          onSuccess={() => {
            setShowOrderModal(false);
            setOrderSent(true);
          }}
        />
      )}
    </div>
  );
}
