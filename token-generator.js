const jwt = require('jsonwebtoken');

const secret = ''; // your SkyWay secret
const appId = ''; // your SkyWay App ID

// Function to generate UUID v4 (like PHP's generateUUID)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


const payload = {
  iat: Math.floor(Date.now() / 1000),
  jti: generateUUID(),
  exp: Math.floor(Date.now() / 1000) + 86400, // 24h expiry
  scope: {
    app: {
      id: appId,
      turn: true,
      actions: ['read'],
      channels: [
        {
          id: '*',
          name: '*',
          actions: ['write'],
          members: [
            {
              id: '*',
              name: '*',
              actions: ['write'],
              publication: {
                actions: ['write']
              },
              subscription: {
                actions: ['write']
              }
            }
          ],
          sfuBots: [
            {
              actions: ['write'],
              forwardings: [
                {
                  actions: ['write']
                }
              ]
            }
          ]
        }
      ]
    }
  }
};

const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

console.log('JWT Token:\n',token);