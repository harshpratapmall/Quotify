const { handleUpload } = require('@vercel/blob/client');

const BUSINESS_API_URL = process.env.QUOTIFY_API_URL || 'https://quotify-i62o.onrender.com';
const MAX_LOGO_FILE_SIZE_BYTES = 200 * 1024;

async function currentUser(request) {
  const response = await fetch(`${BUSINESS_API_URL}/api/v1/auth/me`, {
    headers: {
      cookie: request.headers.cookie || '',
    },
  });

  if (!response.ok) {
    throw new Error('Not authenticated.');
  }

  const payload = await response.json();
  return payload.user;
}

module.exports = async function handler(request, response) {
  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await currentUser(request);

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: MAX_LOGO_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Unable to authorize logo upload.' });
  }
};
