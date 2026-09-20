import api from '../api';
import { AnalyticsOverview } from '../types';

export async function getAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>(`/analytics/overview?days=${days}`);
  return data;
}
