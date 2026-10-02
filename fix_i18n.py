import re

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def escape_for_js(value, use_double=False):
    """Escape a string for JavaScript. Use double quotes if value contains apostrophe."""
    if "'" in value and not use_double:
        # Use double quotes
        return '"' + value.replace('"', '\\"') + '"'
    else:
        # Use single quotes, escape any single quotes
        return "'" + value.replace("'", "\\'") + "'"

# ===== FRENCH =====
fr_content = read_file('src/i18n/fr.js')

# 1. Add status keys: AWAITING_CUSTOMER_APPROVAL, PACKING
status_end = fr_content.find("  },\n  product:")
if status_end == -1:
    print("Could not find fr status section end")
    exit(1)

status_keys = """    AWAITING_CUSTOMER_APPROVAL: 'Validation client requise',
    PACKING: 'Emballage en cours',\n"""
fr_content = fr_content[:status_end] + '\n' + status_keys + fr_content[status_end:]

# 2. Add common keys
common_end = fr_content.find("  },\n  auth:")
if common_end == -1:
    print("Could not find fr common section end")
    exit(1)

common_keys = """    refresh: 'Actualiser',
    cost: 'Coût',
    expected: 'Attendu',
    approve: 'Approuver',
    reject: 'Rejeter',
    saving: 'Enregistrement…',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    close: 'Fermer',
    sku: 'SKU',
    product: 'Produit',
    onHand: 'En stock',
    available: 'Disponible',
    reserved: 'Réservé',
    location: 'Emplacement',
    adding: 'Ajout…',
    addStock: 'Ajouter du stock',
    search: 'Rechercher',
    allStatus: 'Tous les statuts',
    printAll: 'Tout imprimer',
    generated: 'Généré le',
    print: 'Imprimer',
    download: 'Télécharger',
    noLabels: 'Aucune étiquette générée.',
    checkSLA: 'Vérifier SLA',
    all: 'Tous',
    autoRoute: 'Acheminement auto',
    noTickets: 'Aucun ticket.',
"""
fr_content = fr_content[:common_end] + common_keys + fr_content[common_end:]

# 3. Add sections before apiKeys
api_idx = fr_content.find("  apiKeys: {")

if 'chinaWarehouse: {' not in fr_content:
    china_warehouse = """  chinaWarehouse: {
    title: 'Entrepôt Chine',
    add: 'Ajouter un entrepôt',
    namePh: "Nom de l'entrepôt",
    cityPh: 'Ville',
    provincePh: 'Province',
    addressPh: 'Adresse',
    contactPh: 'Contact',
    phonePh: 'Téléphone',
    emailPh: 'E-mail',
    capacityPh: 'Capacité',
    saving: 'Enregistrement…',
    save: 'Enregistrer',
    cancel: 'Annuler',
    viewInventory: 'Voir le stock',
    delete: 'Supprimer',
    none: 'Aucun entrepôt configuré.',
    inventory: 'Stock entrepôt',
    close: 'Fermer',
    sku: 'SKU',
    product: 'Produit',
    onHand: 'En stock',
    available: 'Disponible',
    reserved: 'Réservé',
    location: 'Emplacement',
    noInventory: 'Aucun stock dans cet entrepôt.',
    adding: 'Ajout…',
    addStock: 'Ajouter du stock',
    receipts: 'Réceptions',
    refresh: 'Actualiser',
    cost: 'Coût',
    expected: 'Attendu',
    approve: 'Approuver',
    reject: 'Rejeter',
    noReceipts: "Aucune réception pour l'instant.",
  },

"""
    fr_content = fr_content[:api_idx] + china_warehouse + fr_content[api_idx:]

api_idx = fr_content.find("  apiKeys: {")
if 'analytics: {' not in fr_content:
    analytics = """  analytics: {
    title: 'Analytics',
    funnel: 'Entonnoir',
    revenue: 'Revenus',
    cohort: 'Cohortes',
  },

"""
    fr_content = fr_content[:api_idx] + analytics + fr_content[api_idx:]

api_idx = fr_content.find("  apiKeys: {")
if 'shippingLabels: {' not in fr_content:
    shipping = """  shippingLabels: {
    title: "Étiquettes d'expédition",
    search: 'Rechercher',
    allStatus: 'Tous les statuts',
    printAll: 'Tout imprimer',
    generated: 'Généré le',
    print: 'Imprimer',
    download: 'Télécharger',
    noLabels: 'Aucune étiquette générée.',
  },

"""
    fr_content = fr_content[:api_idx] + shipping + fr_content[api_idx:]

