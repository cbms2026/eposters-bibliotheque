#!/usr/bin/env bash
# preparer_depot.sh — prépare le dépôt Git de la bibliothèque d'e-posters.
# Usage : bash scripts/preparer_depot.sh "https://github.com/<vous>/eposters-bibliotheque.git"
set -e
cd "$(dirname "$0")/.."

# 0) Nettoyage des PDF de test éventuels (fichiers factices)
rm -f assets/immunologie/themes/immunodiagnostic/I3_calprotectin.pdf \
      assets/biochimie/poster_vitamine_d.pdf \
      assets/programme/programme_congres.pdf

# 1) Index propre
python3 scripts/generer_index.py

# 2) Dépôt Git
if [ ! -d .git ]; then git init -b main; fi
git add -A
git commit -m "Bibliothèque d'e-posters — version initiale" || echo "Rien à commiter."

# 3) Lien distant (passé en argument) + push
if [ -n "$1" ]; then
  git remote remove origin 2>/dev/null || true
  git remote add origin "$1"
  git push -u origin main
  echo "✅ Poussé sur $1"
  echo "➡️  GitHub → Settings → Pages → Source : GitHub Actions"
else
  echo "Dépôt prêt. Pour le pousser :"
  echo "  git remote add origin https://github.com/<vous>/eposters-bibliotheque.git"
  echo "  git push -u origin main"
fi
