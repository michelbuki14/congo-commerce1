import React from 'react';
import { NavLink, Link } from 'react-router-dom';

const groups = [
  ['Vue générale', [['Tableau de bord', '/backoffice']]],
  ['Clients', [['Utilisateurs', '/admin/users'], ['Enseignes', '/admin/tenants']]],
  ['Commerce', [['Commandes', '/admin/orders'], ['Produits', '/admin/products']]],
  ['Opérations', [['Support', '/support-inbox'], ['Workflows', '/admin/workflows']]],
  ['Pilotage', [['Performance commerciale', '/backoffice/sales'], ['Analytique', '/platform-analytics'], ['Journal', '/admin/events'], ['Paramètres', '/admin/settings']]],
];

export default function BackofficeNav() {
  return <aside className="w-full shrink-0 border-b border-border bg-card p-4 md:min-h-screen md:w-56 md:border-b-0 md:border-r">
    <Link to="/backoffice" className="block text-lg font-black tracking-tight">STACK+ <span className="text-xs font-medium text-muted-foreground">BACK-OFFICE</span></Link>
    <nav aria-label="Navigation du back-office" className="mt-5 flex gap-4 overflow-x-auto md:block md:space-y-5">
      {groups.map(([group, links]) => <div key={group} className="min-w-max md:min-w-0">
        <h2 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group}</h2>
        <div className="flex gap-1 md:block">
          {links.map(([label, path]) => <NavLink key={path} to={path} end={path === '/backoffice'} className={({isActive}) => `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'}`}>{label}</NavLink>)}
        </div>
      </div>)}
    </nav>
    <Link to="/" className="mt-6 inline-block text-xs text-muted-foreground underline">Retour à la boutique</Link>
  </aside>;
}