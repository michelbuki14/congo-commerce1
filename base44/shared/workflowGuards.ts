export function validateWorkflowDecision(input = {}) {
  const decision = input.decision;
  if (decision !== undefined && decision !== '' && !['approve', 'reject'].includes(decision)) {
    const error = new Error('Décision invalide : utilisez approve ou reject');
    error.status = 400;
    throw error;
  }
}

export async function assertWorkflowAdmin(base44) {
  // Every workflow runs service-role steps; definition metadata cannot grant access.
  const user = await base44.auth.me().catch(() => null);
  if (user?.role !== 'admin') {
    const error = new Error('Workflow réservé aux administrateurs');
    error.status = user ? 403 : 401;
    throw error;
  }
}