#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generer_vignettes.py — Crée des aperçus PNG de la 1re page de chaque PDF.

Dépendance : PyMuPDF  (pip install pymupdf)
Sortie : <dossier_du_pdf>/_vignettes/<nom_du_pdf>.png

Le site affiche la vignette si elle existe ; sinon icône par défaut.
Exécuté automatiquement par le workflow GitHub (job "vignettes").
"""

import os
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER_ASSETS = os.path.join(RACINE, "assets")

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF requis : pip install pymupdf")


def vignettes_pdf(chemin_pdf: str, largeur: int = 800) -> bool:
    sortie = os.path.join(
        os.path.dirname(chemin_pdf), "_vignettes",
        os.path.splitext(os.path.basename(chemin_pdf))[0] + ".png")
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    try:
        doc = fitz.open(chemin_pdf)
        page = doc[0]
        zoom = largeur / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        pix.save(sortie)
        doc.close()
        return True
    except Exception as e:
        print(f"  ! {os.path.basename(chemin_pdf)} : {e}")
        return False


def main():
    total, ok = 0, 0
    for dp, dn, fn in os.walk(DOSSIER_ASSETS):
        if "_vignettes" in dp:
            continue
        for f in sorted(fn):
            if f.lower().endswith(".pdf"):
                total += 1
                if vignettes_pdf(os.path.join(dp, f)):
                    ok += 1
    print(f"Vignettes : {ok}/{total} PDF traités.")


if __name__ == "__main__":
    main()
