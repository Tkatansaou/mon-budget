// ── Devise ────────────────────────────────────────────────────────────────────
const CLE_DEVISE = 'budget-devise';

const DEVISES = {
  FCFA: { symbole: 'FCFA', position: 'apres', decimales: 0, locale: 'fr-FR' },
  EUR:  { symbole: '€',    position: 'apres', decimales: 2, locale: 'fr-FR' },
  USD:  { symbole: '$',    position: 'avant', decimales: 2, locale: 'en-US' },
  GBP:  { symbole: '£',    position: 'avant', decimales: 2, locale: 'en-GB' },
  GHS:  { symbole: '₵',    position: 'avant', decimales: 2, locale: 'en-GH' },
  NGN:  { symbole: '₦',    position: 'avant', decimales: 2, locale: 'en-NG' },
};

function chargerDevise() {
  return localStorage.getItem(CLE_DEVISE) || 'FCFA';
}

function sauvegarderDevise(code) {
  localStorage.setItem(CLE_DEVISE, code);
}

function deviseActive() {
  return DEVISES[chargerDevise()] || DEVISES.FCFA;
}

function appliquerDeviseFormulaire() {
  const d     = deviseActive();
  const label = document.getElementById('label-montant');
  const input = document.getElementById('input-montant');
  if (label) label.textContent = 'Montant (' + d.symbole + ')';
  if (input) {
    input.step        = d.decimales === 0 ? '1' : '0.01';
    input.placeholder = d.decimales === 0 ? '0' : '0,00';
  }
}

// ── Persistance ───────────────────────────────────────────────────────────────
const CLE = 'budget-transactions';

function chargerTransactions() {
  try { return JSON.parse(localStorage.getItem(CLE)) || []; }
  catch { return []; }
}

