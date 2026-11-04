# Efficient Planner

Application web personnelle, en français, pour organiser **l'école, le travail et la vie quotidienne** dans un seul espace. Elle fonctionne entièrement dans le navigateur, sans compte, sans serveur et sans dépendance externe.

> Tout est enregistré localement. Exportez régulièrement vos données en JSON pour garder une copie.

Aucune installation, compilation ou connexion Internet n'est nécessaire.

## Navigation

| Section | Contenu |
|---|---|
| **Tableau de bord** | Priorités du jour, échéances, retards, agenda, habitudes, progression quotidienne et hebdomadaire. |
| **Tâches** | Toutes les tâches, filtres par catégorie, statut et priorité, tri, recherche, sous-tâches, étiquettes et liens. |
| **Calendrier** | Vues mois, semaine et jour, globale ou par catégorie, avec glisser-déposer, récurrences et détection de conflits. |
| **École** | Sessions, cours, horaires, ressources, évaluations pondérées, moyennes, projections et note nécessaire. |
| **Travail** | Projets, avancement, tâches, réunions, échéances, notes et liens. |
| **Personnel** | Habitudes avec séries, objectifs, listes personnalisées et rappels. |
| **Réglages** | Profil, thème, couleurs, organisation, rappels, export/import et réinitialisation. |

La barre latérale se replie automatiquement sur les petits écrans. Le bouton d'ajout rapide et le bouton flottant ouvrent une nouvelle tâche.

## Fonctionnalités

### Tableau de bord

- **Mes priorités** : classement par urgence, échéance et statut.
- Tâches **aujourd'hui**, **en retard** et **7 prochains jours**.
- **Échéances importantes** : évaluations, travaux scolaires, projets et tâches professionnelles.
- **Agenda du jour**, **habitudes du jour**, **récemment terminées**.
- Anneaux de progression **jour** et **semaine**, moyenne de session et raccourcis vers les fiches.

### Tâches

- Titre, description, catégorie (école / travail / personnel), échéance, priorité et statut.
- Sous-tâches cochables, étiquettes, liens utiles, notes, durée estimée et progression.
- Rattachement à un cours, un projet ou une évaluation.
- Filtres, tri, recherche plein texte et bascule terminé/ouvert.
- **Archivage automatique** des tâches terminées après un délai configurable (7 jours par défaut).

### Calendrier

- Vues **mois**, **semaine** et **jour**, avec navigation précédente/suivante et retour à aujourd'hui.
- Filtres par catégorie et affichage de l'horaire hebdomadaire des cours.
- Création par clic sur une case ou un créneau horaire.
- Modification, suppression et **glisser-déposer** des événements simples.
- Récurrences (quotidienne, hebdomadaire, mensuelle, annuelle) et rappels.
- **Détection de conflits** avant enregistrement, avec confirmation explicite.
- Les séances de cours sont **virtualisées** à partir de l'horaire des cours : aucun doublon d'événement.

### École

