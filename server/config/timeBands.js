// Time-of-day bands for homepage contextual suggestions.
// Products are matched by real category/subCategory (not free-text keyword search), so
// the section only ever shows genuinely relevant products. `priorityKeywords` (matched
// against name/tags) just biases ranking within that category/subCategory pool — it
// never widens or narrows which products are eligible.
//
// `hours` is [startHour, endHour); the night band wraps past midnight.

module.exports = [
  {
    key: 'morning',
    hours: [5, 11],
    label: '☀️ Good morning! Breakfast picks',
    categories: ['Dairy and Breakfast', 'Vegetables and Fruits'],
    subCategories: [],
    priorityKeywords: ['milk', 'bread', 'egg', 'fruit'],
  },
  {
    key: 'afternoon',
    hours: [11, 17],
    label: '🥤 Beat the afternoon heat',
    categories: ['Beverages', 'Stationery'],
    subCategories: ['Lassi and Milkshakes', 'Energy Bars'],
    priorityKeywords: [],
  },
  {
    key: 'evening',
    hours: [17, 21],
    label: '🍟 Evening snack cravings',
    categories: ['Snacks', 'Chocolates and Biscuits', 'Beverages'],
    subCategories: ['Noodles and Soups'],
    priorityKeywords: [],
  },
  {
    key: 'night',
    hours: [21, 5],
    label: '🌙 Late-night essentials',
    categories: ['Essentials'],
    subCategories: ['Antiseptic, Masks & Sanitizers'],
    priorityKeywords: ['mosquito', 'repellent', 'sanitizer'],
  },
];
