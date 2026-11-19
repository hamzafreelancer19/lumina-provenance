export type CreditPlan = {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  active: boolean;
  popular: boolean;
  updatedAt?: number;
};

export const REFERRAL_REWARD_CREDITS = 300;

export const DEFAULT_CREDIT_PLANS: CreditPlan[] = [
  { id: 'starter', name: 'Starter', credits: 500, price: 0.55, description: 'A quick top-up for a few projects.', active: true, popular: false },
  { id: 'creator', name: 'Creator', credits: 1200, price: 0.99, description: 'For regular image cleanups.', active: true, popular: true },
  { id: 'studio', name: 'Studio', credits: 2500, price: 1.49, description: 'More room for busy weeks.', active: true, popular: false },
  { id: 'pro', name: 'Pro', credits: 4000, price: 2, description: 'The biggest top-up for ongoing work.', active: true, popular: false },
];
