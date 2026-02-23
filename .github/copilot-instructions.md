# Principes généraux

## Communication

- Tu adoptes un ton professionnel.
- Ta communication est claire, concise et précise.
- Tes réponses ne sont pas destinées à flatter l'utilisateur mais à nourrir sa réflexion. Tu opposes donc une résistance constructive à l'utilisateur si sa demande va à l'encontre de bonnes pratiques spécifiées, tout en lui laissant le dernier mot sur la décision finale.

## Règles sur la génération de code

- Tu ne génères de code dans le projet que si c'est explicitement demandé. Dans le cas contraire, tu te contentes d'utiliser le chat.
- Tu n'agis jamais sur le répertoire de génération `lib` directement, ni sur le répertoire d'installation `node_modules`.
- Les indentations doivent être de 4 espaces, et les lignes ne doivent pas dépasser 120 caractères.
- Tu respectes les conventions de nommage décrites dans la section "Conventions de nommage" ci-après, même si elles ne sont pas demandées explicitement.
- Tu respectes les principes, rappellés dans la section "Principes de PureFramework" ci-après, de la famille de librairies PureFramework dans laquelle s'inscrit ce projet, même si ces principes ne sont pas demandés explicitement.
- Tu ne laisses jamais de répertoire vide, tu vérifies après suppression de fichiers que le répertoire parent est toujours nécessaire.
- Tu n'ajoutes jamais de fichier MD sans demande explicite.
- Tu documentes toujours ton code public avec des commentaires JSDoc uniquement en anglais.
- Tu peux commenter le code d'un bloc avec les conventions ci-après (en français ET en anglais).

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

- Avant de dire qu'une tâche de génération de code est terminée, tu vérifies que tu as bien mis à jour tous les fichiers MD existants si nécessaire.
- Avant de dire qu'une tâche de génération de code est terminée, tu vérifies que tu n'utilises pas de code obsolète.
- Avant de dire qu'une tâche de génération de code est terminée, tu compiles le projet sans erreur (npm run build).
- Avant de dire qu'une tâche de génération de code est terminée, le projet doit respecter toutes les règles ESLint sans les modifier, ni les altérer (npm run lint).
- Avant de dire qu'une tâche de génération de code est terminée, si tes modifications entraînent la modification ou l'ajout de tests unitaires, ces derniers doivent passer sans erreur (npm run test).

## Conventions de nommage

- Tu n'utilises jamais d'abréviations dans les noms de variables, fonctions ou classes (ex: `UserProps`, `FunctionParams` doivent s'écrire `UserProperties`, `FunctionParameters`).
- Les noms des fichiers et des répertoires doivent être en snake_case, les différents concepts étant séparés par des points, et refléter le contenu du fichier (ex: `authenticated_user.ts` pour un fichier contenant une entité représentant un AuthenticateUser, `authenticate_user.input.ts` pour un fichier contenant un input représentant une entrée de use case). Les concepts déjà dans le répertoire parent ne doivent pas être répétés (ex: `use_cases/authenticate_user.ts` et non `dto/authenticated_user.ts`).
- Pour les interfaces :
    - Pas de préfixe `I`. Ex: `AuthenticationProvider` et non `IAuthenticationProvider`, ce sont les implémentations qui doivent porter un nom spécifique, ex: `SupabaseAuthenticationProvider`.
    - Pas de `interface` dans le nom des fichiers d'interface. Ex: `authentication_provider.ts` et non `authentication_provider.interface.ts`.
- Tu n'utilises jamais la notation hongroise (jamais de préfixe `_`).

## Principes de PureFramework

- Tu consultes et suis les bonnes pratiques de ce projet, décrites dans `docs/best_practices.md`, même si elles ne sont pas demandées explicitement.
- Tu consultes et suis les bonnes pratiques de la famille de librairies PureFramework, décrites dans `docs/best_practices.md` de chaque librairie, même si elles ne sont pas demandées explicitement :
    - Aucune pour cette librairie, à la base du framework.
