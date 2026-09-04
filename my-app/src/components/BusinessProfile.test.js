import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { upload } from '@vercel/blob/client';
import BusinessProfile from './BusinessProfile';

jest.mock('@vercel/blob/client', () => ({
  upload: jest.fn(),
}), { virtual: true });

describe('BusinessProfile', () => {
  beforeEach(() => {
    upload.mockResolvedValue({ url: 'https://example.public.blob.vercel-storage.com/business-logos/logo.webp' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('selecting a logo does not submit the form automatically', async () => {
    const setProfile = jest.fn();
    const saveProfile = jest.fn();

    render(
      <BusinessProfile
        profile={{ businessName: 'Door2Door Experts' }}
        setProfile={setProfile}
        saveProfile={saveProfile}
        navigate={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/business logo/i), {
      target: {
        files: [new File(['logo'], 'logo.webp', { type: 'image/webp' })],
      },
    });

    await waitFor(() => {
      expect(setProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Door2Door Experts',
          logoUrl: 'https://example.public.blob.vercel-storage.com/business-logos/logo.webp',
        })
      );
    });

    expect(saveProfile).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(
      'business-logos/logo.webp',
      expect.any(File),
      expect.objectContaining({
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      })
    );
    expect(
      screen.getByText(/logo selected\. save business profile to apply it\./i)
    ).toBeInTheDocument();
  });

  test('rejects logos larger than the upload limit', () => {
    const saveProfile = jest.fn();

    render(
      <BusinessProfile
        profile={{ businessName: 'Door2Door Experts' }}
        setProfile={jest.fn()}
        saveProfile={saveProfile}
        navigate={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/business logo/i), {
      target: {
        files: [new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large-logo.webp', { type: 'image/webp' })],
      },
    });

    expect(
      screen.getByText(/logo must be 2 MB or smaller/i)
    ).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
