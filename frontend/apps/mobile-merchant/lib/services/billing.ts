import api from '../api';
import { BillingOverview } from '../types';

export async function getBillingOverview(): Promise<BillingOverview> {
  const { data } = await api.get<BillingOverview>('/billing/overview');
  return data;
}
