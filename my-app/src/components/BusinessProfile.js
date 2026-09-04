import { useState } from 'react';

// Google Sheets allows at most 50,000 characters per cell; base64 expands source files.
const MAX_LOGO_FILE_SIZE_BYTES = 36 * 1024;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read logo file.'));
    reader.readAsDataURL(file);
  });

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
      setMessage('Logo must be 36 KB or smaller to save with your business profile.');
      return;
    }

    setIsPreparingLogo(true);

    try {
      const logoUrl = await readFileAsDataUrl(file);
      setProfile({
        ...profile,
        logoUrl,
      });
      setMessage('Logo selected. Save business profile to apply it.');
    } catch {
      setMessage('Unable to read logo. Please try a different image.');
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
              Business logo
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
