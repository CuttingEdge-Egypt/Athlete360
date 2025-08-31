export default function TestPaymentPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Payment Success - Test Page Working!</h1>
      <p>URL: {window.location.href}</p>
      <p>Search: {window.location.search}</p>
    </div>
  );
}