import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { collection, doc, getDocs, getFirestore, initializeFirestore, setDoc, writeBatch } from "firebase/firestore";
import { ICollection } from "../models/collection";

const firebaseConfig = {
  apiKey: "AIzaSyDaElDhdNJ8MhWWtTgrySammnZwCiySMv4",
  authDomain: "vite-list-d7672.firebaseapp.com",
  projectId: "vite-list-d7672",
  storageBucket: "vite-list-d7672.appspot.com",
  messagingSenderId: "728297054410",
  appId: "1:728297054410:web:6cd25a62046d9e3d139433",
  measurementId: "G-Q07DQR9VZ2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

const provider = new GoogleAuthProvider();

// export const signInWithGoogle = () => {
//   signInWithPopup(auth, provider)
//     .then((result) => {
//       const name = result.user.displayName;
//       const email = result.user.email;
//       const uid = result.user.uid;
//       localStorage.setItem("name", name);
//       localStorage.setItem("email", email);
//       localStorage.setItem("uid", uid);
//       createUser(name, uid); // Call createUser with name and uid
//     })
//     .catch((error) => {
//       console.log(error);
//     });
// };

export const signInWithGoogle = async () => {
  const user = Capacitor.isNativePlatform()
    ? await signInWithNativeGoogle()
    : (await signInWithPopup(auth, provider)).user;
  const name = user.displayName ?? "";
  const email = user.email ?? "";
  const uid = user.uid;
  localStorage.setItem("name", name);
  localStorage.setItem("email", email);
  localStorage.setItem("uid", uid);
  await createUser(name, uid);
  return user;
};

const signInWithNativeGoogle = async () => {
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token");
  }
  const credential = GoogleAuthProvider.credential(idToken);
  return (await signInWithCredential(auth, credential)).user;
};

export const createUser = async (name: string, uid: string) => {
  await setDoc(doc(db, "users", uid), { name }); // Create a new user document with the given name and UID
};

export const updateItemsInSubcollection = async (items) => {
  const userId = localStorage.getItem("uid");
  if (!userId) {
    throw new Error("Sign in is required before uploading data");
  }
  const userRef = doc(db, "users", userId);
  const itemsCollectionRef = collection(userRef, "collections");
  const batch = writeBatch(db);

  items.forEach((item) => {
    const itemRef = doc(itemsCollectionRef, item._id);
    batch.set(itemRef, item, { merge: true });
  });

  await batch.commit();
};

export async function getUserData() {
  // Get user containers
  const userId = localStorage.getItem("uid");
  if (!userId) {
    throw new Error("Sign in is required before downloading data");
  }
  const userRef = doc(db, "users", userId);
  const collectionRef = collection(userRef, "collections");
  const collectionSnapshot = await getDocs(collectionRef);
  const collections = collectionSnapshot.docs.map((doc) => ({
    ...doc.data(),
  }));

  // Get user sections
  // const sectionsRef = collection(userRef, "sections");
  // const sectionsSnapshot = await getDocs(sectionsRef);
  // const sections = sectionsSnapshot.docs.map((doc) => ({
  //   id: doc.id,
  //   ...doc.data(),s
  // }));

  return collections;
}
