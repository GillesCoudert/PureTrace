# Instructions Claude Code — PureTrace

## Contexte du projet

`@gilles-coudert/pure-trace` est une **librairie npm** qui fournit un système de gestion des erreurs TypeScript standardisé, localisable et traçable, avec l'observabilité intégrée par conception. Elle expose les primitives fondamentales de tout le PureFramework : `Result`, `ResultAsync`, les helpers de génération d'erreurs (`generateFailure`, `generateError`), et le système de messages (`PureMessage`).

C'est la librairie de base du PureFramework : elle n'a aucune dépendance `@gilles-coudert`.

En tant que librairie publique :
- Tout nouveau type ou classe faisant partie de l'API publique doit être exporté depuis `src/index.ts`.
- Les signatures publiques sont un contrat : toute modification doit être considérée comme breaking change.

## Communication

- Ton professionnel, clair, concis, précis.
- Ne pas flatter l'utilisateur : opposer une résistance constructive si une demande va à l'encontre des bonnes pratiques, tout en lui laissant le dernier mot.

## Règles de génération de code

- Ne générer du code dans le projet que si c'est explicitement demandé.
- Ne jamais agir sur `lib/` (répertoire de génération) ni sur `node_modules/`.
- Indentation : 4 espaces. Longueur de ligne max : 120 caractères.
- Respecter les conventions de nommage ci-après, même si elles ne sont pas demandées explicitement.
- Avant toute génération de code, lire et appliquer les bonnes pratiques listées en section **Bonnes pratiques** ci-après.
- Ne jamais laisser de répertoire vide : vérifier après suppression de fichiers que le répertoire parent est toujours nécessaire.
- Ne jamais ajouter de fichier MD sans demande explicite.
- Documenter le code public avec des commentaires JSDoc uniquement en anglais.
- Commenter les blocs de code selon cette convention :

```typescript
//>
//> > fr: Commentaire court sur une seule ligne.
//> > en: Short single-line comment.
//>

//>──────────────────────────────────────────────────────────────────────────────────<
//> fr: Explication d'algorithme plus détaillée sur plusieurs lignes, si nécessaire. <
//>──────────────────────────────────────────────────────────────────────────────────<
//>────────────────────────────────────────────────────────────────────────────<
//> en: More detailed algorithm explanation over multiple lines, if necessary. <
//>────────────────────────────────────────────────────────────────────────────<
```

### Checklist avant de déclarer une tâche de génération terminée

- Tous les fichiers MD existants mis à jour si nécessaire.
- Le `llms.txt` est à jour si l'API publique a changé (voir section ci-dessous).
- Aucun code obsolète utilisé.
- `npm run build` sans erreur.
- `npm run lint` sans erreur, sans modification ni altération des règles ESLint.
- `npm run test` sans erreur (si des tests sont ajoutés ou modifiés).

## AI-consumability

Ce dépôt contient un fichier `llms.txt` à sa racine, publié dans le package npm.
Ce fichier est destiné aux agents IA qui **consomment** la librairie (pas aux contributeurs).

- Toute modification d'API publique doit mettre à jour le `llms.txt`.
- Le `llms.txt` est rédigé en anglais.
- Il ne duplique pas les signatures TS : il documente l'intention, les patterns, et les anti-patterns.
- Les exemples de code dans le `llms.txt` doivent compiler.
- Toute fonction/classe/type exporté depuis `src/index.ts` doit avoir un JSDoc avec `@example`.
- Voir le CLAUDE.md racine du workspace pour la structure standardisée du `llms.txt`.

## Conventions de nommage

- Jamais d'abréviations (ex: `UserProperties` et non `UserProps`, `FunctionParameters` et non `FunctionParams`).
- Fichiers et répertoires en `snake_case`, concepts séparés par des points (ex: `authenticated_user.ts`, `authenticate_user.input.ts`). Ne pas répéter les concepts déjà présents dans le répertoire parent (ex: `use_cases/authenticate_user.ts` et non `dto/authenticated_user.ts`).
- Interfaces sans préfixe `I` (ex: `AuthenticationProvider` et non `IAuthenticationProvider`). Les implémentations portent un nom spécifique (ex: `SupabaseAuthenticationProvider`).
- Pas de `interface` dans les noms de fichiers d'interface (ex: `authentication_provider.ts` et non `authentication_provider.interface.ts`).
- Jamais de notation hongroise (jamais de préfixe `_`).

## Bonnes pratiques

- `docs/best_practices.md` — bonnes pratiques de ce projet.
