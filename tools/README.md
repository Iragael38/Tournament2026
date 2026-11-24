# Reconstruire `vendor/firebase.js`

L'appli embarque une copie locale du SDK Firebase (app, auth, firestore), pour ne dépendre d'aucun site externe au chargement et pour fonctionner hors ligne.

```sh
mkdir build && cd build && npm init -y
npm i firebase@13.2.0 esbuild
cp ../tools/firebase-entry.js .
npx esbuild firebase-entry.js --bundle --format=esm --minify --target=es2020 \
  --legal-comments=linked --outfile=../vendor/firebase.js
mv ../vendor/firebase.js.LEGAL.txt ../vendor/firebase.LICENSES.txt
```

Pour changer de version de Firebase, modifiez le numéro, reconstruisez, puis augmentez la version de cache dans `sw.js` et `index.html`.
