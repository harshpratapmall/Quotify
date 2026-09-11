import { fireEvent, render } from '@testing-library/react';
import QuotationPreviewModal from './QuotationPreviewModal';

const renderPreview = (previewOnly, goBack) => render(
  <QuotationPreviewModal
    pathname="/quotation/preview"
    previewOnly={previewOnly}
    quotation={{ quoteDate: '2026-09-04' }}
    items={[]}
    includeGst={false}
    gstPercentage={0}
    subtotal={0}
    tax={0}
    total={0}
    activeQuotationId={null}
    saveQuotation={jest.fn()}
    downloadPdf={jest.fn()}
    navigate={jest.fn()}
    goBack={goBack}
  />
);

test('closes a saved quotation preview to the previous page when its backdrop is clicked', () => {
  const goBack = jest.fn();
  const { container } = renderPreview(true, goBack);

  fireEvent.mouseDown(container.querySelector('.modal-backdrop'));

  expect(goBack).toHaveBeenCalledTimes(1);
});

test('closes an editable quotation preview to the previous page when its backdrop is clicked', () => {
  const goBack = jest.fn();
  const { container } = renderPreview(false, goBack);

  fireEvent.mouseDown(container.querySelector('.modal-backdrop'));

  expect(goBack).toHaveBeenCalledTimes(1);
});

test('requests a PDF download from the preview action', () => {
  const downloadPdf = jest.fn();
  const { getByRole } = render(
    <QuotationPreviewModal
      pathname="/quotation/preview"
      previewOnly={false}
      quotation={{ quoteDate: '2026-09-04' }}
      items={[]}
      includeGst={false}
      gstPercentage={0}
      subtotal={0}
      tax={0}
      total={0}
      activeQuotationId={null}
      saveQuotation={jest.fn()}
      downloadPdf={downloadPdf}
      navigate={jest.fn()}
      goBack={jest.fn()}
    />
  );

  fireEvent.click(getByRole('button', { name: /download as pdf/i }));

  expect(downloadPdf).toHaveBeenCalledWith('preview');
});

test('bill preview payment summary uses the document total', () => {
  const { getByText, getAllByText } = render(
    <QuotationPreviewModal
      pathname="/bill/preview"
      previewOnly={false}
      documentType="bill"
      quotation={{ quoteDate: '2026-09-04', status: 'issued', paymentStatus: 'partially_paid', payments: [{ date: '2026-09-01', amount: 2500 }] }}
      items={[]}
      includeGst={false}
      gstPercentage={0}
      subtotal={10000}
      tax={0}
      total={10000}
      activeQuotationId="BILL-1"
      saveQuotation={jest.fn()}
      downloadPdf={jest.fn()}
      navigate={jest.fn()}
      goBack={jest.fn()}
    />
  );

  expect(getAllByText('₹ 10,000').length).toBeGreaterThan(0);
  expect(getAllByText('₹ 2,500').length).toBeGreaterThan(0);
  expect(getByText('₹ 7,500')).toBeTruthy();
});