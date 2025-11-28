// Web Push helper using VAPID authentication
// Based on the Web Push Protocol RFC 8030

export async function sendWebPush(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  payload: any,
  vapidDetails: {
    publicKey: string;
    privateKey: string;
    subject: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const payloadBuffer = encoder.encode(payloadString);

    // Parse the endpoint
    const url = new URL(subscription.endpoint);
    
    // Create JWT for VAPID authentication
    const vapidHeaders = await generateVAPIDHeaders(
      url.origin,
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    );

    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': payloadBuffer.length.toString(),
        'TTL': '86400', // 24 hours
        'Authorization': vapidHeaders.Authorization,
        'Crypto-Key': vapidHeaders['Crypto-Key'],
      },
      body: payloadBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Web Push failed:', response.status, errorText);
      return { 
        success: false, 
        error: `Push failed with status ${response.status}: ${errorText}` 
      };
    }

    console.log('Web Push sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Web Push error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function generateVAPIDHeaders(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<{ Authorization: string; 'Crypto-Key': string }> {
  // Create JWT header and payload
  const jwtHeader = { typ: 'JWT', alg: 'ES256' };
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200, // 12 hours
    sub: subject,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(jwtHeader));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const privateKeyBuffer = base64UrlDecode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  // Create signed JWT
  const encodedSignature = base64UrlEncode(signature);
  const jwt = `${unsignedToken}.${encodedSignature}`;

  // Return VAPID headers
  return {
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`,
  };
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  let str: string;
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    const bytes = new Uint8Array(input);
    str = btoa(String.fromCharCode(...bytes));
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
  // Add padding if needed
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4 !== 0) {
    input += '=';
  }
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