- **Sessions** scolaires avec dates et session active.
- **Cours** : code, nom, enseignant, couleur, local, lien en ligne, notes, ressources et plages horaires hebdomadaires.
- Page de cours avec onglets **Tâches**, **Évaluations**, **Notes**, **Événements** et **Ressources**.
- **Évaluations** : type, date, pondération, note maximale, note obtenue, statut et notes.
- **Moyenne pondérée** calculée uniquement sur les évaluations corrigées.
- Pourcentage **évalué / restant**, projection finale et **note nécessaire** pour atteindre un objectif.
- Validation de la somme des pondérations (alerte si le total dépasse ou n'atteint pas 100 %).
- Liaison **tâche ↔ évaluation** : terminer une tâche liée propose d'enregistrer la note.

### Travail

- **Projets** avec statut, échéance, couleur, description, notes et liens.
- Avancement calculé à partir des tâches terminées.
- Tâches, réunions et échéances liées au projet.
- Vue globale des tâches professionnelles et des rencontres.

### Personnel

- **Habitudes** quotidiennes ou sur jours précis, avec cases de suivi, série actuelle, meilleure série et taux de réussite.
- **Objectifs** avec cible, valeur actuelle, unité, échéance et progression.
- **Listes** personnalisées (épicerie, idées, préparatifs) avec ajout, cochage et suppression d'éléments.

### Transversal

- **Saisie rapide** en langage naturel (voir ci-dessous).
- **Recherche globale** dans les tâches, cours, évaluations, projets, événements, habitudes, objectifs et listes.
- **Notifications internes** pour les retards, les échéances et les rappels.
- Thèmes **clair / sombre / système**, couleur d'accent et couleurs des trois espaces.
- Interface **responsive** et respect de `prefers-reduced-motion`.
- **Export / import JSON** et réinitialisation complète.

## Saisie rapide

La saisie rapide reconnaît notamment :

```text
Appeler le client demain 14h !haute #travail ~45m
Réviser le chapitre 5 CR300 vendredi 18h30
Acheter du lait demain 18h #perso !basse ~15m
```

| Élément | Exemples |
|---|---|
| Date | `aujourd'hui`, `demain`, `après-demain`, `dans 3 jours`, `vendredi`, `2026-11-12`, `12/11` |
| Heure | `14h`, `14h30`, `14:30`, `à 9 h` |
| Priorité | `!urgent`, `!haute`, `!normale`, `!basse` |
| Durée | `~45m`, `~2h`, `~1h30` |
| Catégorie | `#travail`, `#école`, `#perso` |
| Étiquette | tout autre `#mot` |
| Cours | code ou nom du cours (`CR300`) |

Sans heure, la tâche est placée en fin de journée. Sans date, elle est planifiée pour aujourd'hui.

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `N` | Nouvelle tâche |
| `Ctrl` + `K` (ou `Cmd` + `K`) | Recherche globale |
| `/` | Recherche globale |
| `Échap` | Fermer une fenêtre ou la barre latérale |

## Données et sauvegarde

- Stockage : `localStorage`, clé `efficient-planner:v1`.
- Copie de sécurité avant un import : clé `efficient-planner:v1:backup`.
- **Exporter** : Réglages → Vos données → *Exporter en JSON*. Le fichier contient l'intégralité de l'état.
- **Importer** : le fichier remplace les données actuelles après confirmation ; une copie de l'état précédent est conservée localement.
- En cas d'échec d'écriture (mode privé, quota), une bannière invite à exporter.
- Aucune donnée n'est envoyée à un serveur.

### Format des dates

Les dates et heures sont stockées en **ISO local** : `YYYY-MM-DDTHH:mm`. Ce choix évite les décalages de fuseau horaire lors d'un export/import.

## Modèle de données

L'état exporté est un objet JSON unique :

```json
{
  "version": 1,
  "settings": { "...": "..." },
  "sessions": [],
  "courses": [],
  "tasks": [],
  "assessments": [],
  "events": [],
  "projects": [],
  "habits": [],
  "goals": [],
  "lists": [],
  "meta": { "createdAt": "...", "updatedAt": "...", "onboarded": true }
}
```

| Collection | Champs principaux |
|---|---|
| `sessions` | `id`, `name`, `start`, `end`, `active` |
| `courses` | `id`, `sessionId`, `code`, `name`, `teacher`, `color`, `location`, `onlineUrl`, `notes`, `links[]`, `schedule[{weekday,start,end,room}]` |
| `tasks` | `id`, `title`, `description`, `category`, `status`, `priority`, `due`, `estimate`, `courseId`, `projectId`, `assessmentId`, `kind`, `progress`, `subtasks[]`, `tags[]`, `links[]`, `team[]`, `notes`, `completedAt`, `archived` |
| `assessments` | `id`, `courseId`, `name`, `type`, `date`, `weight`, `max`, `grade`, `status`, `notes` |
| `events` | `id`, `title`, `category`, `start`, `end`, `allDay`, `location`, `notes`, `courseId`, `projectId`, `color`, `recurrence{freq,interval,until,weekdays[]}`, `reminders[]` |
| `projects` | `id`, `name`, `description`, `status`, `due`, `color`, `notes`, `links[]` |
| `habits` | `id`, `name`, `color`, `cadence{type,days[]}`, `log{date:true}`, `archived` |
| `goals` | `id`, `title`, `target`, `current`, `unit`, `due`, `notes`, `category` |
| `lists` | `id`, `title`, `items[{id,text,done}]` |
| `settings` | `theme`, `accent`, `colors{school,work,personal}`, `userName`, `defaultCategory`, `weekStartsOn`, `defaultView`, `notifications`, `defaultReminder`, `archiveAfterDays`, `dashboardHabits`, `compactTasks` |

### Calcul des notes

Soit :

- `earned = Σ (note / maximum × 100 × pondération)` sur les évaluations **corrigées** ;
- `poidsCorrigés` et `poidsRestants` la somme des pondérations corrigées et restantes.

```text
moyenne       = earned / poidsCorrigés
projection    = (earned + hypothèse × poidsRestants) / (poidsCorrigés + poidsRestants)
note requise  = (objectif × (poidsCorrigés + poidsRestants) − earned) / poidsRestants
```

Les évaluations non corrigées ne comptent jamais comme zéro. Si le total des pondérations n'est pas 100 %, un avertissement est affiché mais les calculs restent basés sur les poids saisis.

## Structure du projet

```text
efficient-planner/
├─ index.html              # coquille de l'application
├─ css/
│  └─ app.css              # design system, thèmes et responsive
├─ js/
│  ├─ util.js              # dates, formats, recherche, saisie rapide
│  ├─ store.js             # état, persistance, sélecteurs, démo
│  ├─ ui.js                # composants et modales
│  ├─ forms.js             # formulaires de création / édition
│  ├─ app.js               # routeur, actions, thème, notifications
│  └─ views/
│     ├─ common.js         # fragments partagés
│     ├─ dashboard.js
│     ├─ tasks.js
│     ├─ calendar.js
│     ├─ school.js
│     ├─ work.js
│     ├─ personal.js
│     └─ settings.js
└─ tests/
   ├─ make-index.py        # génère tests/index.html
   ├─ run.py               # lance Edge headless
   └─ smoke.js             # suite de fumée (361 assertions)
```

L'application utilise des **scripts classiques** et un espace de noms global `EP` (`EP.U`, `EP.Store`, `EP.Select`, `EP.UI`, `EP.Forms`, `EP.Views`, `EP.App`). Aucun bundler, aucune dépendance npm.

## Tests

La suite de fumée exécute l'interface réelle dans Edge headless : routes, formulaires, calculs de notes, calendrier, glisser-déposer, recherche, import/export, thèmes et raccourcis.

```bash
python tests/make-index.py   # régénère tests/index.html
python tests/run.py          # lance les tests et affiche les échecs
```

Prérequis : Python 3 et Microsoft Edge (ou Chrome). Le script démarre un serveur local sur le port `8137`, ouvre la page de test, lit le résultat JSON et renvoie un code de sortie non nul en cas d'échec.

`tests/index.html` peut aussi être ouvert directement dans un navigateur : la suite s'exécute et affiche un bandeau `SMOKE PASS/FAIL`.

Couverture actuelle : **361 assertions**, 0 échec et 0 erreur console.

## Choix et limites de la v1

- **Local uniquement** : pas de compte, pas de synchronisation, pas de collaboration temps réel.
- **Pas d'IA** ni d'intégration externe complexe.
- Les séances de cours récurrentes ne sont pas des événements individuels : elles se modifient depuis la fiche du cours.
- Les événements récurrents ne se déplacent pas un par un ; on modifie la série.
- Les notifications système dépendent de l'autorisation du navigateur ; les rappels restent visibles dans l'application.
- L'archivage automatique conserve les données : les tâches archivées restent présentes dans l'export JSON.

## Personnalisation

Dans **Réglages → Apparence**, vous pouvez changer :

- le thème (clair, sombre ou système) ;
- la couleur d'accent de l'interface ;
- les couleurs des espaces **École**, **Travail** et **Personnel**.

Les variables CSS correspondantes (`--accent`, `--school`, `--work`, `--personal`) sont appliquées immédiatement à toute l'application.

---

**Efficient Planner v1.0** — un espace calme pour l'école, le travail et la vie quotidienne.
