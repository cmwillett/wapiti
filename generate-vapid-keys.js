// Generate VAPID keys for push notifications
const crypto = require('crypto');

function urlBase64(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate EC P-256 key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256 curve
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'der'
  }
});

// Convert private key to base64url format
const privateKeyBase64 = urlBase64(privateKey);

// Extract the raw public key from the SPKI format
// SPKI has a header, we need to extract just the 65-byte uncompressed point
const publicKeyRaw = publicKey.slice(-65); // Last 65 bytes are the uncompressed point
const publicKeyBase64 = urlBase64(publicKeyRaw);

console.log('=== VAPID Keys Generated ===');
console.log('');
console.log('Public Key (use in client):');
console.log(publicKeyBase64);
console.log('');
console.log('Private Key (use in Edge Function env var):');
console.log(privateKeyBase64);
console.log('');
console.log('=== Instructions ===');
console.log('1. Add these to your Supabase Edge Function environment variables:');
console.log('   VAPID_PUBLIC_KEY=' + publicKeyBase64);
console.log('   VAPID_PRIVATE_KEY=' + privateKeyBase64);
console.log('');
console.log('2. Update your client code to use the new public key');
console.log('3. Clear existing push subscriptions and re-register');
console.log('');
console.log('=== Key Info ===');
console.log('Public key length:', publicKeyRaw.length, 'bytes');
console.log('Private key format: PKCS#8 DER');
