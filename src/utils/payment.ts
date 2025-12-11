import stripe from 'stripe';

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY || '');

export async function processPayment(amount: number, method: string, orderId: number): Promise<string> {
  try {
    if (method === 'CARD') {
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amount * 100, // Amount in cents
        currency: 'kes',
        metadata: { orderId: orderId.toString() },
      });

      return paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING';
    } else if (method === 'MPESA') {
      // Stub for M-Pesa integration
      // Implement M-Pesa STK Push API call here
      console.log('Processing M-Pesa payment for order:', orderId);
      return 'COMPLETED'; // Simulate success
    }

    return 'FAILED';
  } catch (error) {
    console.error('Payment processing error:', error);
    return 'FAILED';
  }
}