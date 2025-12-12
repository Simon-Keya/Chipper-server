import nodemailer from 'nodemailer';
import { Order } from '../models/order';

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email template for order confirmation
const orderConfirmationTemplate = (order: Order, items: any[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemList = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <strong>${item.product.name}</strong><br>
        <small style="color: #666;">Quantity: ${item.quantity} × KSh ${item.product.price.toLocaleString()}</small>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
        KSh ${(item.product.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Order Confirmation #${order.id}</title>
    </head>
    <body style="font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Thank You for Your Order!</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Your order has been confirmed</p>
        </div>

        <!-- Order Summary -->
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Order #${order.id}</h2>
          <p style="color: #666; margin-bottom: 20px;">
            Placed on ${new Date(order.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #555;">Total Items</span>
              <strong>${totalItems}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 20px;">
              <span style="color: #555;">Total Amount</span>
              <strong style="color: #667eea;">KSh ${order.total.toLocaleString()}</strong>
            </div>
          </div>

          <h3 style="color: #333; margin: 25px 0 15px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #eee;">
                <th style="text-align: left; padding: 12px 0; color: #555;">Product</th>
                <th style="text-align: right; padding: 12px 0; color: #555;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemList}
            </tbody>
          </table>

          <div style="margin-top: 30px; padding: 20px; background: #f0f7ff; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #333;">
              We’ve received your order and will start processing it right away.
            </p>
            <p style="margin: 10px 0 0; color: #667eea; font-weight: 600;">
              You’ll receive shipping updates via email.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1a1a1a; color: #aaa; padding: 25px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">
            <strong>Chipper</strong> • Your trusted online store
          </p>
          <p style="margin: 10px 0 0; font-size: 12px;">
            © ${new Date().getFullYear()} Chipper. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendOrderConfirmation = async (
  order: Order,
  items: any[],
  userEmail: string
): Promise<void> => {
  try {
    const mailOptions = {
      from: `"Chipper" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Order Confirmed! #${order.id} - Thank You for Shopping with Chipper`,
      html: orderConfirmationTemplate(order, items),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    // Don't throw — email failure shouldn't break checkout
  }
};