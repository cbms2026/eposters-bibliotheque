/* Bibliothèque des e-posters — SPA sans dépendance.
 * Routeur par hash :
 *   #/                       accueil (spécialités)
 *   #/s/<specialite>         thèmes de la spécialité
 *   #/s/<spec>/t/<theme>     e-posters du thème
 *   #/p/<chemin.pdf>         lecteur PDF
 */

"use strict";

const ICÔNES = { biochimie: "🧪", microbiologie: "🦠", hemobiologie: "🩸", immunologie: "🧬", programme: "📋" };
const NOMS_SPECS = { programme: "Programme du congrès" };

let DONNEES = null;      // data/posters.json
let RECHERCHE = null;    // résumés du carnet d'abstracts

const vue = () => document.getElementById("vue");
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ---------- Chargement ---------- */
async function charger() {
  const [posters, ...fichiers] = await Promise.all([
    fetch("data/posters.json").then((r) => r.json()),
    fetch("assets/recherche/microbiologie.json").then((r) => r.json()),
    fetch("assets/recherche/immunologie.json").then((r) => r.json()),
    fetch("assets/recherche/hemobiologie.json").then((r) => r.json()),
    fetch("assets/recherche/articles.json").then((r) => r.json()),
  ]);
  DONNEES = posters;
  RECHERCHE = fichiers.flat().filter(Boolean);
  const programme = posters.programme?.[0];
  if (programme) {
    document.getElementById("heroActions").innerHTML =
      `<a class="bouton-programme" href="#/p/${encodeURIComponent(programme.fichier)}">📋 Programme du congrès</a>`;
  }
}

function specParSlug(slug) {
  return DONNEES.specialites.find((s) => s.slug === slug);
}

/* ---------- Vues ---------- */
function nbPostersSpec(spec) {
  return spec.posters_racine.length +
    spec.themes.reduce((n, t) => n + t.posters.length, 0) +
    spec.themes_autres.reduce((n, t) => n + t.posters.length, 0);
}

function afficherAccueil() {
  const specs = DONNEES.specialites.map((s) => `
    <a class="carte-lien" style="--couleur:${s.couleur}" href="#/s/${s.slug}">
      <span class="carte-lien__icone">${ICÔNES[s.slug] || "📄"}</span>
      <span>
        <span class="carte-lien__titre">${s.titre}</span><br>
        <span class="carte-lien__sous-titre">${nbPostersSpec(s)} e-poster(s) · ${s.themes.length} thèmes</span>
      </span>
      <span class="carte-lien__fleche">›</span>
    </a>`).join("");

  vue().innerHTML = `
    <h2 class="titre-section">📚 Spécialités</h2>
    <div class="grille">${specs}</div>`;
}

function afficherSpecialite(slug) {
  const spec = specParSlug(slug);
  if (!spec) { location.hash = "#/"; return; }
  const tousThemes = [...spec.themes, ...spec.themes_autres];
  const racine = spec.posters_racine.map((p) => cartePoster(p, spec.couleur)).join("");

  vue().innerHTML = `
    <nav class="fil-ariane"><a href="#/">Accueil</a> › <strong>${spec.titre}</strong></nav>
    <h2 class="titre-section">${ICÔNES[slug] || "📄"} ${spec.titre}</h2>
    ${racine ? `<h3 class="titre-section">Généraux</h3>${racine}` : ""}
    <h3 class="titre-section">Thèmes officiels</h3>
    <div class="grille grille--themes">
      ${tousThemes.map((t) => `
        <a class="carte-lien" style="--couleur:${spec.couleur}" href="#/s/${slug}/t/${t.slug}">
          <span class="carte-lien__icone">${ICÔNES[slug]}</span>
          <span>
            <span class="carte-lien__titre">${t.titre}</span><br>
            <span class="carte-lien__sous-titre">${t.posters.length} e-poster(s)</span>
          </span>
          <span class="carte-lien__fleche">›</span>
        </a>`).join("")}
    </div>`;
}

function cartePoster(p, couleur) {
  const apercu = p.vignette
    ? `<img class="poster__img" src="${p.vignette}" alt="" loading="lazy"
           onerror="this.outerHTML='<span class=\'poster__icone\'>📄</span>'">`
    : `<span class="poster__icone">📄</span>`;
  return `
    <a class="poster" style="--couleur:${couleur}" href="#/p/${encodeURI(p.fichier)}">
      ${apercu}
      <span>
        <span class="poster__titre">${p.titre}</span><br>
        <span class="poster__meta">${p.nom}</span>
      </span>
      <span class="poster__fleche">›</span>
    </a>`;
}

