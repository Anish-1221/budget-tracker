// Buckets: id, label, color, kind (Monarch-style flex budgeting tag)
// kind: 'fixed' (same every month), 'recurring' (non-monthly / periodic), 'flex' (discretionary)
export const BUCKETS = [
  { id: 'groceries', label: 'Groceries', color: '#9BD66A', kind: 'flex' },
  { id: 'restaurants', label: 'Restaurants & takeout', color: '#F4B860', kind: 'flex' },
  { id: 'car', label: 'Car', color: '#6FB8F5', kind: 'recurring' },
  { id: 'housing', label: 'Rent & utilities', color: '#B39DFF', kind: 'fixed' },
  { id: 'shopping', label: 'Shopping', color: '#F07A9E', kind: 'flex' },
  { id: 'subscriptions', label: 'Subscriptions', color: '#8FD3E8', kind: 'fixed' },
  { id: 'health', label: 'Health & fitness', color: '#9BE0C6', kind: 'flex' },
  { id: 'travel', label: 'Travel', color: '#F5A66F', kind: 'flex' },
  { id: 'donation', label: 'Donation', color: '#E8C86F', kind: 'fixed' },
  { id: 'education', label: 'Education', color: '#A9B8F5', kind: 'recurring' },
  { id: 'personal', label: 'Personal care', color: '#D9A6F0', kind: 'flex' },
  { id: 'entertainment', label: 'Entertainment', color: '#F58C8C', kind: 'flex' },
  { id: 'fees', label: 'Fees & interest', color: '#C2C8D6', kind: 'recurring' },
  { id: 'other', label: 'Other', color: '#8C94A8', kind: 'flex' },
]
export const BUCKET_BY_ID = Object.fromEntries(BUCKETS.map(b => [b.id, b]))

export const ACCOUNTS = [
  { id: 'checking', label: 'Checking', color: '#4FD1C5', liability: false },
  { id: 'savings', label: 'Savings', color: '#7ED9A1', liability: false },
  { id: 'investments', label: 'Investments', color: '#B39DFF', liability: false },
]
export const ACCOUNT_BY_ID = Object.fromEntries(ACCOUNTS.map(a => [a.id, a]))

