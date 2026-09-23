import { base44 } from '@/api/base44Client';

/**
 * AI SERVICE ABSTRACTION
 * AI is an enhancement layer only — every feature here degrades gracefully and
 * nothing in the buying, selling or fulfillment flow depends on it.
 */

async function ask(prompt, schema) {
  try {
    return await base44.integrations.Core.InvokeLLM({
      prompt,
      ...(schema ? { response_json_schema: schema } : {}),
    });
  } catch {
    return null;
  }
}

export async function generateProductDescription({ title, category, attributes }) {
  const result = await ask(
    `Tu écris pour Congo Commerce, une marketplace congolaise (RDC). Rédige une description produit vendeuse de 70 à 110 mots, en français, ton chaleureux et concret, adaptée à un acheteur mobile à Kinshasa. Mentionne l'usage, la qualité et la livraison. Pas de superlatifs mensongers.\n\nProduit: ${title}\nCatégorie: ${category || 'général'}\nCaractéristiques: ${JSON.stringify(attributes || {})}`,
  );
  return result || '';
}

export async function suggestProductTags({ title, description }) {
  const result = await ask(
    `Propose 6 mots-clés de recherche courts (1 à 3 mots), en français, pour ce produit de mode/e-commerce vendu en RDC. Réponds uniquement en JSON.\n\nTitre: ${title}\nDescription: ${(description || '').slice(0, 400)}`,
    { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' } } }, required: ['tags'] },
  );
  return result?.tags || [];
}

export async function suggestCategory({ title, description }, categories) {
  const names = (categories || []).map((c) => c.name);
  if (!names.length) return null;
  const result = await ask(
    `Classe ce produit dans UNE seule catégorie parmi: ${names.join(', ')}. Réponds en JSON.\n\nTitre: ${title}\nDescription: ${(description || '').slice(0, 300)}`,
    { type: 'object', properties: { category: { type: 'string' }, reason: { type: 'string' } }, required: ['category'] },
  );
  return result?.category || null;
}

export async function sellerInsights({ storeName, topProducts, revenue, orders }) {
  const result = await ask(
    `Tu es analyste e-commerce pour Congo Commerce (RDC). Donne 3 recommandations très courtes (max 22 mots chacune) et actionnables pour cette boutique, en français.\n\nBoutique: ${storeName}\nChiffre d'affaires 30j: ${revenue} USD\nCommandes: ${orders}\nTop produits: ${(topProducts || []).join(', ')}`,
    { type: 'object', properties: { insights: { type: 'array', items: { type: 'string' } } }, required: ['insights'] },
  );
  return result?.insights || [];
}

export async function shoppingAssistant({ question, catalog }) {
  const list = (catalog || [])
    .slice(0, 25)
    .map((p) => `- ${p.title} (${p.category_name || ''}) — ${p.price_usd} USD`)
    .join('\n');
  const result = await ask(
    `Tu es l'assistant d'achat de Congo Commerce, une marketplace en RDC. Réponds en français, en 3 phrases maximum, en recommandant UNIQUEMENT des produits de cette liste et en justifiant brièvement. Si rien ne correspond, propose la catégorie la plus proche.\n\nCatalogue:\n${list}\n\nQuestion du client: ${question}`,
  );
  return result || "Je n'ai pas pu générer de suggestion pour le moment.";
}