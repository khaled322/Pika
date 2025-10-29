// Using direct CDN imports to work in environments without a build step.
// This adopts the Firebase v9+ modular syntax.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Your web app's Firebase configuration.
const firebaseConfig = {
    apiKey: "AIzaSyAJqr1AWaDlDEI5-8dmhpYGFie8uAo0jhY",
    authDomain: "plkabii.firebaseapp.com",
    projectId: "plkabii",
    storageBucket: "plkabii.firebasestorage.app",
    messagingSenderId: "671276077147",
    appId: "1:671276077147:web:5f790a4a64a2c007a86f7e",
    measurementId: "G-CKW7SKXCFK"
};

let authInstance = null;
let initializationError = null;

const getFirebaseAuth = () => {
  if (authInstance) return authInstance;
  if (initializationError) return null;

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    initializationError = error;
    console.error("FATAL: Firebase initialization failed. Auth features will be disabled.", error);
    
    if (!document.querySelector('.firebase-error-alert')) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'firebase-error-alert';
        alertDiv.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;padding:15px;background-color:#f44336;color:white;z-index:1000;border-radius:5px;text-align:center;font-family:sans-serif;';
        alertDiv.innerHTML = '<strong>Configuration Error:</strong> Authentication services are currently unavailable. Please check the console for details.';
        document.body.appendChild(alertDiv);
    }
    return null;
  }
};

export const signInWithGoogle = async () => {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Authentication service is not available.");
  const provider = new GoogleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google Sign-In popup error:", error);
    if (error.code === 'auth/popup-closed-by-user') {
        alert("Sign-in process was cancelled. Please try again.");
    } else {
        alert("An error occurred during Google Sign-In. Please try again later.");
    }
    throw error;
  }
};

export const signUpWithEmailPassword = (email, password) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Authentication service is not available.");
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmailPassword = (email, password) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Authentication service is not available.");
    return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Authentication service is not available.");
    return signOut(auth);
};

export const onAuthChange = (callback) => {
    const auth = getFirebaseAuth();
    if (!auth) {
        callback(null);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

export const getFriendlyAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'البريد الإلكتروني الذي أدخلته غير صالح.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب بهذا البريد الإلكتروني. يرجى إنشاء حساب جديد.';
    case 'auth/wrong-password':
      return 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
    case 'auth/requires-recent-login':
      return 'هذه العملية حساسة وتتطلب مصادقة حديثة. الرجاء تسجيل الخروج ثم الدخول مرة أخرى.';
    default:
      return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }
};
