import { apiClient } from './client';

export type PremiumPlan = 'monthly' | 'yearly';

export interface PremiumStatus {
  is_premium: boolean;
  premium_until: string | null;
  is_premium_active: boolean;
  ai_usage: {
    used: number;
    limit: number;
    remaining: number | null;
  };
}

export interface MockPaymentResult {
  detail: string;
  is_premium: boolean;
  premium_until: string;
}

export const paymentApi = {
  async mockPayment(plan: PremiumPlan): Promise<MockPaymentResult> {
    const { data } = await apiClient.post<MockPaymentResult>(
      '/auth/mock-payment/',
      { plan },
    );
    return data;
  },

  async getPremiumStatus(): Promise<PremiumStatus> {
    const { data } = await apiClient.get<PremiumStatus>('/auth/premium-status/');
    return data;
  },
};
