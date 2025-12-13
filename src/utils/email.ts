// src/utils/email.ts

import nodemailer from 'nodemailer';

// Fix: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465', // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Define the shape of order items directly — no Prisma import needed
interface OrderLineItem {
  product: {
    name: string;
    price: number;
  };
  quantity: number;
}

interface OrderEmailData {
  orderId: number;
  total: number;
  createdAt: string | Date;
  items: OrderLineItem[];
  customerEmail: string;
  customerName?: string;
}

const generateOrderEmail = (data: OrderEmailData): string => {
  const {
    orderId,
    total,
    createdAt,
    items,
    customerName = 'Valued Customer',
  } = data;

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600;">${item.product.name}</div>
          <div style="font-size: 14px; color: #666; margin-top: 4px;">
            Quantity: ${item.quantity} × KSh ${item.product.price.toLocaleString()}
          </div>
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
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Order Confirmed! #${orderId}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 40px 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .footer { background: #1a1a1a; color: #aaa; padding: 30px; text-align: center; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size:32px;">Order Confirmed!</h1>
            <p style="margin:12px 0 0; opacity:0.9; font-size:18px;">Thank you for shopping with Chipper</p>
          </div>

          <div class="content">
            <h2 style="color:#333; margin-top:0;">Hi ${customerName},</h2>
            <p style="color:#555; line-height:1.6;">
              Your order has been successfully placed and is being processed.
            </p>

            <div style="background:#f8f9ff; padding:24px; border-radius:12px; margin:24px 0;">
              <h3 style="margin:0 0 16px 0; color:#333;">Order Summary</h3>
              <p style="margin:0; color:#555;"><strong>Order ID:</strong> #${orderId}</p>
              <p style="margin:12px 0 0; color:#555;"><strong>Date:</strong> ${new Date(createdAt).toLocaleDateString('en-KE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}</p>
              <p style="margin:20px 0 0; font-size:24px; color:#667eea;">
                <strong>Total: KSh ${total.toLocaleString()}</strong>
              </p>
              <p style="margin:8px 0 0; color:#666;">${totalItems} item${totalItems > 1 ? 's' : ''}</p>
            </div>

            <h3 style="color:#333; margin:32px 0 16px;">Order Details</h3>
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid #eee;">
                  <th style="text-align:left; padding:12px 0; color:#555;">Product</th>
                  <th style="text-align:right; padding:12px 0; color:#555;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div style="margin-top:40px; padding:24px; background:#e6f7ff; border-radius:12px; text-align:center;">
              <p style="margin:0; color:#0066cc; font-weight:600; font-size:16px;">
                We’re preparing your order with care!
              </p>
              <p style="margin:12px 0 0; color:#555;">
                You’ll receive tracking updates soon.
              </p>
            </div>
          </div>

          <div class="footer">
            <p style="margin:0;"><strong>Chipper</strong> • Your trusted online store</p>
            <p style="margin:12px 0 0; font-size:12px;">
              © ${new Date().getFullYear()} Chipper. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const sendOrderConfirmation = async (
  order: { id: number; total: number; createdAt: string | Date },
  items: OrderLineItem[],
  userEmail: string,
  customerName?: string
): Promise<void> => {
  try {
    const html = generateOrderEmail({
      orderId: order.id,
      total: order.total,
      createdAt: order.createdAt,
      items,
      customerEmail: userEmail,
      customerName,
    });

    await transporter.sendMail({
      from: `"Chipper" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Order Confirmed! #${order.id} - Thank You!`,
      html,
    });

    console.log('Order confirmation email sent to:', userEmail);
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    // Do not throw — email failure should never break checkout
  }
};