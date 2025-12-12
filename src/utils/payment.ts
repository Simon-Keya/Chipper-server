// src/utils/payment.ts

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
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
      // TODO: Implement real M-Pesa STK Push
      // For now, simulate success
      return 'COMPLETED';
    }

    return 'FAILED';
  } catch (error) {
    console.error('Payment processing failed:', error);
    return 'FAILED';
  }
}