const { handleUpload } = require('@vercel/blob/client');

const BUSINESS_API_URL = process.env.QUOTIFY_API_URL || 'https://quotify-t879.onrender.com';
const MAX_LOGO_FILE_SIZE_BYTES = 500 * 1024;

async function authorizedUser(clientPayload) {
  let ticket;
  try {
    ticket = JSON.parse(clientPayload || '{}').ticket;
  } catch {
    throw new Error('Invalid logo upload authorization.');
  }
  if (typeof ticket !== 'string' || !ticket) {
    throw new Error('Logo upload authorization is required.');
  }

  const response = await fetch(`${BUSINESS_API_URL}/api/v1/auth/logo-upload-token/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ticket}` },
  });

  if (!response.ok) {
    throw new Error('Not authenticated.');
  }

  const payload = await response.json();
  if (typeof payload?.userId !== 'string' || !payload.userId) {
    throw new Error('Invalid logo upload authorization.');
  }
  return payload.userId;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Logo uploads must be started from an authenticated Business Desk session.' });
  }
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const userId = await authorizedUser(clientPayload);

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: MAX_LOGO_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Unable to authorize logo upload.' });
  }
};
