import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <h1 className="font-heading text-2xl font-bold md:text-3xl">À propos de Congo Commerce</h1>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Congo Commerce est une place de marché en ligne conçue pour la République Démocratique du Congo. La
        plateforme réunit dans un même catalogue des vendeurs locaux, des entrepôts régionaux et des fournisseurs
        internationaux. Les acheteurs y comparent les prix en dollars ou en francs congolais, commandent en
        quelques minutes et se font livrer à domicile ou en point de retrait, à Kinshasa comme à Lubumbashi, Goma,
        Bukavu, Matadi ou Kisangani.
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Elle s'adresse d'abord aux acheteurs congolais qui veulent commander en ligne en toute confiance : chaque
        prix affiché est final, transport et frais d'importation inclus, le paiement se fait en mobile money ou à
        la livraison, et une protection acheteur permet d'ouvrir un litige jusqu'à sept jours après réception.
        Elle s'adresse aussi aux commerçants et aux créateurs de contenu : chaque vendeur gère sa boutique, ses
        produits, ses commandes et son portefeuille depuis un espace dédié, tandis que les créateurs touchent une
        commission sur les ventes générées par leur code de parrainage.
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        La plateforme est développée et opérée par l'équipe de Congo Commerce, basée à Kinshasa. Notre objectif est
        de rendre le commerce en ligne accessible au plus grand nombre, avec des outils pensés pour les réalités
        locales : connexion à faible bande passante, paiement par mobile money, livraison urbaine et retrait en
        point relais.
      </p>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Une question, une suggestion ou un partenariat ? Écrivez-nous depuis la page{' '}
        <Link to="/contact" className="font-semibold text-foreground underline">
          Contact
        </Link>
        .
      </p>
    </div>
  );
}