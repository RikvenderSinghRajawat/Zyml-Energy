// Initialize Firebase for Phone Auth OTP
(function() {
  // Use the config from firebase-config.js
  if (!window.FIREBASE_CONFIG) {
    console.error("❌ Firebase config not found. Make sure firebase-config.js is loaded first.");
    return;
  }
  
  if (window.firebase && window.firebase.apps && !window.firebase.apps.length) {
    window.firebase.initializeApp(window.FIREBASE_CONFIG);
    
    // Initialize Firebase Auth
    if (window.firebase.auth) {
      window.firebaseAuth = window.firebase.auth();
      console.log("✅ Firebase initialized for Phone Auth OTP");
    } else {
      console.warn("⚠️ Firebase Auth not available. Make sure firebase-auth-compat.js is included.");
    }
  } else if (!window.firebase) {
    console.error("❌ Firebase SDK not loaded. Ensure firebase-app-compat.js is included before this file.");
  }
})();