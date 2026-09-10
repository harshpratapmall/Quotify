import ActionIcon from './ActionIcon';

const journeys = [
  {
    icon: 'profile',
    title: 'Set up your business',
    steps: [
      'Add your business name, logo, GSTIN, and contact details.',
      'Choose a quotation prefix and the default terms printed on every document.',
    ],
  },
  {
    icon: 'quotation',
    title: 'Send a quotation',
    steps: [
      'Create a quotation and pick an existing client to auto-fill their details.',
      'Add items with quantities and rates, then generate the preview.',
      'Share from the preview: create a share link or send a WhatsApp message. When the client opens the link, the status updates to Viewed automatically.',
      'Download the PDF, and convert the quotation to a bill once the client accepts.',
    ],
  },
  {
    icon: 'bill',
    title: 'Issue a bill',
    steps: [
      'Create a bill for completed work and set a payment due date.',
      'Record every payment you receive with its date and amount. The payment status updates to Partially Paid or Paid automatically.',
      'Payment details are hidden for bills marked as Cancelled.',
    ],
  },
  {
    icon: 'open',
    title: 'Track your pipeline',
    steps: [
      'Follow every quotation through Draft, Sent, Viewed, Accepted or Declined, and Cancelled in the quotation library.',
      'Keep bills moving from Draft to Issued, and mark them Cancelled when they no longer apply.',
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
];

function UserGuide() {
  return (
    <section className="user-guide form-card">
      <div className="user-guide-header">
        <p className="eyebrow">A note for users</p>
        <h3>Getting started with Quotify</h3>
        <p>Manage quotations, bills, and clients in one place. Start with the simplest journey below and grow from there.</p>
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