Coach App — v5
Generated: 2025-08-20T19:57

What's in this build:
- Dynamic skin selector built from .skin-* classes in themes.css
- Clean skin blocks (Dark, Neo-Arcade, Samurai-Neon, Retro-Pixel) + Rainbow (test)
- Timer ring with centered chip; modes: CHRONO, RÉPÉTITIONS, PAUSE; 3‑2‑1 overlay
- Timer only for timed exercises; reps show "x N" centered instead
- "Séance du jour" hidden while in Réglages; returns after saving
- "Recommencer" button label
- Session list shows values (e.g., "12 X" or "40 secondes")

Files:
- index.html
- app-utils.js, app-skins.js, app-timer.js, app-session.js
- themes.css
- catalog.json, explain.json, progression.json (unchanged content)



v5.1 additions (2025-08-20T20:00):
- Added user_data.json scaffold (profiles + settings + progress + overrides)
  Note: current UI DOES NOT yet read/write this file. It’s a placeholder for the next iteration.


v5.2 (2025-08-20T20:09):
- Added multi-user profiles UI (Utilisateur + Nouveau/Dupliquer/Renommer/Supprimer)
- Auto-loads from localStorage first, then user_data.json if present
- Auto-saves changes (trainer/skin/âge/taille/poids/objectif/arthrose/rest/rounds/sessions)
- Export / Import of all data (user_data.json) from settings
- No backend required; optional POST to /api/user_data if a server provides it


v5.2.1 (2025-08-20T20:50):
- Fix: profiles init crash on empty doc (ensureDocLoaded now sets state.doc before lookup)
- Improvement: age/height/weight defaults removed from HTML; values now come from active profile


v5.3 (2025-08-20T21:00):
- PURE CLIENT MODE: profils & réglages enregistrés uniquement dans le navigateur (localStorage).
- Plus d'appel réseau POST; l'export/import reste disponible pour sauvegarder/restaurer `user_data.json`.
- Optionnel: si un `user_data.json` statique est présent à côté des fichiers, il est chargé uniquement au tout premier démarrage.
