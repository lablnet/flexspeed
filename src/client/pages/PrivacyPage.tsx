import { PageHeading } from '../components/layout/PageHeading';

export function PrivacyPage() {
  return (
    <>
      <PageHeading
        title="Your privacy."
        description="A simple overview of how Flexspeed handles your information."
      />
      <div className="about-grid">
        <section className="panel about-card">
          <h2>Information we collect</h2>
          <p>
            We store completed test results, including measurements, full public IP address, network
            details, approximate location, and available browser and device information. This
            supports result history and sharing.
          </p>
        </section>
        <section className="panel about-card">
          <h2>Public sharing</h2>
          <p>
            Anyone with a result link can view its measurements, charts and basic network details.
            Public pages and posters do not show your IP address, name or email.
          </p>
        </section>
        <section className="panel about-card">
          <h2>Optional Google sign-in</h2>
          <p>
            Signing in lets you access account history across devices. We receive your Google
            account identity, name, email and optional profile image, and use cookies to keep you
            signed in. We do not receive your Google password. There are no third-party analytics
            scripts; interface fonts load from Google Fonts.
          </p>
        </section>
      </div>
    </>
  );
}
