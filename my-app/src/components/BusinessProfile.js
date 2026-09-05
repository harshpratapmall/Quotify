import { useState } from 'react';
import { upload } from '@vercel/blob/client';

const MAX_LOGO_FILE_SIZE_BYTES = 200 * 1024;

const logoPath = (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'image';
  return `business-logos/logo.${extension}`;
};

function BusinessProfile({ profile, setProfile, saveProfile, navigate }) {
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPreparingLogo, setIsPreparingLogo] = useState(false);
  const [message, setMessage] = useState('');

  const change = (field, value) =>
    setProfile({
      ...profile,
      [field]: value,
    });

  const save = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const saved = await saveProfile(profile);
      setMessage(saved ? 'Business profile saved.' : 'Unable to save your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      event.target.value = '';
      setMessage('Logo must be 200 KB or smaller.');
      return;
    }

    setIsPreparingLogo(true);

    try {
      const blob = await upload(logoPath(file), file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      });
      setProfile({
        ...profile,
        logoUrl: blob.url,
      });
      setMessage('Logo selected. Save business profile to apply it.');
    } catch {
      setMessage('Unable to upload logo. Please try again.');
    } finally {
      setIsPreparingLogo(false);
    }
  };

  return (
    <main className="page-content">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Business profile</p>
            <h3>Make every quotation yours</h3>
          </div>
          <button className="secondary-action" type="button" onClick={() => navigate('/')}>
            Back
          </button>
        </div>

        <form className="quotation-form" onSubmit={save}>
          <div className="form-grid">
            <label>
              Business name
              <input
                value={profile.businessName || ''}
                onChange={(event) => change('businessName', event.target.value)}
                required
              />
            </label>

            <label>
              Quotation prefix
              <input
                value={profile.quotePrefix || ''}
                onChange={(event) => change('quotePrefix', event.target.value.toUpperCase())}
                placeholder="ACME"
              />
            </label>

            <label>
              Phone
              <input
                value={profile.phone || ''}
                onChange={(event) => change('phone', event.target.value)}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={profile.email || ''}
                onChange={(event) => change('email', event.target.value)}
              />
            </label>

            <label>
              GSTIN
              <input
                value={profile.gstin || ''}
                onChange={(event) => change('gstin', event.target.value)}
              />
            </label>

            <label>
              Business logo (JPEG, PNG, or WebP, up to 200 KB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
              />
            </label>

            <label className="full-width">
              Address
              <textarea
                value={profile.address || ''}
                onChange={(event) => change('address', event.target.value)}
                rows="2"
              />
            </label>

            <label className="full-width">
              Quotation terms
              <textarea
                value={profile.terms || ''}
                onChange={(event) => change('terms', event.target.value)}
                rows="3"
                placeholder="This quotation is valid for 15 days."
              />
            </label>
          </div>

          {profile.logoUrl && (
            <img className="profile-logo-preview" src={profile.logoUrl} alt="Business logo preview" />
          )}

          <button className="primary-action" type="submit" disabled={isSavingProfile || isPreparingLogo}>
            {isSavingProfile ? 'Saving...' : isPreparingLogo ? 'Preparing logo...' : 'Save business profile'}
          </button>

          {message && <p className="save-status">{message}</p>}
        </form>
      </section>
    </main>
  );
}

export default BusinessProfile;
