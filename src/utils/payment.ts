// src/utils/payment.ts

import Stripe from 'stripe';

// Throw early if secret key is missing
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Use the latest supported Stripe API version as of December 2025
// '2025-11-17.clover' is the current stable version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover' as const,  // ← Fixed: Use valid version + 'as const' for type safety
});

export async function processPayment(
  amount: number,
  method: 'CARD' | 'MPESA',
  orderId: number
): Promise<'COMPLETED' | 'PENDING' | 'FAILED'> {
  try {
    if (method === 'CARD') {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: 'kes',
        payment_method_types: ['card'],
        metadata: { orderId: orderId.toString() },
        confirmation_method: 'manual',
        confirm: true,
      });

      if (paymentIntent.status === 'succeeded') {
        return 'COMPLETED';
      }
      return 'PENDING';
    }

    if (method === 'MPESA') {
      console.log(`M-Pesa payment initiated for order #${orderId} - KSh ${amount}`);
      // TODO: Implement real M-Pesa STK Push integration
      // For now, simulate success
      return 'COMPLETED';
    }

    return 'FAILED';
  } catch (error) {
    console.error('Payment processing failed:', error);
    return 'FAILED';
  }
}