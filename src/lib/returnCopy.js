export const RETURN_COPY = {
  fr: {
    phoneRequired: 'Indiquez le téléphone associé à la commande.',
    expectedRefund: 'Remboursement demandé (USD)',
    expectedRefundPh: 'Montant souhaité en dollars',
    amountInvalid: (total) => `Indiquez un montant supérieur à zéro, sans dépasser ${total}.`,
    descriptionRequired: "Décrivez le problème avant d'envoyer la demande.",
    escalate: 'Problème non résolu ? Ouvrir un litige',
  },
  en: {
    phoneRequired: 'Enter the phone number used for this order.',
    expectedRefund: 'Expected refund (USD)',
    expectedRefundPh: 'Requested amount in dollars',
    amountInvalid: (total) => `Enter an amount above zero and no more than ${total}.`,
    descriptionRequired: 'Describe the problem before sending your request.',
    escalate: 'Still unresolved? Open a dispute',
  },
};