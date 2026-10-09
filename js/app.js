/* Bibliothèque des e-posters — SPA sans dépendance.
 * Accueil : les 4 spécialités sont affichées avec leurs thèmes et leurs
 * e-posters (accordéons repliables).
 * Routeur par hash :
 *   #/                       accueil (arborescence complète)
 *   #/s/<specialite>         vue d'une seule spécialité
 *   #/s/<spec>/t/<theme>     e-posters d'un seul thème
 *   #/p/<chemin.pdf>         lecteur PDF
 */

"use strict";

const ICÔNES = { biochimie: "🧪", microbiologie: "🦠", hemobiologie: "🩸", immunologie: "🧬", programme: "📋" };

let DONNEES = null;      // data/posters.json
let RECHERCHE = null;    // résumés du carnet d'abstracts (peut être vide)

const CSS_ACCUEIL = `
.spec{background:#fff;border-radius:16px;box-shadow:0 2px 10px rgba(16,28,78,.12);
margin-bottom:1rem;overflow:hidden;border-left:6px solid var(--couleur,#0E8A72)}
.spec__tete{display:flex;align-items:center;gap:.8rem;padding:1rem 1.2rem;cursor:pointer;
list-style:none;font-weight:800;font-size:1.08rem;-webkit-tap-highlight-color:transparent}
.spec__tete::-webkit-details-marker{display:none}
.spec__tete::after{content:"▾";margin-left:auto;color:#B8C0D4;font-size:1.2rem;transition:transform .2s}
.spec:not([open]) .spec__tete::after{transform:rotate(-90deg)}
.spec__icone{font-size:1.5rem}.spec__titre{flex:1}
.spec__nb{font-size:.74rem;font-weight:600;color:#40505F;background:#F2F4F8;
border-radius:999px;padding:.25rem .65rem;white-space:nowrap}
.spec__corps{padding:0 1rem 1.1rem}
.theme-bloc{margin-bottom:.4rem}
.theme-bloc__titre{font-size:.92rem;font-weight:700;color:var(--couleur,#0E8A72);
margin:.7rem 0 .5rem;padding-top:.7rem;border-top:1px dashed #E3E8F2}
.theme-bloc .vide{padding:.5rem 0 .7rem;text-align:left;font-size:.85rem}
`;
document.head.appendChild(
  Object.assign(document.createElement("style"), { textContent: CSS_ACCUEIL })
);

const vue = () => document.getElementById("vue");
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ---------- Chargement (robuste : un fichier manquant ne bloque pas le site) ---------- */
async function charger() {
  const lire = (url) =>
    fetch(url).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const [posters, m, i, h, a] = await Promise.all([
    lire("data/posters.json"),
    lire("assets/recherche/microbiologie.json"),
    lire("assets/recherche/immunologie.json"),
    lire("assets/recherche/hemobiologie.json"),
    lire("assets/recherche/articles.json"),
  ]);
  DONNEES = posters;
  RECHERCHE = [m, i, h, a].flat().filter((x) => x && x.numero);

  const programme = posters.programme?.[0];
  if (programme) {
    document.getElementById("heroActions").innerHTML =
      `<a class="bouton-programme" href="#/p/${encodeURI(programme.fichier)}">📋 Programme du congrès</a>`;
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

function blocTheme(t, couleur) {
  return `
    <div class="theme-bloc">
      <div class="theme-bloc__titre">${t.titre}</div>
      ${t.posters.length
        ? t.posters.map((p) => cartePoster(p, couleur)).join("")
        : `<div class="vide">Aucun e-poster pour le moment</div>`}
    </div>`;
}

/* Accueil : tout est visible — spécialités > thèmes > e-posters */
function afficherAccueil() {
  vue().innerHTML = DONNEES.specialites.map((s, idx) => `
    <details class="spec" style="--couleur:${s.couleur}" ${idx === 0 ? "open" : ""}>
      <summary class="spec__tete">
        <span class="spec__icone">${ICÔNES[s.slug] || "📄"}</span>
        <span class="spec__titre">${s.titre}</span>
        <span class="spec__nb">${nbPostersSpec(s)} e-poster(s) · ${s.themes.length} thèmes</span>
      </summary>
      <div class="spec__corps">
        ${s.posters_racine.map((p) => cartePoster(p, s.couleur)).join("")}
        ${[...s.themes, ...s.themes_autres].map((t) => blocTheme(t, s.couleur)).join("")}
      </div>
    </details>`).join("");
}

function afficherSpecialite(slug) {
  const spec = specParSlug(slug);
  if (!spec) { location.hash = "#/"; return; }
  vue().innerHTML = `
    <nav class="fil-ariane"><a href="#/">Accueil</a> › <strong>${spec.titre}</strong></nav>
    <h2 class="titre-section">${ICÔNES[slug] || "📄"} ${spec.titre}</h2>
    ${spec.posters_racine.map((p) => cartePoster(p, spec.couleur)).join("")}
    ${[...spec.themes, ...spec.themes_autres].map((t) => blocTheme(t, spec.couleur)).join("")}`;
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

function cartePoster(p, couleur) {
  const apercu = p.vignette
    ? `<img class="poster__img" src="assets/${p.vignette}" alt="" loading="lazy"
           onerror="this.outerHTML='<span class=\\'poster__icone\\'>📄</span>'">`
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

function afficherLecteur(chemin) {
  const url = "assets/" + chemin;
  const nom = decodeURIComponent(chemin.split("/").pop());
  vue().innerHTML = `
    <a class="retour" href="javascript:history.back()">← Retour</a>
    <div class="lecteur__barre">
      <strong>📄 ${nom.replace(/\.pdf$/i, "").replace(/_/g, " ")}</strong>
      <a class="btn btn--or" href="${url}" target="_blank" rel="noopener">↗ Ouvrir</a>
      <a class="btn btn--gris" href="${url}" download>⬇ Télécharger</a>
    </div>
    <div class="lecteur__cadre">
      <embed src="${url}" type="application/pdf">
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
      if (norm(p.recherche).includes(q)) {
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
    
