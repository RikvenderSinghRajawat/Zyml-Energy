// Configure Firebase Phone Auth for SMS OTP

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDxzJpbpMU_QccyhheHSIY3mzIV7NhsLPg",
  authDomain: "zylm-152c9.firebaseapp.com",
  projectId: "zylm-152c9",
  storageBucket: "zylm-152c9.firebasestorage.app",
  messagingSenderId: "414194692009",
  appId: "1:414194692009:web:d89a3c130e2902fdc15eb8",
  measurementId: "G-HP6789G43N"
};

// Enable Firebase OTP flow
window.USE_FIREBASE_OTP = true;

// IMPORTANT: 
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Enable Phone Authentication in Authentication > Sign-in method
// 3. Add your phone number to the allowlist in Authentication > Phone
// 4. Replace the above config with your actual Firebase project config
// 5. Add your domain to Authorized domains in Authentication > Settings