function sauvegarderTransactions(liste) {
  localStorage.setItem(CLE, JSON.stringify(liste));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Calculs ───────────────────────────────────────────────────────────────────
function calcTotalRevenus(liste) {
  return liste.filter(t => t.type === 'revenu').reduce((s, t) => s + t.montant, 0);
}

function calcTotalDepenses(liste) {
  return liste.filter(t => t.type === 'depense').reduce((s, t) => s + t.montant, 0);
}

function calcSolde(liste) {
  return calcTotalRevenus(liste) - calcTotalDepenses(liste);
}

function repartitionParCategorie(liste) {
  const map = new Map();
  liste
    .filter(t => t.type === 'depense')
    .forEach(t => map.set(t.categorie, (map.get(t.categorie) || 0) + t.montant));
  return map;
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formaterMontant(n) {
  const d      = deviseActive();
  const nombre = n.toLocaleString(d.locale, {
    minimumFractionDigits: d.decimales,
    maximumFractionDigits: d.decimales,
  });
  return d.position === 'avant' ? d.symbole + nombre : nombre + ' ' + d.symbole;
}

function formaterDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return d + '/' + m + '/' + y;
}

const LABELS_CAT = {
  alimentation: 'Alimentation',
  logement:     'Logement',
  transport:    'Transport',
  loisirs:      'Loisirs',
  sante:        'Santé',
  autres:       'Autres',
};

function labelCat(cat) {
  return LABELS_CAT[cat] || cat;
}

// ── Tableau de bord ───────────────────────────────────────────────────────────
function afficherStats(liste) {
  const solde    = calcSolde(liste);
  const revenus  = calcTotalRevenus(liste);
  const depenses = calcTotalDepenses(liste);

  const elSolde = document.getElementById('kpi-solde-val');
  elSolde.textContent = (solde >= 0 ? '+' : '') + formaterMontant(Math.abs(solde));
  elSolde.className = 'kpi-value ' + (solde >= 0 ? 'positif' : 'negatif');

  document.getElementById('kpi-revenus-val').textContent  = formaterMontant(revenus);
  document.getElementById('kpi-depenses-val').textContent = formaterMontant(depenses);
}

// ── Graphique SVG (donut) ─────────────────────────────────────────────────────
const COULEURS = {
  alimentation: '#f97316',
  logement:     '#3b82f6',
  transport:    '#8b5cf6',
  loisirs:      '#ec4899',
  sante:        '#10b981',
  autres:       '#94a3b8',
};

function polarVers(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function traceArc(cx, cy, r, debut, fin) {
  const s = polarVers(cx, cy, r, debut);
  const e = polarVers(cx, cy, r, fin);
  const grand = fin - debut > 180 ? 1 : 0;
  return 'M ' + cx + ' ' + cy + ' L ' + s.x + ' ' + s.y +
         ' A ' + r + ' ' + r + ' 0 ' + grand + ' 1 ' + e.x + ' ' + e.y + ' Z';
}

function dessinerGraphique(liste) {
  const svg       = document.getElementById('chart-svg');
  const legend    = document.getElementById('chart-legend');
  const empty     = document.getElementById('chart-empty');
  const container = document.getElementById('chart-container');

  svg.innerHTML    = '';
  legend.innerHTML = '';

  const rep   = repartitionParCategorie(liste);
  const total = [...rep.values()].reduce((s, v) => s + v, 0);

  if (rep.size === 0 || total === 0) {
    container.style.display = 'none';
    empty.style.display     = 'block';
    return;
  }

  container.style.display = 'flex';
  empty.style.display     = 'none';

  const cx = 100, cy = 100, r = 90;
  let angle = 0;

  rep.forEach((montant, cat) => {
    const pct     = montant / total;
    const portion = pct * 360;
    const couleur = COULEURS[cat] || '#94a3b8';

    if (rep.size === 1) {
      const cercle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cercle.setAttribute('cx', cx);
      cercle.setAttribute('cy', cy);
      cercle.setAttribute('r',  r);
      cercle.setAttribute('fill', couleur);
      svg.appendChild(cercle);
    } else {
      const fin  = angle + portion;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d',            traceArc(cx, cy, r, angle, fin));
      path.setAttribute('fill',         couleur);
      path.setAttribute('stroke',       '#fff');
      path.setAttribute('stroke-width', '2');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = labelCat(cat) + ' : ' + formaterMontant(montant) +
                          ' (' + Math.round(pct * 100) + ' %)';
      path.appendChild(title);

      svg.appendChild(path);
      angle = fin;
    }

    // Légende
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML =
      '<span class="legend-dot" style="background:' + couleur + '"></span>' +
      '<span class="legend-cat">' + escHtml(labelCat(cat)) + '</span>' +
      '<span class="legend-pct">' + Math.round(pct * 100) + ' %</span>';
    legend.appendChild(item);
  });

  // Trou central par-dessus toutes les parts
  const trou = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  trou.setAttribute('cx',   cx);
  trou.setAttribute('cy',   cy);
  trou.setAttribute('r',    48);
  trou.setAttribute('fill', '#ffffff');
  svg.appendChild(trou);
}

// ── Historique ────────────────────────────────────────────────────────────────
function rendreLigne(t) {
  const tr      = document.createElement('tr');
  const depense = t.type === 'depense';
  const signe   = depense ? '−' : '+';
  const montantF = signe + formaterMontant(t.montant);

  tr.innerHTML =
    '<td>' + escHtml(formaterDate(t.date)) + '</td>' +
    '<td class="td-desc" title="' + escHtml(t.description || '') + '">' +
      escHtml(t.description || '—') + '</td>' +
    '<td class="col-cat"><span class="badge-cat badge-' + escHtml(t.categorie) + '">' +
      escHtml(labelCat(t.categorie)) + '</span></td>' +
    '<td><span class="badge-type ' + escHtml(t.type) + '">' +
      (depense ? 'Dépense' : 'Revenu') + '</span></td>' +
    '<td class="td-montant ' + (depense ? 'negatif' : 'positif') + '">' +
      escHtml(montantF) + '</td>' +
    '<td class="td-actions">' +
      '<button class="btn-row btn-edit" data-id="' + escHtml(t.id) + '">Modifier</button> ' +
      '<button class="btn-row danger btn-del" data-id="' + escHtml(t.id) + '">Supprimer</button>' +
    '</td>';
  return tr;
}

function afficherHistorique(liste) {
  const tbody = document.getElementById('history-tbody');
  const empty = document.getElementById('history-empty');
  const table = document.getElementById('history-table');

  tbody.innerHTML = '';

  if (liste.length === 0) {
    empty.style.display = 'block';
    table.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  table.style.display = 'table';

  const triees = [...liste].sort((a, b) =>
    new Date(b.date) - new Date(a.date) || b.creeA - a.creeA
  );
  triees.forEach(t => tbody.appendChild(rendreLigne(t)));
}

// ── Filtres ───────────────────────────────────────────────────────────────────
function appliquerFiltres() {
  const type      = document.getElementById('select-type').value;
  const categorie = document.getElementById('select-categorie').value;
  const periode   = document.getElementById('select-periode').value;

  let liste = chargerTransactions();

  if (type)      liste = liste.filter(t => t.type === type);
  if (categorie) liste = liste.filter(t => t.categorie === categorie);
  if (periode) {
    const limite = Date.now() - parseInt(periode) * 86400000;
    liste = liste.filter(t => new Date(t.date).getTime() >= limite);
  }

  afficherHistorique(liste);
}

// ── Formulaire ────────────────────────────────────────────────────────────────
let idEnEdition = null;

function ouvrirModal(id) {
  const el = document.getElementById(id);
  el.setAttribute('aria-hidden', 'false');
  el.classList.add('visible');
}

function fermerModal(id) {
  const el = document.getElementById(id);
  el.setAttribute('aria-hidden', 'true');
  el.classList.remove('visible');
}

function ouvrirCreation() {
  idEnEdition = null;
  document.getElementById('modal-form-titre').textContent = 'Nouvelle transaction';
  document.getElementById('form-transaction').reset();
  document.getElementById('form-error').textContent = '';
  document.getElementById('input-date').value = new Date().toISOString().slice(0, 10);
  appliquerDeviseFormulaire();
  ouvrirModal('modal-form');
  document.getElementById('input-montant').focus();
}

function ouvrirEdition(id) {
  const t = chargerTransactions().find(x => x.id === id);
  if (!t) return;

  idEnEdition = id;
  document.getElementById('modal-form-titre').textContent = 'Modifier la transaction';
  document.getElementById('form-error').textContent = '';

  document.querySelector('input[name="type"][value="' + t.type + '"]').checked = true;
  document.getElementById('input-montant').value     = t.montant;
  document.getElementById('input-date').value        = t.date;
  document.getElementById('select-form-cat').value   = t.categorie;
  document.getElementById('input-description').value = t.description || '';

  appliquerDeviseFormulaire();
  ouvrirModal('modal-form');
  document.getElementById('input-montant').focus();
}

function fermerFormulaire() {
  fermerModal('modal-form');
  idEnEdition = null;
}

function sauvegarder(e) {
  e.preventDefault();
  const errEl = document.getElementById('form-error');
  errEl.textContent = '';

  const type        = document.querySelector('input[name="type"]:checked').value;
  const montantStr  = document.getElementById('input-montant').value.trim();
  const date        = document.getElementById('input-date').value;
  const categorie   = document.getElementById('select-form-cat').value;
  const description = document.getElementById('input-description').value.trim();

  const montant = parseFloat(montantStr);
  if (!montantStr || isNaN(montant) || montant <= 0) {
    errEl.textContent = 'Veuillez saisir un montant valide (supérieur à 0).';
    document.getElementById('input-montant').focus();
    return;
  }
  if (!categorie) {
    errEl.textContent = 'Veuillez choisir une catégorie.';
    document.getElementById('select-form-cat').focus();
    return;
  }
  if (!date) {
    errEl.textContent = 'Veuillez saisir une date.';
    document.getElementById('input-date').focus();
    return;
  }

  let liste = chargerTransactions();

  if (idEnEdition) {
    liste = liste.map(t =>
      t.id === idEnEdition ? { ...t, type, montant, categorie, date, description } : t
    );
  } else {
    liste.push({ id: genId(), type, montant, categorie, date, description, creeA: Date.now() });
  }

  sauvegarderTransactions(liste);
  fermerFormulaire();
  rafraichir();
}

// ── Suppression ───────────────────────────────────────────────────────────────
let idASupprimer = null;

function demanderSuppression(id) {
  idASupprimer = id;
  ouvrirModal('modal-confirm');
}

function fermerConfirm() {
  idASupprimer = null;
  fermerModal('modal-confirm');
}

function confirmerSuppression() {
  if (!idASupprimer) return;
  const liste = chargerTransactions().filter(t => t.id !== idASupprimer);
  sauvegarderTransactions(liste);
  fermerConfirm();
  rafraichir();
}

// ── Rafraîchissement global ───────────────────────────────────────────────────
function rafraichir() {
  const liste = chargerTransactions();
  afficherStats(liste);
  dessinerGraphique(liste);
  appliquerFiltres();
}

// ── Initialisation ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restaurer la devise sauvegardée
  const selectDevise = document.getElementById('select-devise');
  selectDevise.value = chargerDevise();

  selectDevise.addEventListener('change', () => {
    sauvegarderDevise(selectDevise.value);
    appliquerDeviseFormulaire();
    rafraichir();
  });

  document.getElementById('btn-ajouter').addEventListener('click', ouvrirCreation);

  document.getElementById('btn-fermer-form').addEventListener('click', fermerFormulaire);
  document.getElementById('btn-annuler-form').addEventListener('click', fermerFormulaire);
  document.getElementById('modal-form').addEventListener('click', e => {
    if (e.target === e.currentTarget) fermerFormulaire();
  });

  document.getElementById('form-transaction').addEventListener('submit', sauvegarder);

  document.getElementById('btn-fermer-confirm').addEventListener('click', fermerConfirm);
  document.getElementById('btn-annuler-confirm').addEventListener('click', fermerConfirm);
  document.getElementById('btn-confirmer-suppr').addEventListener('click', confirmerSuppression);
  document.getElementById('modal-confirm').addEventListener('click', e => {
    if (e.target === e.currentTarget) fermerConfirm();
  });

  document.getElementById('history-tbody').addEventListener('click', e => {
    const edit = e.target.closest('.btn-edit');
    const del  = e.target.closest('.btn-del');
    if (edit) ouvrirEdition(edit.dataset.id);
    if (del)  demanderSuppression(del.dataset.id);
  });

  ['select-type', 'select-categorie', 'select-periode'].forEach(id =>
    document.getElementById(id).addEventListener('change', appliquerFiltres)
  );

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { fermerFormulaire(); fermerConfirm(); }
  });

  rafraichir();
});
