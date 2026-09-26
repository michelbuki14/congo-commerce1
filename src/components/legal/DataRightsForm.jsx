import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TYPES = [
  { id: 'access', label: 'Accéder à mes données' },
  { id: 'rectification', label: 'Corriger mes données' },
  { id: 'deletion', label: 'Supprimer mes données' },
  { id: 'opposition', label: 'Refuser un traitement' },
];

export default function DataRightsForm() {
  const [form, setForm] = useState({ type: 'access', name: '', email: '', phone: '', details: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) {
      setError('Indiquez votre nom et un moyen de vous joindre (email ou téléphone).');
      return;
    }
    setSending(true);
    try {
      const requestNumber = `DD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;
      await base44.entities.DataRequest.create({ ...form, request_number: requestNumber });
      await base44.entities.Notification.create({
        title: `Demande relative aux données — ${requestNumber}`,
        message: `${form.name} demande : ${TYPES.find((t) => t.id === form.type)?.label || form.type}.`,
        type: 'system',
        audience: 'admin',
      });
      setDone(requestNumber);
    } catch {
      setError("Votre demande n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <section id="droits" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
        <CheckCircle2 className="h-6 w-6 text-emerald-700" />
        <h2 className="mt-2 text-sm font-bold text-emerald-900">Demande enregistrée</h2>
        <p className="mt-1 text-xs text-emerald-900">
          Votre référence est <span className="font-bold">{done}</span>. Nous traitons votre demande dans un
          délai maximum de trente (30) jours et vous répondons aux coordonnées indiquées.
        </p>
      </section>
    );
  }

  return (
    <section id="droits" className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold">Exercer vos droits</h2>
      <p className="text-xs text-muted-foreground">
        Adressez-nous votre demande depuis ce formulaire. Une référence vous est attribuée immédiatement.
      </p>
      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</p>}
      <form onSubmit={submit} className="space-y-2.5">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nom complet"
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        />
        <div className="grid gap-2.5 md:grid-cols-2">
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Téléphone (+243…)"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>
        <textarea
          value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
          rows={3}
          placeholder="Précisez votre demande (numéro de commande, données concernées…)"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {sending ? 'Envoi…' : 'Envoyer ma demande'}
        </button>
      </form>
    </section>
  );
}