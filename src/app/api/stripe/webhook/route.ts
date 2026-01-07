import { NextRequest, NextResponse } from 'next/server';
import { stripe, getTierFromPriceId, TIER_LIMITS } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as keyof typeof TIER_LIMITS;

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const subscriptionId = session.subscription as string;
  const subscriptionData = await stripe.subscriptions.retrieve(subscriptionId);

  const tierLimits = TIER_LIMITS[tier];

  // Type-safe access to subscription billing period
  const periodStart = (subscriptionData as unknown as { current_period_start: number }).current_period_start;
  const periodEnd = (subscriptionData as unknown as { current_period_end: number }).current_period_end;

  await prisma.subscription.update({
    where: { userId },
    data: {
      tier,
      status: 'ACTIVE',
      stripeSubscriptionId: subscriptionId,
      stripePriceId: subscriptionData.items.data[0]?.price.id,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      monthlyGenerationsLimit: tierLimits.monthlyGenerations,
      maxProjectsLimit: tierLimits.maxProjects,
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
    },
  });

  console.log(`User ${userId} subscribed to ${tier}`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);
  const tierLimits = TIER_LIMITS[tier];

  let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PAUSED' | 'TRIALING' = 'ACTIVE';
  if (subscription.status === 'past_due') status = 'PAST_DUE';
  if (subscription.status === 'canceled') status = 'CANCELED';
  if (subscription.status === 'paused') status = 'PAUSED';
  if (subscription.status === 'trialing') status = 'TRIALING';

  // Type-safe access to subscription billing period
  const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start;
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      tier,
      status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      monthlyGenerationsLimit: tierLimits.monthlyGenerations,
      maxProjectsLimit: tierLimits.maxProjects,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`Subscription updated for user ${userSubscription.userId}: ${tier} (${status})`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Downgrade to free tier
  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      tier: 'FREE',
      status: 'CANCELED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      monthlyGenerationsLimit: TIER_LIMITS.FREE.monthlyGenerations,
      maxProjectsLimit: TIER_LIMITS.FREE.maxProjects,
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`Subscription deleted for user ${userSubscription.userId}, downgraded to FREE`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  await prisma.subscription.update({
    where: { id: userSubscription.id },
    data: {
      status: 'PAST_DUE',
    },
  });

  console.log(`Payment failed for user ${userSubscription.userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const userSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userSubscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Only update if it was past due
  if (userSubscription.status === 'PAST_DUE') {
    await prisma.subscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'ACTIVE',
      },
    });

    console.log(`Payment succeeded for user ${userSubscription.userId}, status restored to ACTIVE`);
  }
}