// Seed keyword map. Lowercase. Matched against whole words in the expense name
// (and as a substring for multi-word keys). Learned overrides in the user's data win over this.
export const KEYWORDS = {
  groceries: ['grocery', 'groceries', 'heb', 'h-e-b', 'kroger', 'walmart', 'costco', 'aldi', 'tom thumb', 'sprouts', 'whole foods', 'trader joe', 'target', 'indian store', 'patel', 'india bazaar', 'sam\'s club', 'flour', 'rice', 'dal', 'lentils', 'milk', 'eggs', 'bread', 'vegetables', 'veggies', 'fruit', 'fruits', 'paneer', 'yogurt', 'curd', 'oil', 'spices', 'atta', 'oats', 'protein powder', 'whey', 'tofu', 'onions', 'tomatoes', 'potatoes', 'snacks', 'produce', 'wingstop mart', '99 ranch', 'h mart', 'instacart'],
  restaurants: ['restaurant', 'takeout', 'take out', 'dining', 'dinner out', 'lunch out', 'chipotle', 'chick-fil-a', 'chick fil a', 'mcdonald', 'taco bell', 'wendy', 'whataburger', 'in-n-out', 'starbucks', 'dutch bros', 'coffee', 'cafe', 'boba', 'bubble tea', 'pizza', 'domino', 'papa john', 'subway', 'panda express', 'panera', 'doordash', 'uber eats', 'ubereats', 'grubhub', 'biryani', 'dosa', 'chaat', 'canteen', 'food truck', 'brunch', 'raising cane', 'five guys', 'shake shack', 'wingstop', 'ihop', 'denny'],
  car: ['gas', 'fuel', 'petrol', 'shell', 'exxon', 'chevron', 'qt', 'quiktrip', 'racetrac', 'buc-ee', 'bucees', 'valero', '7-eleven', 'car insurance', 'auto insurance', 'geico', 'progressive', 'state farm', 'allstate', 'car payment', 'car loan', 'auto loan', 'oil change', 'tire', 'tires', 'car wash', 'parking', 'toll', 'tolls', 'ntta', 'tolltag', 'registration', 'inspection', 'mechanic', 'brake', 'brakes', 'battery', 'wiper', 'dmv', 'dps', 'uber', 'lyft', 'dart'],
  housing: ['rent', 'lease', 'apartment', 'electricity', 'electric', 'txu', 'reliant', 'oncor', 'water bill', 'gas bill', 'atmos', 'internet', 'wifi', 'spectrum', 'att fiber', 'at&t', 'frontier', 'utilities', 'utility', 'trash', 'renters insurance', 'renter\'s insurance', 'phone bill', 'verizon', 't-mobile', 'tmobile', 'mint mobile', 'laundry'],
  shopping: ['amazon', 'best buy', 'apple store', 'ikea', 'clothes', 'clothing', 'shoes', 'shirt', 'jeans', 'jacket', 'nike', 'adidas', 'uniqlo', 'h&m', 'zara', 'old navy', 'ross', 'tj maxx', 'marshalls', 'home depot', 'lowes', 'lowe\'s', 'furniture', 'decor', 'kitchen', 'headphones', 'charger', 'cable', 'electronics', 'etsy', 'ebay', 'temu', 'shein', 'five below', 'dollar tree', 'gift', 'gifts'],
  subscriptions: ['netflix', 'spotify', 'youtube premium', 'youtube', 'hulu', 'disney', 'disney+', 'hbo', 'max', 'prime', 'amazon prime', 'apple music', 'icloud', 'google one', 'chatgpt', 'claude', 'openai', 'github', 'notion', 'adobe', 'dropbox', 'subscription', 'membership', 'crunchyroll', 'nyt', 'audible', 'kindle unlimited', 'xbox', 'playstation', 'nintendo online'],
  health: ['gym', 'planet fitness', 'la fitness', 'crunch', 'anytime fitness', 'doctor', 'dentist', 'dental', 'pharmacy', 'cvs', 'walgreens', 'medicine', 'meds', 'prescription', 'clinic', 'urgent care', 'copay', 'co-pay', 'health insurance', 'vitamins', 'supplements', 'creatine', 'therapy', 'eye exam', 'glasses', 'contacts', 'haircut', 'barber'],
  travel: ['flight', 'flights', 'airline', 'american airlines', 'southwest', 'united', 'delta', 'spirit', 'frontier air', 'indigo', 'air india', 'hotel', 'airbnb', 'hostel', 'train', 'amtrak', 'greyhound', 'rental car', 'hertz', 'enterprise', 'travel', 'trip', 'vacation', 'luggage', 'visa fee', 'passport'],
  donation: ['donation', 'donate', 'charity', 'temple', 'church', 'mosque', 'gurudwara', 'zakat', 'tithe', 'fundraiser', 'gofundme', 'red cross', 'unicef', 'akshaya patra', 'iskcon', 'give', 'giving', 'seva', 'daan', 'ngo', 'nonprofit'],
  education: ['tuition', 'fees', 'university', 'utd', 'ut dallas', 'textbook', 'textbooks', 'book', 'books', 'course', 'coursera', 'udemy', 'exam fee', 'conference', 'registration fee', 'lab fee', 'parking permit', 'student'],
  personal: ['salon', 'skincare', 'shampoo', 'conditioner', 'rosemary oil', 'toothpaste', 'razor', 'soap', 'deodorant', 'detergent', 'lotion', 'toiletries', 'nails'],
  entertainment: ['movie', 'movies', 'cinema', 'amc', 'cinemark', 'theater', 'theatre', 'concert', 'tickets', 'game', 'games', 'steam', 'bowling', 'arcade', 'top golf', 'topgolf', 'museum', 'park', 'six flags', 'event', 'party', 'bar', 'drinks'],
  fees: ['fee', 'late fee', 'interest', 'annual fee', 'atm', 'bank fee', 'overdraft', 'service charge', 'tax', 'taxes', 'irs'],
}

// Words that appear in the map for more than one bucket get the first match; keep specific keys earlier.
