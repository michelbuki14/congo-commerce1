/**
 * Copy for the international-supplier route: the supplier delivers into our
 * warehouse abroad, we send the customer a photo of the goods, and only once
 * the customer approves do we ship to the destination.
 *
 * Kept out of fr.js / en.js, which are already at their size limit.
 */
const intlShipment = {
  fr: {
    status: {
      AWAITING_CUSTOMER_APPROVAL: 'Validation client requise',
    },
    originReceiving: {
      tab: 'Réception internationale',
      title: 'Réception à l’entrepôt d’origine',
      helper:
        'Confirmez l’arrivée de la marchandise dans notre entrepôt à l’étranger. La photo est envoyée au client, qui valide avant que nous expédiions vers sa destination.',
      loading: 'Chargement…',
      empty: 'Aucune marchandise internationale en attente de réception.',
      warehousePh: 'Entrepôt de réception (ex. Guangzhou)',
      photoLabel: 'Photo de la marchandise',
      uploading: 'Envoi de la photo…',
      uploadFailed: 'L’envoi de la photo a échoué.',
      photoAdded: 'Photo ajoutée',
      remove: 'Retirer',
      submit: 'Réceptionner et envoyer la photo',
      sending: 'Envoi…',
      sent: 'Marchandise réceptionnée — le client a reçu la photo.',
      failed: 'La réception a échoué. Réessayez.',
      warehouseRequired: 'Indiquez l’entrepôt de réception.',
      photoRequired: 'Ajoutez une photo de la marchandise.',
      itemsCount: '{{count}} article(s)',
    },
    intlApproval: {
      title: 'Votre colis est arrivé dans notre entrepôt',
      helper:
        'Voici la photo de votre marchandise, reçue à {{warehouse}}. Confirmez pour que nous l’expédiions vers {{destination}}.',
      warehouse: 'Entrepôt',
      receivedAt: 'Réceptionné le {{date}}',
      confirm: 'Confirmer et expédier',
      confirming: 'Confirmation…',
      confirmed: 'Merci ! Votre colis part vers sa destination.',
      error: 'La confirmation a échoué. Réessayez.',
      awaiting: 'En attente de votre confirmation',
      approved: 'Confirmé — expédition vers votre destination en cours',
      preparing: 'En préparation chez le fournisseur',
      statusLabel: 'Import international',
    },
  },
  en: {
    status: {
      AWAITING_CUSTOMER_APPROVAL: 'Client approval required',
    },
    originReceiving: {
      tab: 'International receiving',
      title: 'Receiving at the origin warehouse',
      helper:
        'Confirm the goods arrived at our warehouse abroad. The photo goes to the customer, who approves before we ship to their destination.',
      loading: 'Loading…',
      empty: 'No international goods waiting to be received.',
      warehousePh: 'Receiving warehouse (e.g. Guangzhou)',
      photoLabel: 'Photo of the goods',
      uploading: 'Uploading photo…',
      uploadFailed: 'The photo upload failed.',
      photoAdded: 'Photo added',
      remove: 'Remove',
      submit: 'Receive and send the photo',
      sending: 'Sending…',
      sent: 'Goods received — the customer has the photo.',
      failed: 'Receiving failed. Try again.',
      warehouseRequired: 'Enter the receiving warehouse.',
      photoRequired: 'Add a photo of the goods.',
      itemsCount: '{{count}} item(s)',
    },
    intlApproval: {
      title: 'Your parcel reached our warehouse',
      helper:
        'Here is the photo of your goods, received at {{warehouse}}. Approve to let us ship it to {{destination}}.',
      warehouse: 'Warehouse',
      receivedAt: 'Received on {{date}}',
      confirm: 'Approve and ship',
      confirming: 'Approving…',
      confirmed: 'Thank you! Your parcel is on its way.',
      error: 'Approval failed. Try again.',
      awaiting: 'Waiting for your approval',
      approved: 'Approved — shipping to your destination',
      preparing: 'Being prepared by the supplier',
      statusLabel: 'International import',
    },
  },
};

export default intlShipment;