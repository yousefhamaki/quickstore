import api from '../api';
import { Order } from '../types';

export interface WaybillResponse {
  trackingNumber: string;
  waybillUrl: string;
  message: string;
}

// POST /api/shipping/waybill/:orderId — generates a real Bosta shipment +
// waybill for the order. Requires the store to have shipping enabled with
// provider 'bosta' and a valid API key already saved (lib/services/store.ts's
// updateStore is how that gets saved — see app/(tabs)/profile/shipping.tsx).
export async function generateWaybill(orderId: string): Promise<WaybillResponse> {
  const { data } = await api.post<WaybillResponse>(`/shipping/waybill/${orderId}`);
  return data;
}

export interface LiveTrackingStatus {
  status: string;
  statusDate: string;
}

// GET /api/shipping/track/:orderId — polls the courier's own API for the
// live status of an order that already has a trackingNumber. Bosta/Aramex
// only; manually-entered ('local') tracking has no API to poll.
export async function trackShipment(orderId: string): Promise<LiveTrackingStatus> {
  const { data } = await api.get<LiveTrackingStatus>(`/shipping/track/${orderId}`);
  return data;
}

// PUT /api/shipping/orders/:orderId/tracking — manual carrier/tracking-number
// entry, used for 'local' (non-Bosta) shipping or as a manual override.
export async function setManualTracking(
  orderId: string,
  carrierName: string,
  trackingNumber: string,
  trackingUrl?: string
): Promise<Order> {
  const { data } = await api.put<Order>(`/shipping/orders/${orderId}/tracking`, {
    carrierName,
    trackingNumber,
    trackingUrl: trackingUrl || undefined,
  });
  return data;
}
