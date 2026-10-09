# Bibliothèque des e-posters — Congrès de Biologie Médicale (Sétif)

Site statique (HTML/CSS/JS, aucun framework) hébergeant les e-posters du
congrès, **conçu pour GitHub Pages**. Il reprend exactement la structure
de l'application Android `CongresBiologieApp` :

```
Accueil  →  Spécialité (4)  →  Thème officiel  →  E-posters (PDF)
```

## Fonctionnalités
- **4 spécialités** avec leur couleur officielle : Biochimie, Microbiologie,
  Hémobiologie, Immunologie.
- **Thèmes officiels** par spécialité (les mêmes slugs que l'app Android).
- **Liste automatique des e-posters** : déposez un PDF dans le bon dossier,
  il apparaît tout seul — aucun code à modifier.
- **Lecteur PDF intégré** (le navigateur fait le zoom et la navigation).
- **Vignettes d'aperçu** : la 1re page de chaque PDF est convertie en
  miniature (job automatique du workflow, `scripts/generer_vignettes.py`).
- **Recherche globale** : e-posters + résumés du carnet d'abstracts
  (codes M1–M62, I1–I26…) repris de `assets/recherche/*.json`.
- **Bouton Programme du congrès** : affiche le PDF placé dans
  `assets/programme/`.

## Structure du dépôt
```
├── index.html                  Page unique (SPA sans dépendance)
├── css/style.css               Charte graphique du congrès
├── js/app.js                   Routeur + recherche
├── data/posters.json           GÉNÉRÉ — ne pas éditer à la main
├── scripts/generer_index.py    Scanner les dossiers → posters.json
├── assets/
│   ├── programme/              PDF du programme du congrès
│   ├── biochimie/themes/<slug>/          E-posters par thème
│   ├── hemobiologie/themes/<slug>/
│   ├── microbiologie/themes/<slug>/
│   ├── immunologie/themes/<slug>/
│   └── recherche/*.json        Résumés pour la recherche
└── .github/workflows/deploy.yml  Publication automatique sur GitHub Pages
```

## Ajouter un e-poster
1. Nommez votre PDF **sans espaces ni caractères spéciaux**
   (ex. `poster_vitamine_d.pdf`).
2. Déposez-le dans le dossier du thème :
   `assets/<specialite>/themes/<slug>/`
3. Poussez sur GitHub. Le workflow régénère `data/posters.json` et publie.

## Ajouter / modifier un thème
Éditez `scripts/generer_index.py` (section `SPECIALITES`) — il sert de source
unique. Pour garder la cohérence avec l'app Android, faites le même
ajout dans `ThemesParSpecialite.kt`.

## Mise en ligne sur GitHub (une seule fois)
1. Créez un dépôt public sur GitHub (ex. `eposters-bibliotheque`).
2. Dans ce dossier, lancez :
   ```bash
   bash scripts/preparer_depot.sh https://github.com/<vous>/eposters-bibliotheque.git
   ```
   (sans argument, le script prépare tout et affiche les commandes de push).
3. Dans **Settings → Pages** : choisissez **Source = GitHub Actions**.
4. Le workflow `deploy.yml` fait le reste : index → vignettes → publication.
   Site disponible sur `https://<vous>.github.io/eposters-bibliotheque/`.

## Test en local
```bash
python3 scripts/generer_index.py
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```