api_idx = fr_content.find("  apiKeys: {")
if 'tickets: {' not in fr_content:
    tickets = """  tickets: {
    title: 'Tickets',
    checkSLA: 'Vérifier SLA',
    all: 'Tous',
    autoRoute: 'Acheminement auto',
    noTickets: 'Aucun ticket.',
  },

"""
    fr_content = fr_content[:api_idx] + tickets + fr_content[api_idx:]

write_file('src/i18n/fr.js', fr_content)
print("Fixed fr.js")

# ===== ENGLISH =====
en_content = read_file('src/i18n/en.js')

# 1. Add status keys
status_end = en_content.find("  },\n  product:")
if status_end == -1:
    print("Could not find en status section end")
    exit(1)

status_keys_en = """    AWAITING_CUSTOMER_APPROVAL: 'Client approval required',
    PACKING: 'Packing',\n"""
en_content = en_content[:status_end] + '\n' + status_keys_en + en_content[status_end:]

# 2. Add common keys
common_end = en_content.find("  },\n  auth:")
if common_end == -1:
    print("Could not find en common section end")
    exit(1)

common_keys_en = """    refresh: 'Refresh',
    cost: 'Cost',
    expected: 'Expected',
    approve: 'Approve',
    reject: 'Reject',
    saving: 'Saving…',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    close: 'Close',
    sku: 'SKU',
    product: 'Product',
    onHand: 'On Hand',
    available: 'Available',
    reserved: 'Reserved',
    location: 'Location',
    adding: 'Adding…',
    addStock: 'Add Stock',
    search: 'Search',
    allStatus: 'All Statuses',
    printAll: 'Print All',
    generated: 'Generated',
    print: 'Print',
    download: 'Download',
    noLabels: 'No labels generated.',
    checkSLA: 'Check SLA',
    all: 'All',
    autoRoute: 'Auto Route',
    noTickets: 'No tickets.',
"""
en_content = en_content[:common_end] + common_keys_en + en_content[common_end:]

# 3. Add sections before apiKeys
api_idx = en_content.find("  apiKeys: {")

if 'chinaWarehouse: {' not in en_content:
    china_warehouse_en = """  chinaWarehouse: {
    title: 'China Warehouse',
    add: 'Add Warehouse',
    namePh: 'Warehouse Name',
    cityPh: 'City',
    provincePh: 'Province',
    addressPh: 'Address',
    contactPh: 'Contact',
    phonePh: 'Phone',
    emailPh: 'Email',
    capacityPh: 'Capacity',
    saving: 'Saving…',
    save: 'Save',
    cancel: 'Cancel',
    viewInventory: 'View Inventory',
    delete: 'Delete',
    none: 'No China warehouse configured.',
    inventory: 'Warehouse Inventory',
    close: 'Close',
    sku: 'SKU',
    product: 'Product',
    onHand: 'On Hand',
    available: 'Available',
    reserved: 'Reserved',
    location: 'Location',
    noInventory: 'No items in this warehouse.',
    adding: 'Adding…',
    addStock: 'Add Stock',
    receipts: 'Receipts',
    refresh: 'Refresh',
    cost: 'Cost',
    expected: 'Expected',
    approve: 'Approve',
    reject: 'Reject',
    noReceipts: 'No receipts yet.',
  },

"""
    en_content = en_content[:api_idx] + china_warehouse_en + en_content[api_idx:]

api_idx = en_content.find("  apiKeys: {")
if 'analytics: {' not in en_content:
    analytics_en = """  analytics: {
    title: 'Analytics',
    funnel: 'Funnel',
    revenue: 'Revenue',
    cohort: 'Cohorts',
  },

"""
    en_content = en_content[:api_idx] + analytics_en + en_content[api_idx:]

api_idx = en_content.find("  apiKeys: {")
if 'shippingLabels: {' not in en_content:
    shipping_en = """  shippingLabels: {
    title: 'Shipping Labels',
    search: 'Search',
    allStatus: 'All Statuses',
    printAll: 'Print All',
    generated: 'Generated',
    print: 'Print',
    download: 'Download',
    noLabels: 'No labels generated.',
  },

"""
    en_content = en_content[:api_idx] + shipping_en + en_content[api_idx:]

api_idx = en_content.find("  apiKeys: {")
if 'tickets: {' not in en_content:
    tickets_en = """  tickets: {
    title: 'Tickets',
    checkSLA: 'Check SLA',
    all: 'All',
    autoRoute: 'Auto Route',
    noTickets: 'No tickets.',
  },

"""
    en_content = en_content[:api_idx] + tickets_en + en_content[api_idx:]

write_file('src/i18n/en.js', en_content)
print("Fixed en.js")