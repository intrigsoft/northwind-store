/**
 * Store policies — the single source of truth behind the storefront's service
 * promises (the homepage service strip) and the assistant's policy answers.
 *
 * Derived from the same pricing constants the cart uses, so "free shipping over
 * $50", the shipping table, and the returns window the assistant quotes always
 * match what checkout actually charges.
 */
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING,
  EXPRESS_SHIPPING,
  NEXTDAY_SHIPPING,
  TAX_RATE,
} from './pricing';
import type { StorePolicies } from './types';

export function storePolicies(): StorePolicies {
  return {
    store: 'Northwind',
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shipping: [
      { method: 'standard', label: 'Standard', price: STANDARD_SHIPPING, freeOver: FREE_SHIPPING_THRESHOLD, eta: '3–5 business days' },
      { method: 'express', label: 'Express', price: EXPRESS_SHIPPING, freeOver: null, eta: '1–2 business days' },
      { method: 'nextday', label: 'Next day', price: NEXTDAY_SHIPPING, freeOver: null, eta: 'Order before 4pm' },
    ],
    returns: {
      windowDays: 30,
      eligible: 'Delivered orders, within 30 days of delivery',
      refund: 'Full refund to the original payment method',
    },
    payment: ['Visa', 'Mastercard', 'Amex', 'PayPal'],
    support: '24/7 chat support',
    taxRate: TAX_RATE,
  };
}
