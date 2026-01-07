import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

// For backward compatibility - lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID!,
  ENTERPRISE_MONTHLY: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
};

export const TIER_LIMITS = {
  FREE: {
    monthlyGenerations: 5,
    maxProjects: 1,
    features: [
      '5 generations per month',
      '1 project',
      'Basic support',
      'Export to ZIP',
    ],
  },
  PRO: {
    monthlyGenerations: 100,
    maxProjects: -1, // unlimited
    features: [
      '100 generations per month',
      'Unlimited projects',
      'Priority support',
      'Version history',
      'All AI models',
    ],
  },
  ENTERPRISE: {
    monthlyGenerations: -1, // unlimited
    maxProjects: -1, // unlimited
    features: [
      'Unlimited generations',
      'Unlimited projects',
      'Priority support',
      'Team features',
      'Custom models',
      'API access',
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === PRICE_IDS.PRO_MONTHLY) return 'PRO';
  if (priceId === PRICE_IDS.ENTERPRISE_MONTHLY) return 'ENTERPRISE';
  return 'FREE';
}

export function getPriceIdForTier(tier: SubscriptionTier): string | null {
  switch (tier) {
    case 'PRO':
      return PRICE_IDS.PRO_MONTHLY;
    case 'ENTERPRISE':
      return PRICE_IDS.ENTERPRISE_MONTHLY;
    default:
      return null;
  }
}
