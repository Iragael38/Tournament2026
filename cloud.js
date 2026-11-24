// Résultats en ligne avec Firebase (Firestore + connexion Google).
// Ce module n'est chargé que si l'organisateur publie le tournoi ou si un spectateur ouvre un lien ?voir=…
// Sans lui, l'appli fonctionne entièrement sur l'appareil.
//
// Données : un document par tournoi, tournois/<identifiant>, qui contient la version publique du tournoi
// (prénoms, genres, matchs et scores ; pas les niveaux). Qui peut lire et écrire : voir firestore.rules.
import {
  initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  onAuthStateChanged, signOut, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, deleteDoc, onSnapshot, serverTimestamp
} from './vendor/firebase.js';

// Configuration publique du projet Firebase (ces valeurs ne sont pas secrètes : la sécurité vient des règles).
const firebaseConfig = {
  apiKey: 'AIzaSyDLYLmPjPzH3NQGjP2q5lOY8Ga4Pg0kBas',
  authDomain: 'badadonf-tournoi.firebaseapp.com',
  projectId: 'badadonf-tournoi',
  storageBucket: 'badadonf-tournoi.firebasestorage.app',
  messagingSenderId: '667742139535',
  appId: '1:667742139535:web:dd5f527906bfcf44f4ecfa'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  // Cache local : les envois faits sans réseau partent tout seuls au retour de la connexion.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  db = initializeFirestore(app, {});
}
getRedirectResult(auth).catch(() => {});

export function onUser(cb) { return onAuthStateChanged(auth, cb); }

export async function login() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Fenêtre bloquée (fréquent sur téléphone) : on passe par une redirection.
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export function logout() { return signOut(auth); }

// Envoie la version publique du tournoi. Résout quand le serveur a confirmé l'écriture.
export function publish(id, data) {
  return setDoc(doc(db, 'tournois', id), {
    nom: data.name || 'Tournoi',
    majLe: serverTimestamp(),
    donnees: JSON.stringify(data)
  });
}

export function remove(id) { return deleteDoc(doc(db, 'tournois', id)); }

// Suit un tournoi en direct. cb(données | null si le tournoi n'existe plus), err(erreur).
export function watch(id, cb, err) {
  return onSnapshot(doc(db, 'tournois', id), { includeMetadataChanges: true }, snap => {
    if (!snap.exists()) {
      // Absent du cache local seulement : on n'a pas encore pu joindre le serveur.
      if (snap.metadata.fromCache) { err && err({ code: 'unavailable' }); return; }
      cb(null); return;
    }
    const v = snap.data();
    let data = null;
    try { data = JSON.parse(v.donnees); } catch (e) { err && err(e); return; }
    cb(data, v.majLe && v.majLe.toMillis ? v.majLe.toMillis() : Date.now());
  }, e => err && err(e));
}
