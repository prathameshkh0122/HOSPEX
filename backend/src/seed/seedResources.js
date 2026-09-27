const Resource = require('../models/Resource');

const demoResources = [
  { name: 'Banquet Chairs', category: 'furniture', quantity: 50, condition: 'good', exchangeType: 'exchange', pricePerPiece: 45, availableFrom: new Date('2026-09-28'), availableTo: new Date('2026-10-31'), description: '50 chairs available in good condition.', location: 'Andheri East, Mumbai', ownerName: 'Hotel Sunshine', distance: 2.1, verified: true },
  { name: 'Commercial Mixer', category: 'equipment', quantity: 1, condition: 'used', exchangeType: 'sell', pricePerPiece: 18000, availableFrom: new Date('2026-09-28'), availableTo: new Date('2026-12-31'), description: 'Heavy-duty kitchen mixer, lightly used.', location: 'Bandra Kurla Complex, Mumbai', ownerName: 'Grand Café', distance: 3.4, verified: true },
  { name: 'Premium Bedsheets', category: 'linen', quantity: 100, condition: 'new', exchangeType: 'donate', pricePerPiece: 0, availableFrom: new Date('2026-09-28'), availableTo: new Date('2026-11-30'), description: 'Clean, unused hotel bedsheets available.', location: 'Powai, Mumbai', ownerName: 'Royal Palace', distance: 1.7, verified: true },
  { name: 'Surplus Meal Packs', category: 'food', quantity: 30, condition: 'new', exchangeType: 'donate', pricePerPiece: 0, availableFrom: new Date('2026-09-28'), availableTo: new Date('2026-10-15'), description: 'Fresh surplus meals available for donation.', location: 'Juhu, Mumbai', ownerName: 'Bistro Terrace', distance: 4.2, verified: true }
];

async function seedResources() {
  if (await Resource.estimatedDocumentCount() === 0) {
    await Resource.insertMany(demoResources);
    console.log('Added the four sample marketplace listings.');
  }
}

module.exports = seedResources;
