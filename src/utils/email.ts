import nodemailer from 'nodemailer';
import { Order } from '../models/order';

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email template for order confirmation
const orderConfirmationTemplate = (order: Order, items: any[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemList = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
        <strong>${item.product.name}</strong><br>
        <small>Quantity: ${item.quantity} × KSh ${item.product.price.toLocaleString()}</small>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
        KSh ${(item.product.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Confirmation</h2>
      <p>Thank you for your order! Here's a summary:</p>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="padding: 12px; background: #f5f5f5; text-align: left;">Order #${order.id}</th>
          <th style="padding: 12px; background: #f5f5f5; text-align: right;">${new Date(order.createdAt).toLocaleDateString()}</th>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px; background: #f9f9f9;">
            <strong>Total Items: ${totalItems}</strong> | <strong>Total: KSh ${order.total.toLocaleString()}</strong>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 12px;">
            <h3>Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left;">Product</th>
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemList}
              </tbody>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin-top: 20px; color: #666;">
        Your order is being processed. You'll receive updates via email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999; text-align: center;">
        © 2025 Chipper. All rights reserved.
      </p>
    </div>
  `;
};

export const sendOrderConfirmation = async (order: Order, items: any[], userEmail: string): Promise<void> => {
  try {
    const mailOptions = {
      from: `"Chipper" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Order Confirmation #${order.id} - Chipper`,
      html: orderConfirmationTemplate(order