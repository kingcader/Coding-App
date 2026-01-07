'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Check,
  Sparkles,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Subscription {
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyGenerationsLimit: number;
  maxProjectsLimit: number;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
}

const TIERS = [
  {
    name: 'Free',
    id: 'FREE',
    price: 0,
    description: 'Perfect for trying out',
    features: [
      '5 generations per month',
      '1 project',
      'Basic support',
      'Export to ZIP',
    ],
  },
  {
    name: 'Pro',
    id: 'PRO',
    price: 29,
    description: 'For serious builders',
    features: [
      '100 generations per month',
      'Unlimited projects',
      'Priority support',
      'Version history',
      'All AI models',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    id: 'ENTERPRISE',
    price: 99,
    description: 'For teams & businesses',
    features: [
      'Unlimited generations',
      'Unlimited projects',
      'Priority support',
      'Team features',
      'Custom models',
      'API access',
    ],
  },
];

function BillingContent() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get('success')) {
      setMessage({ type: 'success', text: 'Subscription activated successfully!' });
    } else if (searchParams.get('canceled')) {
      setMessage({ type: 'error', text: 'Checkout was canceled.' });
    }
  }, [searchParams]);

  // Fetch subscription and usage data
  useEffect(() => {
    async function fetchData() {
      try {
        const [subRes, usageRes] = await Promise.all([
          fetch('/api/subscription'),
          fetch('/api/usage'),
        ]);

        if (subRes.ok) {
          const data = await subRes.json();
          setSubscription(data.subscription);
        }

        if (usageRes.ok) {
          const data = await usageRes.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCheckout = async (tier: string) => {
    setIsCheckoutLoading(tier);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
      setIsCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      setMessage({ type: 'error', text: 'Failed to open billing portal. Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const currentTier = subscription?.tier || 'FREE';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-gray-400 mt-1">
          Manage your subscription and usage
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-500 hover:text-gray-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{currentTier}</p>
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-400 mt-1">
                  {subscription.cancelAtPeriodEnd
                    ? 'Cancels on'
                    : 'Renews on'}{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {currentTier !== 'FREE' && (
              <Button variant="outline" onClick={handleManageSubscription}>
                Manage Subscription
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Usage */}
          {usage && (
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  Generations this month
                </span>
                <span className="text-sm text-white">
                  {usage.used} / {usage.limit === -1 ? '∞' : usage.limit}
                </span>
              </div>
              {usage.limit !== -1 && (
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min((usage.used / usage.limit) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          {currentTier === 'FREE' ? 'Upgrade Your Plan' : 'Available Plans'}
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isCurrentTier = currentTier === tier.id;
            const canUpgrade = tier.id !== 'FREE' && currentTier !== tier.id;

            return (
              <Card
                key={tier.id}
                className={`relative ${
                  tier.popular ? 'border-blue-500' : ''
                } ${isCurrentTier ? 'bg-blue-500/5' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                  <div className="mt-2 mb-1">
                    <span className="text-3xl font-bold text-white">
                      ${tier.price}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-gray-400">/month</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{tier.description}</p>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrentTier ? (
                    <Button variant="secondary" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(tier.id)}
                      disabled={isCheckoutLoading !== null}
                    >
                      {isCheckoutLoading === tier.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Upgrade to {tier.name}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full">
                      {tier.id === 'FREE' ? 'Free Forever' : 'Not Available'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
