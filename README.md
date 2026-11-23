# Tournoi de badminton à la mêlée

Une petite appli web pour gérer un tournoi de badminton **en double, sans équipes fixes** : à chaque match, les paires sont tirées au sort parmi les joueurs présents, et chacun accumule ses propres résultats.

Pensée pour une table de marque en bord de terrain : un téléphone ou un ordinateur, pas de compte, pas d'Internet nécessaire.

## Ce que fait l'appli

- **Terrains** : dès qu'un score est validé, le terrain est relancé avec les 4 joueurs suivants. Un chrono tourne sur chaque terrain.
- **Tirage équitable** : passent d'abord ceux qui ont le moins joué, puis ceux qui attendent depuis le plus longtemps. L'appli évite de reformer les mêmes paires et, si les niveaux sont renseignés, équilibre les équipes.
- **Joueurs** : ajout des retardataires en cours de tournoi, joueur « absent » (blessure, départ) sans perdre ses résultats, niveau facultatif.
- **Classement individuel** : pourcentage de victoires, puis écart de points moyen par match. Il reste juste même si tout le monde n'a pas joué le même nombre de matchs.
- **Historique** : correction ou suppression d'un score saisi par erreur.
- **Mode écran** : terrains et classement en grand, pour une télé ou un vidéoprojecteur.
- **Hors ligne** : une fois ouverte, l'appli fonctionne sans réseau et peut s'installer sur l'écran d'accueil.
- **Test** : 36 joueurs fictifs et des scores simulés pour faire un tournoi blanc en deux minutes.

## Utilisation

1. Ouvrir l'appli dans Chrome (Android) ou n'importe quel navigateur récent.
2. Onglet **Joueurs** : coller la liste des inscrits, un nom par ligne.
3. Onglet **Réglages** : vérifier le nombre de terrains (6 par défaut) et les points (21).
4. Onglet **Terrains** : les matchs se lancent. Saisir les deux scores puis « Valider le score ».

**Installer sur Android** : dans Chrome, menu ⋮ puis « Ajouter à l'écran d'accueil ».

## Données et vie privée

- Tout reste **dans le navigateur de l'appareil** (localStorage). Rien n'est envoyé sur Internet, il n'y a ni compte ni statistiques de visite.
- Les données disparaissent si l'on vide les données du navigateur ou si l'on utilise la navigation privée. Pensez à **copier la sauvegarde** de temps en temps (onglet Réglages).
- Chaque appareil a son propre tournoi : ouvrir l'appli sur un autre téléphone ne partage pas les scores.

## Mettre l'appli en ligne avec GitHub Pages

1. Dans le dépôt : **Settings › Pages**.
2. Source : « Deploy from a branch », branche `main`, dossier `/ (root)`, puis **Save**.
3. Après une minute, l'appli est en ligne à l'adresse `https://<votre-compte>.github.io/<nom-du-depot>/`.

Chaque modification envoyée sur `main` met l'appli à jour. Pensez à augmenter `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## Organisation du code

```
index.html            la page : structure et onglets
style.css             l'apparence
app.js                toute la logique (données, tirage, classement, affichage)
sw.js                 service worker : garde l'appli en mémoire pour le hors ligne
manifest.webmanifest  nom, icône et couleurs pour l'installation
icons/                icônes de l'écran d'accueil
vendor/qrcode.js      génération du QR code (Kazuhiko Arase, licence MIT)
```

Le principe : un seul objet `S` contient les joueurs, les matchs et les réglages. Les statistiques, la file d'attente et le classement sont **recalculés** à partir des matchs à chaque affichage ; corriger un score met donc tout à jour automatiquement. Le détail est en tête de `app.js`.

Pour tester en local : ouvrir `index.html` dans un navigateur suffit (le mode hors ligne, lui, ne s'active qu'en https).

## À venir

- Variante **au temps** : tous les terrains lancés ensemble, compte à rebours commun.
- Suivi des scores en direct sur plusieurs téléphones (nécessitera une base de données en ligne).

## Licence

Code sous licence MIT : voir [LICENSE](LICENSE).
