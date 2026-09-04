import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BusinessProfile from './BusinessProfile';

class MockFileReader {
  readAsDataURL(file) {
    this.result = `data:${file.type};base64,TEST_DATA`;
    if (this.onload) {
      this.onload();
    }
  }
}

describe('BusinessProfile', () => {
  const originalFileReader = window.FileReader;

  beforeEach(() => {
    window.FileReader = MockFileReader;
  });

  afterEach(() => {
    window.FileReader = originalFileReader;
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
          logoUrl: 'data:image/webp;base64,TEST_DATA',
        })
      );
    });

    expect(saveProfile).not.toHaveBeenCalled();
    expect(
      screen.getByText(/logo selected\. save business profile to apply it\./i)
    ).toBeInTheDocument();
  });

  test('rejects a logo that cannot fit in a Google Sheets cell', () => {
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
        files: [new File([new Uint8Array(36 * 1024 + 1)], 'large-logo.webp', { type: 'image/webp' })],
      },
    });

    expect(
      screen.getByText(/logo must be 36 KB or smaller to save with your business profile/i)
    ).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
