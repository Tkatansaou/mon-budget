# Application de Gestion de Budget Personnel

## Description
Application web de gestion de budget personnel permettant à l'utilisateur d'enregistrer ses dépenses et revenus, de visualiser sa situation financière et d'analyser ses habitudes de consommation par catégorie. Interface en français, design moderne et épuré, sans dépendances externes.

## Fonctionnalités implémentées
- Ajouter une transaction (dépense ou revenu) : montant, catégorie, date, description
- Modifier une transaction existante (formulaire pré-rempli)
- Supprimer une transaction avec modal de confirmation
- Tableau de bord : solde actuel, total revenus, total dépenses (KPI colorés)
- Graphique donut SVG de répartition des dépenses par catégorie + légende
- Historique filtrable par type, catégorie et période (7j / 30j / 3 mois / 1 an)
- Tri des transactions par date décroissante
- État vide affiché quand aucune transaction ne correspond
- **Sélecteur de devise** dans le header — mise à jour instantanée de tout l'affichage
- Persistance complète via `localStorage` — données et devise conservées entre sessions

## Devises disponibles
| Code | Devise | Décimales | Format |
|---|---|---|---|
| `FCFA` | Franc CFA (défaut) | 0 | `1 500 FCFA` |
| `EUR` | Euro | 2 | `1 500,00 €` |
| `USD` | Dollar américain | 2 | `$1,500.00` |
| `GBP` | Livre sterling | 2 | `£1,500.00` |
| `GHS` | Cedi ghanéen | 2 | `₵1,500.00` |
| `NGN` | Naira nigérian | 2 | `₦1,500.00` |

## Catégories de dépenses
| Clé | Label | Couleur |
|---|---|---|
| `alimentation` | Alimentation | Orange `#f97316` |
| `logement` | Logement | Bleu `#3b82f6` |
| `transport` | Transport | Bleu ciel `#0ea5e9` |
| `loisirs` | Loisirs | Rose `#ec4899` |
| `sante` | Santé | Vert `#10b981` |
| `autres` | Autres | Gris `#94a3b8` |

> Note : la clé interne est `sante` (sans accent) pour éviter les problèmes de classes CSS.

## Stack technique
- **HTML5** pur — `<header>`, `<main>`, `<section>`, `<table>`, 2 modaux
- **CSS3** pur — variables CSS, flexbox, grid, responsive mobile, animations modal
- **JavaScript ES6+** pur — aucun framework, aucune dépendance
- Graphique : donut SVG généré dynamiquement (260 × 260 px, viewBox 200 × 200)
- Stockage : `localStorage` — clé `budget-transactions` (tableau JSON), `budget-devise` (string)

## Structure des fichiers
```
Plateformes/
├── index.html      # Structure HTML complète : header, KPI, graphique, historique, 2 modaux
├── style.css       # Design : variables CSS, header sombre, cartes, donut, table, badges
├── app.js          # Logique : devise, CRUD, calculs, SVG, filtres, rendu DOM
├── CLAUDE.md       # Ce fichier
└── .claude/
    └── launch.json # Serveur "budget-app" sur le port 3456
```

## Architecture JS (`app.js`)
| Section | Fonctions clés |
|---|---|
| **Devise** | `chargerDevise()`, `sauvegarderDevise()`, `deviseActive()`, `appliquerDeviseFormulaire()` |
| **Persistance** | `chargerTransactions()`, `sauvegarderTransactions()`, `genId()` |
| **Calculs** | `calcSolde()`, `calcTotalRevenus()`, `calcTotalDepenses()`, `repartitionParCategorie()` |
| **Tableau de bord** | `afficherStats()` |
| **Graphique** | `dessinerGraphique()`, `polarVers()`, `traceArc()` |
| **Historique** | `afficherHistorique()`, `rendreLigne()` |
| **Filtres** | `appliquerFiltres()` — type, catégorie, période (en mémoire, sans toucher localStorage) |
| **Formulaire** | `ouvrirCreation()`, `ouvrirEdition()`, `fermerFormulaire()`, `sauvegarder()` |
| **Suppression** | `demanderSuppression()`, `confirmerSuppression()`, `fermerConfirm()` |
| **Modaux** | `ouvrirModal(id)`, `fermerModal(id)` — génériques, partagés par les 2 modaux |
| **Utilitaires** | `escHtml()`, `formaterMontant()`, `formaterDate()`, `labelCat()` |
| **Init** | `rafraichir()` — recharge stats + graphique + filtres après chaque mutation |

## Modèle de données

### Transaction (localStorage `budget-transactions`)
```js
{
  id:          string,   // timestamp base36 + random 4 chars
  type:        'depense' | 'revenu',
  montant:     number,   // toujours positif (le signe est déduit du type à l'affichage)
  categorie:   string,   // l'une des 6 clés définies ci-dessus
  date:        string,   // format ISO 'YYYY-MM-DD'
  description: string,   // texte libre, peut être vide
  creeA:       number    // timestamp ms — sert au tri secondaire (à date égale)
}
```

### Devise (localStorage `budget-devise`)
```js
'FCFA' | 'EUR' | 'USD' | 'GBP' | 'GHS' | 'NGN'  // défaut : 'FCFA'
```

## Conventions
- Variables JS en **camelCase**, constantes globales en **MAJUSCULES**
- Classes CSS en **kebab-case**, IDs préfixés par contexte (`btn-`, `input-`, `select-`, `modal-`, `kpi-`, `chart-`)
- Montants toujours positifs en base de données — le signe `+`/`−` est ajouté au rendu
- Format d'affichage piloté par l'objet `DEVISES` : locale, symbole, position, décimales
- Dépenses en rouge, revenus en vert, solde négatif en rouge / positif en vert
- Tout le texte affiché est en **français**
- Pas de commentaires sauf logique non évidente

## Serveur de développement
```bash
npx serve -p 3456 .
```
Accessible sur `http://localhost:3456` — nom dans launch.json : `budget-app`
