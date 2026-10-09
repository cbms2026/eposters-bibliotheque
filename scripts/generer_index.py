#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generer_index.py — Génère data/posters.json pour la bibliothèque d'e-posters.

Même principe que generer_microbiologie.py dans l'app Android : on scanne
les dossiers d'assets et on produit un fichier JSON. Ce JSON est ensuite
lu par le site statique (js/app.js).

Le site ne nécessite AUCUN backend : pour ajouter un e-poster, déposez
simplement le PDF dans le bon dossier :

    assets/<specialite>/themes/<slug>/mon_poster.pdf

Usage :
    python3 scripts/generer_index.py

La sortie est déterministe (pas de dates) pour des diffs Git propres.
"""

import json
import os
import unicodedata

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOSSIER_ASSETS = os.path.join(RACINE, "assets")
SORTIE = os.path.join(RACINE, "data", "posters.json")

# --- Thèmes officiels par spécialité (miroir de ThemesParSpecialite.kt) ---
# Pour ajouter/modifier un thème : éditez ICI et dans l'app Android.
SPECIALITES = {
    "biochimie": {
        "titre": "Biochimie",
        "couleur": "#00796B",
        "themes": {
            "biomarqueurs": "Biomarqueurs innovants en biochimie",
            "maladies_metaboliques": "Biochimie et maladies métaboliques",
            "defis_vie": "Les grands défis biochimiques de la vie : enfance, maternité et vieillesse",
            "cancer": "Approches biochimiques du cancer : du diagnostic au suivi thérapeutique",
            "qualite_labo": "Qualité et performance en laboratoire : défis et perspectives",
        },
    },
    "microbiologie": {
        "titre": "Microbiologie",
        "couleur": "#5E35B1",
        "themes": {
            "antimicrobiens_resistance": "Antimicrobiens et résistance",
            "hygiene_hospitaliere": "Hygiène hospitalière",
            "maladies_emergentes": "Maladies émergentes et ré-émergentes",
            "divers": "Divers",
        },
    },
    "hemobiologie": {
        "titre": "Hémobiologie",
        "couleur": "#B71C1C",
        "themes": {
            "hemorragiques_thrombotiques": "Maladies hémorragiques et thrombotiques : approches intégrées",
            "transformation_digitale": "Transformation digitale en hémobiologie : sécurité transfusionnelle et innovation en cytaphérèse",
            "analyse_hematologique": "Analyse hématologique et technologies de pointe pour l'étude cellulaire",
            "globules_rouges": "Globules rouges : caractérisation et innovations moléculaires",
        },
    },
    "immunologie": {
        "titre": "Immunologie",
        "couleur": "#1565C0",
        "themes": {
            "immunodiagnostic": "Nouveautés en immunodiagnostic",
            "maladies_autoimmunes": "Maladies auto-immunes et allergiques",
            "maladies_rares": "Maladies immunologiques rares",
            "biotherapies": "Biothérapies et thérapies ciblées",
        },
    },
}


def norm(s: str) -> str:
    """Chaîne normalisée pour la recherche (accents, casse)."""
    return "".join(
        c for c in unicodedata.normalize("NFD", s.lower())
        if unicodedata.category(c) != "Mn"
    )


def pdfs_du_dossier(*chemin):
    """PDF d'un dossier d'assets, triés (ordre naturel : numéros compris)."""
    dossier = os.path.join(DOSSIER_ASSETS, *chemin)
    if not os.path.isdir(dossier):
        return []
    return sorted(
        (f for f in os.listdir(dossier) if f.lower().endswith(".pdf")),
        key=lambda f: [int(t) if t.isdigit() else t.lower()
                       for t in __import__("re").split(r"(\d+)", f)],
    )


def poster(chemin, spec, slug_theme=None):
    nom_fichier = os.path.basename(chemin)
    titre = os.path.splitext(nom_fichier)[0].replace("_", " ").strip()
    dossier = os.path.dirname(chemin)
    sans_ext = os.path.splitext(nom_fichier)[0]
    # Vignette générée par generer_vignettes.py : <dossier>/_vignettes/<nom>.png
    chemin_vignette = f"{dossier}/_vignettes/{sans_ext}.png"
    return {
        "fichier": chemin.replace(os.sep, "/"),
        "nom": nom_fichier,
        "titre": titre,
        "specialite": spec,
        "theme": slug_theme,
        "vignette": chemin_vignette.replace(os.sep, "/")
                    if os.path.exists(os.path.join(DOSSIER_ASSETS, chemin_vignette))
                    else None,
        "recherche": norm(f"{titre} {nom_fichier} {spec} {slug_theme or ''}"),
    }


def main():
    resultat = {"specialites": [], "programme": []}

    for slug_spec, info in SPECIALITES.items():
        entree = {
            "slug": slug_spec,
            "titre": info["titre"],
            "couleur": info["couleur"],
            "posters_racine": [],          # PDF directement dans assets/<spec>/
            "themes": [],                  # thèmes connus (déclarés ci-dessus)
            "themes_autres": [],           # dossiers trouvés mais non déclarés
        }
        for slug_theme, titre_theme in info["themes"].items():
            chemin = f"{slug_spec}/themes/{slug_theme}"
            entree["themes"].append({
                "slug": slug_theme,
                "titre": titre_theme,
                "posters": [poster(f"{chemin}/{f}", slug_spec, slug_theme)
                            for f in pdfs_du_dossier(chemin)],
            })
        for f in pdfs_du_dossier(slug_spec):
            entree["posters_racine"].append(poster(f"{slug_spec}/{f}", slug_spec))

        # Dossiers de thèmes présents sur disque mais absents de la déclaration
        themes_dir = os.path.join(DOSSIER_ASSETS, slug_spec, "themes")
        if os.path.isdir(themes_dir):
            for d in sorted(os.listdir(themes_dir)):
                if os.path.isdir(os.path.join(themes_dir, d)) \
                        and d not in info["themes"]:
                    chemin = f"{slug_spec}/themes/{d}"
                    entree["themes_autres"].append({
                        "slug": d,
                        "titre": d.replace("_", " "),
                        "posters": [poster(f"{chemin}/{f}", slug_spec, d)
                                    for f in pdfs_du_dossier(chemin)],
                    })

        resultat["specialites"].append(entree)

    resultat["programme"] = [
        poster(f"programme/{f}", "programme") for f in pdfs_du_dossier("programme")
    ]

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump(resultat, f, ensure_ascii=False, indent=2)

    n = sum(len(t["posters"]) for s in resultat["specialites"] for t in s["themes"]) \
        + sum(len(s["posters_racine"]) for s in resultat["specialites"])
    print(f"OK -> {os.path.relpath(SORTIE, RACINE)}  ({n} e-posters)")


if __name__ == "__main__":
    main()
