import { BILLING_WORKFLOWS } from './workflowsBilling.ts';
import { COMMERCE_WORKFLOWS } from './workflowsCommerce.ts';
import { ONBOARDING_WORKFLOWS } from './workflowsOnboarding.ts';

/**
 * WORKFLOW REGISTRY — every executable definition of the platform, in one
 * place. The engine reads it; the admin console lists it.
 */

export const WORKFLOWS = [...ONBOARDING_WORKFLOWS, ...BILLING_WORKFLOWS, ...COMMERCE_WORKFLOWS];

export function workflowByCode(code) {
  return WORKFLOWS.find((w) => w.code === String(code || '')) || null;
}

/** The workflow that owns an incoming platform event, when one is registered. */
export function workflowForEvent(eventName) {
  const name = String(eventName || '');
  return WORKFLOWS.find((w) => (w.event_names || []).includes(name)) || null;
}

/** Serializable metadata of a definition — what the console lists. */
export function definitionSummary(def) {
  return {
    code: def.code,
    name: def.name,
    description: def.description,
    version: def.version,
    category: def.category,
    trigger: def.trigger,
    event_names: def.event_names || [],
    tenant_scoped: def.tenant_scoped !== false,
    admin_only: def.admin_only === true,
    idempotent: def.idempotent !== false,
    max_attempts: def.max_attempts || 3,
    steps: def.steps.map((step, index) => ({
      index,
      name: step.name,
      label: step.label || step.name,
      critical: step.critical !== false,
      retries: step.retries ?? def.max_attempts ?? 3,
      compensable: typeof step.compensate === 'function',
    })),
  };
}