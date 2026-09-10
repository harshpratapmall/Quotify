import ActionIcon from './ActionIcon';

const journeys = [
  {
    icon: 'profile',
    title: 'Set up your business',
    steps: [
      'Add your business name, logo, GSTIN, and contact details.',
      'Choose a quotation prefix and the default terms printed on every quotation.',
    ],
  },
  {
    icon: 'quotation',
    title: 'Send a quotation',
    steps: [
      'Create a quotation and pick an existing client to auto-fill their details.',
      'Add items with quantities and rates, then generate the preview.',
      'Save, create a share link, draft a WhatsApp message, or download the PDF.',
      'After the client accepts, convert the quotation into a bill.',
    ],
  },
  {
    icon: 'bill',
    title: 'Issue a bill',
    steps: [
      'Create a bill for completed work and set a payment due date.',
      'Track the bill lifecycle and payment status from the library or preview.',
    ],
  },
  {
    icon: 'library',
    title: 'Manage clients',
    steps: [
      'Search the client directory and open a client to review every linked document.',
      'Edit client details from the directory, or delete a client from the edit screen.',
    ],
  },
  {
    icon: 'power',
    title: 'Users & access',
    steps: [
      'Administrators manage accounts from the Manage users screen.',
      'Create users, deactivate or activate them, and reset passwords when needed.',
    ],
  },
];

function UserGuide() {
  return (
    <section className="user-guide form-card">
      <div className="user-guide-header">
        <p className="eyebrow">A note for users</p>
        <h3>Getting started with Quotify</h3>
        <p>Manage quotations, bills, clients, and users in one place. Start with the simplest journey below and grow from there.</p>
      </div>
      <div className="user-guide-grid">
        {journeys.map((journey) => (
          <article className="user-guide-card" key={journey.title}>
            <h4><ActionIcon type={journey.icon} />{journey.title}</h4>
            <ol>{journey.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </article>
        ))}
      </div>
    </section>
  );
}

export default UserGuide;