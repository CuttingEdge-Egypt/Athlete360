// Test script to check all integration IDs from Paymob dashboard
const integrationIds = [
  4723445, // UIG-in_store (Mobile Wallet)
  4723444, // MIGS-tap_on_phone (Online Card)
  4723443, // MIGS-online (Online Card) - currently failing
  4279357, // Unnamed (Online Card)
  4279356  // Unnamed (Mobile Wallet)
];

console.log('Integration IDs to test:');
integrationIds.forEach((id, index) => {
  console.log(`${index + 1}. ${id}`);
});

module.exports = { integrationIds };