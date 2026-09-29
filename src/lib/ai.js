import { base44 } from '@/api/base44Client';

/**
 * AI SERVICE ABSTRACTION
 * AI is an enhancement layer only — every feature here degrades gracefully and
 * nothing in the buying, selling or fulfillment flow depends on it.
 */

async function ask(action, data) {
  try {
    const response = await base44.functions.invoke('commerceAi', { action, ...data });
    return response.data.result;
  } catch {
    return null;
  }
}

export async function generateProductDescription({ title, category, attributes, sellerId }) {
  return (await ask('description', { title, category, attributes, sellerId })) || '';
}

export async function suggestProductTags({ title, description, sellerId }) {
  const result = await ask('tags', { title, description, sellerId });
  return result?.tags || [];
}

export async function suggestCategory({ title, description, sellerId }) {
  const result = await ask('category', { title, description, sellerId });
  return result?.category || null;
}

export async function sellerInsights({ sellerId }) {
  const result = await ask('sellerInsights', { sellerId });
  return result?.insights || [];
}

export async function shoppingAssistant({ question }) {
  return (await ask('shopping', { question })) || "Je n'ai pas pu générer de suggestion pour le moment.";
}