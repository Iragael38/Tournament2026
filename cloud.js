// Résultats en ligne avec Firebase (Firestore + connexion Google).
// Ce module n'est chargé que si l'organisateur publie le tournoi ou si un spectateur ouvre un lien ?voir=…
// Sans lui, l'appli fonctionne entièrement sur l'appareil.
//
// Données : un document par tournoi, tournois/<identifiant>, qui contient la version publique du tournoi
// (prénoms, genres, matchs et scores ; pas les niveaux). Qui peut lire et écrire : voir firestore.rules.
import {
  initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  onAuthStateChanged, signOut, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp, collection, getDocs, query, orderBy, limit
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

// Identifiant de cet appareil, pour savoir qui a envoyé la dernière version d'un tournoi.
export const device = (() => {
  try {
    let d = localStorage.getItem('badmelee-appareil');
    if (!d) { d = Math.random().toString(36).slice(2, 12); localStorage.setItem('badmelee-appareil', d); }
    return d;
  } catch (e) { return 'inconnu'; }
})();

// Envoie la version publique du tournoi et renvoie son nouveau numéro de version.
// known = numéro de la dernière version connue de cet appareil. Si un AUTRE appareil a envoyé une version
// plus récente entre-temps, l'envoi est refusé (code 'conflict') pour ne pas écraser son travail,
// sauf si force est vrai.
export async function publish(id, data, known, force) {
  const ref = doc(db, 'tournois', id);
  let remote = null;
  try { const snap = await getDoc(ref); if (snap.exists()) remote = snap.data(); } catch (e) { /* hors ligne : on garde le cache */ }
  const rv = remote && Number.isInteger(remote.version) ? remote.version : 0;
  if (!force && remote && remote.appareil && remote.appareil !== device && rv !== (known || 0)) {
    const e = new Error('conflict'); e.code = 'conflict'; e.remote = summary(id, remote); throw e;
  }
  const version = Math.max(rv, known || 0) + 1;
  await setDoc(ref, { nom: data.name || 'Tournoi', majLe: serverTimestamp(), donnees: JSON.stringify(data), version, appareil: device });
  return version;
}

// Résumé d'un tournoi en ligne, pour la liste des organisateurs.
function summary(id, v) {
  let d = null; try { d = JSON.parse(v.donnees); } catch (e) {}
  return {
    id, nom: v.nom || 'Tournoi', majLe: v.majLe && v.majLe.toMillis ? v.majLe.toMillis() : 0,
    version: Number.isInteger(v.version) ? v.version : 0, appareil: v.appareil || '', autre: !!(v.appareil && v.appareil !== device),
    joueurs: d && d.players ? d.players.length : 0, matchs: d && d.matches ? d.matches.filter(m => m.st === 'done').length : 0, data: d
  };
}

// Les 20 tournois en ligne les plus récents (réservé aux organisateurs).
export async function list() {
  const snap = await getDocs(query(collection(db, 'tournois'), orderBy('majLe', 'desc'), limit(20)));
  return snap.docs.map(s => summary(s.id, s.data()));
}

// Un tournoi en ligne complet.
export async function fetchOne(id) {
  const snap = await getDoc(doc(db, 'tournois', id));
  return snap.exists() ? summary(id, snap.data()) : null;
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
    cb(data, v.majLe && v.majLe.toMillis ? v.majLe.toMillis() : Date.now(), Number.isInteger(v.version) ? v.version : 0);
  }, e => err && err(e));
}