function afficherTheme(slug, slugTheme) {
  const spec = specParSlug(slug);
  const theme = spec && [...spec.themes, ...spec.themes_autres].find((t) => t.slug === slugTheme);
  if (!theme) { location.hash = `#/s/${slug}`; return; }

  vue().innerHTML = `
    <nav class="fil-ariane">
      <a href="#/">Accueil</a> › <a href="#/s/${slug}">${spec.titre}</a> › <strong>${theme.titre}</strong>
    </nav>
    <h2 class="titre-section">${theme.titre}</h2>
    ${theme.posters.length
      ? theme.posters.map((p) => cartePoster(p, spec.couleur)).join("")
      : `<div class="carte vide">Aucun e-poster pour le moment.</div>`}`;
}

function afficherLecteur(chemin) {
  const nom = decodeURIComponent(chemin.split("/").pop());
  vue().innerHTML = `
    <a class="retour" href="javascript:history.back()">← Retour</a>
    <div class="lecteur__barre">
      <strong>📄 ${nom.replace(/\.pdf$/i, "").replace(/_/g, " ")}</strong>
      <a class="btn btn--or" href="${chemin}" target="_blank" rel="noopener">↗ Ouvrir</a>
      <a class="btn btn--gris" href="${chemin}" download>⬇ Télécharger</a>
    </div>
    <div class="lecteur__cadre">
      <embed src="${chemin}" type="application/pdf">
    </div>`;
}

/* ---------- Recherche globale ---------- */
function configurerRecherche() {
  const champ = document.getElementById("champRecherche");
  const zone = document.getElementById("resultatsRecherche");
  let minuteur;

  champ.addEventListener("input", () => {
    clearTimeout(minuteur);
    minuteur = setTimeout(() => {
      const q = norm(champ.value.trim());
      if (q.length < 2) { zone.innerHTML = ""; return; }
      zone.innerHTML = rechercher(q).slice(0, 40).map((r) => `
        <a class="resultat" href="${r.lien}">
          <span class="resultat__puce">${r.puce}</span>
          <span>
            <span class="resultat__titre">${r.titre}</span><br>
            <span class="resultat__meta">${r.meta}</span>
          </span>
          <span class="resultat__code">${r.code}</span>
        </a>`).join("") ||
        `<div class="vide">Aucun résultat pour « ${champ.value.trim()} »</div>`;
    }, 200);
  });
}

function rechercher(q) {
  const res = [];
  for (const spec of DONNEES.specialites) {
    const tous = [...spec.posters_racine,
      ...spec.themes.flatMap((t) => t.posters),
      ...spec.themes_autres.flatMap((t) => t.posters)];
    for (const p of tous) {
      if (p.recherche.includes(q)) {
        res.push({
          lien: `#/p/${encodeURI(p.fichier)}`,
          puce: "📄", titre: p.titre, meta: spec.titre,
          code: "E-poster",
        });
      }
    }
  }
  for (const a of RECHERCHE) {
    const cible = norm(`${a.numero} ${a.auteur} ${a.coauteurs} ${a.titre} ${a.affiliations} ${a.resume} ${a.mots_cles}`);
    if (cible.includes(q)) {
      const auteurs = [a.auteur, a.coauteurs].filter(Boolean).join(" ; ");
      res.push({
        lien: `#/s/${specDepuisNumero(a.numero)}`,
        puce: "🔎",
        titre: a.titre,
        meta: auteurs,
        code: a.numero,
      });
    }
  }
  return res;
}

/* Numéro de communication -> spécialité (M1–M62, I1–I26, H…, B…) */
function specDepuisNumero(numero) {
  const c = (numero || "").trim().charAt(0).toUpperCase();
  return { M: "microbiologie", I: "immunologie", H: "hemobiologie", B: "biochimie" }[c] || "";
}

/* ---------- Routeur ---------- */
function router() {
  const h = location.hash.replace(/^#/, "");
  const m = h.match(/^\/s\/([\w-]+)\/t\/([\w-]+)$/)
    || h.match(/^\/s\/([\w-]+)$/)
    || h.match(/^\/p\/(.+)$/);
  if (!m) { afficherAccueil(); return; }
  if (h.startsWith("/s/") && h.includes("/t/")) afficherTheme(m[1], m[2]);
  else if (h.startsWith("/s/")) afficherSpecialite(m[1]);
  else if (h.startsWith("/p/")) afficherLecteur(m[1]);
}

window.addEventListener("hashchange", router);
charger().then(() => { configurerRecherche(); router(); });
