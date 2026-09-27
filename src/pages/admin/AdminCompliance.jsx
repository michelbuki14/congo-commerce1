import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck, Receipt, Inbox, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardNav from '@/components/DashboardNav';
import { ADMIN_LINKS } from '@/lib/navLinks';
import { DEFAULT_COMPANY_CONFIG, DEFAULT_TAX_CONFIG, loadPlatformConfig } from '@/lib/config';
import LicenseRegister from '@/components/compliance/LicenseRegister';
import { formatDateTime } from '@/lib/format';

const COMPANY_FIELDS = [
  { key: 'legal_name', label: 'Dénomination sociale' },
  { key: 'trade_name', label: 'Nom commercial' },
  { key: 'legal_form', label: 'Forme juridique' },
  { key: 'rccm', label: 'RCCM' },
  { key: 'nif', label: 'NIF (identifiant fiscal)' },
  { key: 'vat_number', label: 'Numéro de TVA' },
  { key: 'capital', label: 'Capital social' },
  { key: 'address', label: 'Adresse du siège' },
  { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' },
  { key: 'email', label: 'Email de contact' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'publisher', label: 'Directeur de la publication' },
  { key: 'data_contact', label: 'Contact données personnelles' },
  { key: 'host_name', label: 'Hébergeur' },
  { key: 'host_address', label: 'Adresse hébergeur' },
  { key: 'host_contact', label: 'Contact hébergeur' },
];

const REQUIRED_MENTIONS = ['legal_name', 'rccm', 'nif', 'address', 'email'];

const REQUEST_TYPES = {
  access: 'Accès',
  rectification: 'Rectification',
  deletion: 'Suppression',
  opposition: 'Opposition',
};

const REQUEST_STATUSES = {
  received: 'Reçue',
  verification_sent: 'Vérification envoyée',
  verified: 'Vérifiée',
  in_progress: 'En cours',
  ready: 'Prête à envoyer',
  completed: 'Traitée',
  rejected: 'Refusée',
};

export default function AdminCompliance() {
  const [company, setCompany] = useState(DEFAULT_COMPANY_CONFIG);
  const [tax, setTax] = useState(DEFAULT_TAX_CONFIG);
  const [recordIds, setRecordIds] = useState({});
  const [licenses, setLicenses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');

  const loadRequests = () =>
    base44.entities.DataRequest.list('-created_date', 50).then(setRequests).catch(() => []);

  useEffect(() => {
    (async () => {
      const rows = await base44.entities.PlatformSetting.list().catch(() => []);
      const ids = {};
      rows.forEach((r) => {
        ids[r.key] = r.id;
        if (r.key === 'company') setCompany({ ...DEFAULT_COMPANY_CONFIG, ...(r.value || {}) });
        if (r.key === 'tax') setTax({ ...DEFAULT_TAX_CONFIG, ...(r.value || {}) });
        if (r.key === 'licenses') setLicenses(r.value?.entries || []);
      });
      setRecordIds(ids);
      await loadRequests();
      setLoading(false);
    })();
  }, []);

  const persist = async (key, label, group, value) => {
    if (recordIds[key]) {
      await base44.entities.PlatformSetting.update(recordIds[key], { value, label, group });
    } else {
      const created = await base44.entities.PlatformSetting.create({ key, label, group, value });
      setRecordIds((prev) => ({ ...prev, [key]: created.id }));
    }
    await loadPlatformConfig(true);
  };

  const flash = (key) => {
    setSaved(key);
    setTimeout(() => setSaved(''), 2000);
  };

  const saveCompany = async () => {
    await persist('company', 'Identité légale', 'compliance', company);
    flash('company');
  };

  const saveTax = async () => {
    await persist('tax', 'TVA et facturation', 'compliance', tax);
    flash('tax');
  };

  const saveLicenses = async (next) => {
    setLicenses(next);
    await persist('licenses', 'Licences & documents', 'compliance', { entries: next });
  };

  const updateRequest = async (request, patch) => {
    const updated = await base44.entities.DataRequest.update(request.id, patch);
    setRequests((prev) => prev.map((r) => (r.id === request.id ? updated : r)));
  };

  const missing = REQUIRED_MENTIONS.filter((k) => !String(company[k] || '').trim());

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Conformité" links={ADMIN_LINKS} />

      {!!missing.length && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Mentions obligatoires manquantes :{' '}
            <span className="font-semibold">
              {missing.map((k) => COMPANY_FIELDS.find((f) => f.key === k)?.label).join(', ')}
            </span>
            . Elles apparaissent sur vos mentions légales, vos factures et en pied de page.
          </span>
        </div>
      )}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Identité légale
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Ces informations alimentent les mentions légales, les conditions générales de vente, la politique de
          confidentialité et l'en-tête de vos factures.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {COMPANY_FIELDS.map((f) => (
            <label key={f.key} className="text-[11px] text-muted-foreground">
              {f.label}
              <input
                value={company[f.key] ?? ''}
                onChange={(e) => setCompany({ ...company, [f.key]: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={saveCompany} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <Save className="h-4 w-4" /> {saved === 'company' ? 'Enregistré' : "Enregistrer l'identité légale"}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Receipt className="h-4 w-4 text-primary" /> TVA et facturation
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Les prix affichés sont TTC : la TVA est calculée à partir du prix affiché et détaillée sur la facture.
          Elle n'est jamais ajoutée au montant que le client voit.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-[11px] text-muted-foreground">
            Taux de TVA (%)
            <input
              type="number"
              step="0.1"
              value={tax.vat_rate ?? 0}
              onChange={(e) => setTax({ ...tax, vat_rate: Number(e.target.value) })}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="flex items-center gap-2.5 self-end pb-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={tax.enabled !== false}
              onChange={(e) => setTax({ ...tax, enabled: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Appliquer la TVA sur les commandes et les factures
          </label>
        </div>
        <label className="block text-[11px] text-muted-foreground">
          Mention figurant en bas de facture
          <input
            value={tax.invoice_note ?? ''}
            onChange={(e) => setTax({ ...tax, invoice_note: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <button type="button" onClick={saveTax} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          <Save className="h-4 w-4" /> {saved === 'tax' ? 'Enregistré' : 'Enregistrer la TVA'}
        </button>
      </section>

      <LicenseRegister entries={licenses} onSave={saveLicenses} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Inbox className="h-4 w-4 text-primary" /> Demandes relatives aux données
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Demandes envoyées depuis la politique de confidentialité. À traiter dans un délai maximum de trente
          (30) jours.
        </p>
        {requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
            Aucune demande pour le moment.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {r.request_number} · {REQUEST_TYPES[r.type] || r.type}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.name} · {r.email || r.phone || '—'} · {formatDateTime(r.created_date)}
                    </p>
                  </div>
                  <select
                    value={r.status}
                    onChange={(e) => updateRequest(r, { status: e.target.value })}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {Object.entries(REQUEST_STATUSES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {r.details && <p className="mt-1.5 text-[11px] text-muted-foreground">{r.details}</p>}
                <div className="mt-2 flex gap-2">
                  <input
                    value={notes[r.id] ?? r.resolution_notes ?? ''}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    placeholder="Note de traitement"
                    className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => updateRequest(r, { resolution_notes: notes[r.id] ?? r.resolution_notes ?? '' })}
                    className="rounded-lg bg-secondary px-3 text-xs font-semibold"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}