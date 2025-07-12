// Updated sendFCMNotification function with proper Web Push protocol
// Replace the existing sendFCMNotification function in your Edge Function with this code

async function sendFCMNotification(subscription, task) {
  try {
    console.log(`Sending Web Push notification with VAPID auth for task ${task.id}`);
    console.log('Subscription data:', JSON.stringify(subscription, null, 2));

    // Use the flat structure from your database
    const endpoint = subscription.endpoint;
    const p256dh = subscription.p256dh;
    const auth = subscription.auth;

    if (!endpoint || !p256dh || !auth) {
      console.error('Subscription structure:', subscription);
      throw new Error('Invalid subscription: missing endpoint, p256dh, or auth');
    }

    console.log(`Endpoint: ${endpoint.substring(0, 50)}...`);

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not found in environment variables');
    }

    // Create push payload
    const payload = JSON.stringify({
      title: '📝 Task Reminder',
      body: `Don't forget: ${task.text}`,
      data: {
        taskId: task.id.toString(),
        action: 'task-reminder',
        icon: '/icons/icon-192x192.png',
        badge: '/favicon.svg',
        tag: `task-${task.id}`,
        requireInteraction: true
      }
    });

    console.log('Web Push payload:', payload);

    // Encrypt the payload using Web Push encryption
    const encryptedPayload = await encryptPayload(payload, p256dh, auth);
    
    // Create VAPID JWT token
    const vapidJWT = await createVapidJWT(endpoint, vapidPublicKey, vapidPrivateKey);

    // Send to push service with proper headers
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${vapidJWT}, k=${vapidPublicKey}`,
        'TTL': '86400'
      },
      body: encryptedPayload
    });

    if (response.ok) {
      console.log('✅ Web Push with VAPID sent successfully');
      return {
        success: true,
        messageId: `web-push-${Date.now()}`
      };
    } else {
      console.error('❌ Web Push failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return {
        success: false,
        error: `Push service error: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    console.error('Web Push notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to encrypt payload using Web Push encryption
async function encryptPayload(payload, p256dh, auth) {
  // Convert base64url keys to Uint8Array
  const userPublicKey = base64urlToUint8Array(p256dh);
  const userAuth = base64urlToUint8Array(auth);
  
  // Generate a random salt and key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: await crypto.subtle.importKey(
      'raw', 
      userPublicKey, 
      { name: 'ECDH', namedCurve: 'P-256' }, 
      false, 
      []
    )},
    localKeyPair.privateKey,
    256
  );
  
  // Create encryption key and nonce using HKDF
  const context = new Uint8Array([
    ...stringToUint8Array('WebPush: info\x00'),
    ...userPublicKey,
    ...localPublicKey
  ]);
  
  const encryptionKey = await hkdf(new Uint8Array(sharedSecret), userAuth, context, 16);
  const nonce = await hkdf(new Uint8Array(sharedSecret), userAuth, 
    stringToUint8Array('Content-Encoding: nonce\x00'), 12);
  
  // Encrypt the payload
  const key = await crypto.subtle.importKey('raw', encryptionKey, 'AES-GCM', false, ['encrypt']);
  const plaintextBuffer = stringToUint8Array(payload);
  
  // Add padding (minimum 2 bytes: 0x00 0x00)
  const paddedPayload = new Uint8Array(plaintextBuffer.length + 2);
  paddedPayload.set(plaintextBuffer);
  paddedPayload[plaintextBuffer.length] = 0x00;
  paddedPayload[plaintextBuffer.length + 1] = 0x00;
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    paddedPayload
  );
  
  // Create the final payload with salt and public key
  const result = new Uint8Array(salt.length + 4 + 1 + localPublicKey.length + encryptedData.byteLength);
  let offset = 0;
  
  result.set(salt, offset);
  offset += salt.length;
  
  // Record size (4 bytes, big endian)
  const recordSize = new DataView(new ArrayBuffer(4));
  recordSize.setUint32(0, 4096, false);
  result.set(new Uint8Array(recordSize.buffer), offset);
  offset += 4;
  
  // Public key length (1 byte)
  result[offset] = localPublicKey.length;
  offset += 1;
  
  // Public key
  result.set(localPublicKey, offset);
  offset += localPublicKey.length;
  
  // Encrypted data
  result.set(new Uint8Array(encryptedData), offset);
  
  return result;
}

// Helper function for HKDF
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(result);
}

// Helper function to create VAPID JWT
async function createVapidJWT(endpoint, publicKey, privateKey) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };
  
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:your-email@example.com' // Replace with your email
  };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key for signing
  const keyData = base64urlToUint8Array(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    stringToUint8Array(unsignedToken)
  );
  
  const encodedSignature = base64urlEncode(new Uint8Array(signature));
  
  return `${unsignedToken}.${encodedSignature}`;
}

// Utility functions
function base64urlToUint8Array(base64url) {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}

function base64urlEncode(data) {
  let base64;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function stringToUint8Array(str) {
  return new Uint8Array([...str].map(char => char.charCodeAt(0)));
}
