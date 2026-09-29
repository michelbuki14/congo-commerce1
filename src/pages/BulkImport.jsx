import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Download, FileSpreadsheet, Info, Upload } from 'lucide-react';
import DashboardNav from '@/components/DashboardNav';
import { SELLER_LINKS } from '@/lib/navLinks';
import ImportPreview from '@/components/import/ImportPreview';
import { buildProductTemplate, downloadText, mapRowsToProducts, parseCsv, PRODUCT_CSV_COLUMNS } from '@/lib/csv';
import { useActiveSeller } from '@/lib/seller';
import { emitEvent } from '@/lib/events';
import { formatUSD } from '@/lib/format';

export default function BulkImport() {
  const { seller, loading: loadingSeller } = useActiveSeller();
  const [categories, setCategories] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [publishDirect, setPublishDirect] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Category.list('sort_order', 200).then(setCategories).catch(() => setCategories([]));
  }, []);

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const { rows, error: parseError } = parseCsv(text);
      if (parseError) {
        setError(parseError);
        setParsed(null);
        return;
      }
      const mapped = mapRowsToProducts(rows, { categories, seller, defaultStatus: 'draft' });
      setParsed({ ...mapped, totalRows: rows.length });
    } catch {
      setError("Le fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un CSV.");
      setParsed(null);
    }
  };

  const products = parsed
    ? parsed.products.map((p) => ({ ...p, status: publishDirect ? 'published' : 'draft' }))
    : [];

  const confirm = async () => {
    if (!products.length) return;
    setImporting(true);
    setError('');
    try {
      const created = await base44.entities.Product.bulkCreate(products);
      if (seller?.id) {
        await base44.entities.Seller.update(seller.id, {
          products_count: (Number(seller.products_count) || 0) + created.length,
        }).catch(() => {});
      }
      emitEvent(base44, 'products_bulk_imported', {
        category: 'catalogue',
        source: 'BulkImport',
        reference: fileName,
        actorEmail: seller?.email || '',
        actorName: seller?.name || '',
        description: `${created.length} produit(s) importés depuis ${fileName} (${publishDirect ? 'publiés' : 'brouillons'})`,
        payload: { file_name: fileName, created: created.length, skipped: parsed?.issues?.length || 0, published: publishDirect },
      });
      setResult({ created: created.length, skipped: parsed?.issues?.length || 0, published: publishDirect });
      setParsed(null);
      setFileName('');
    } catch {
      setError("L'import a échoué. Aucun produit n'a été enregistré — réessayez.");
    } finally {
      setImporting(false);
    }
  };

  if (loadingSeller) return <div className="h-40 animate-pulse rounded-2xl bg-secondary" />;

  return (
    <div className="space-y-5 pb-8">
      <DashboardNav title="Import CSV de produits" links={SELLER_LINKS} />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Téléchargez le modèle, remplissez une ligne par produit, puis déposez le fichier : rien n'est enregistré avant votre
          confirmation. Les produits arrivent en brouillon par défaut, sauf si vous choisissez de les publier directement.
        </p>
      </div>

      {!seller ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          Aucune boutique n'est rattachée à votre compte. <Link to="/seller-onboarding" className="font-semibold text-primary">Ouvrez votre boutique</Link> pour importer un catalogue.
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Modèle et fichier
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadText('modele-produits-congo-commerce.csv', buildProductTemplate())}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger le modèle CSV
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">
            <Upload className="h-3.5 w-3.5" /> Choisir un fichier CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={readFile} />
          </label>
          {fileName ? <span className="self-center text-[11px] text-muted-foreground">{fileName}</span> : null}
        </div>
        <div className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground">Colonnes reconnues</p>
          <p className="mt-1">
            {PRODUCT_CSV_COLUMNS.map((c) => `${c.key}${c.required ? ' *' : ''}`).join(' · ')}
          </p>
          <p className="mt-1">Les colonnes obligatoires sont title et price_usd. Séparez les images et les mots-clés par des points-virgules.</p>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{error}</p> : null}

      {result ? (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{result.created} produit(s) importés{result.published ? ' et publiés' : ' en brouillon'}.</p>
            {result.skipped ? <p className="mt-0.5">{result.skipped} ligne(s) ignorée(s) faute d'informations valides.</p> : null}
            <p className="mt-0.5">
              Retrouvez-les dans <Link to="/seller/products" className="font-semibold text-primary">Mes produits</Link> pour ajuster prix, photos et stock.
            </p>
          </div>
        </div>
      ) : null}

      {parsed ? (
        <ImportPreview
          products={products}
          issues={parsed.issues}
          totalRows={parsed.totalRows}
          publishDirect={publishDirect}
          onTogglePublish={setPublishDirect}
          onConfirm={confirm}
          importing={importing}
        />
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Bonnes pratiques</h2>
        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <li>• Utilisez le nom exact de la catégorie (visible dans votre boutique) pour que le produit arrive dans le bon rayon.</li>
          <li>• Un prix inférieur ou égal à 0 fait ignorer la ligne : {formatUSD(0)} n'est jamais un prix de vente.</li>
          <li>• Les titres identiques reçoivent automatiquement un identifiant unique pour éviter les doublons d'URL.</li>
          <li>• Les images doivent être des liens https publics ; les fichiers de votre ordinateur ne sont pas transférés par le CSV.</li>
        </ul>
      </section>
    </div>
  );
}