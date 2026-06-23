# TCGdex API Integration Guide

The TCGdex API provides free access to Pokemon Trading Card Game data. Use this to automatically populate your store with real card information.

## API Endpoints

### Base URL
```
https://api.tcgdex.net/v1
```

### Endpoints Available

#### Get All Sets
```javascript
GET /sets
```

Returns all Pokemon card sets with metadata.

```javascript
import { tcgdexAPI } from './services/tcgdexAPI'

const sets = await tcgdexAPI.getSets()
// Returns array of sets like:
// [
//   { id: 'sv1', name: 'Scarlet & Violet', series: 'Scarlet & Violet', ... },
//   { id: 'sv2', name: 'Paldea Evolved', series: 'Scarlet & Violet', ... },
//   ...
// ]
```

#### Get Specific Set
```javascript
GET /sets/{setId}
```

Get details about a specific set.

```javascript
const set = await tcgdexAPI.getSet('sv1')
// Returns:
// {
//   id: 'sv1',
//   name: 'Scarlet & Violet',
//   series: 'Scarlet & Violet',
//   printedTotal: 198,
//   total: 220,
//   ...
// }
```

#### Get Cards from Set
```javascript
GET /sets/{setId}/cards
```

Get all cards in a specific set.

```javascript
const cards = await tcgdexAPI.getCardsBySet('sv1')
// Returns array of cards like:
// [
//   {
//     id: 'sv1-1',
//     name: 'Sprigatito',
//     rarity: 'Common',
//     image: 'https://images.pokemontcg.io/sv1/1/high.png',
//     ...
//   },
//   ...
// ]
```

#### Get Specific Card
```javascript
GET /cards/{cardId}
```

Get details about a specific card.

```javascript
const card = await tcgdexAPI.getCard('sv1-25')
// Returns detailed card information
```

## Example: Auto-Import Products

Here's how to create a function that imports cards from TCGdex and creates products:

```javascript
// services/tcgdexImporter.js
import { tcgdexAPI } from './tcgdexAPI'
import { productsService } from './supabaseService'

export const tcgdexImporter = {
  // Import all cards from a set as products
  importSetProducts: async (setId, basePrice = 39.99) => {
    try {
      const cards = await tcgdexAPI.getCardsBySet(setId)
      const set = await tcgdexAPI.getSet(setId)

      const createdProducts = []

      for (const card of cards) {
        // Skip duplicates - only create product once per card
        try {
          // Create product from card data
          const product = await productsService.create({
            name: `${card.name} ${card.rarity ? `(${card.rarity})` : ''}`,
            set_id: setId,
            set_name: set.name,
            card_id: card.id,
            price: basePrice,
            stock_quantity: 5, // Default stock
            image_url: card.image?.high || card.image?.low || null,
            description: `Pokemon card from ${set.name}. Card ID: ${card.id}`,
            condition: 'Sealed',
            card_details: `Rarity: ${card.rarity || 'Unknown'}`,
          })

          createdProducts.push(product)
          console.log(`Created: ${product.name}`)
        } catch (err) {
          console.error(`Failed to create ${card.name}:`, err)
        }
      }

      return createdProducts
    } catch (err) {
      console.error('Error importing set:', err)
      throw err
    }
  },

  // Import high-value cards only
  importRareCards: async (setId, rarities = ['Rare Holo'], basePrice = 49.99) => {
    try {
      const cards = await tcgdexAPI.getCardsBySet(setId)
      const set = await tcgdexAPI.getSet(setId)

      const createdProducts = []

      for (const card of cards) {
        if (rarities.includes(card.rarity)) {
          try {
            const product = await productsService.create({
              name: `${card.name} (${card.rarity})`,
              set_id: setId,
              set_name: set.name,
              card_id: card.id,
              price: basePrice,
              stock_quantity: 3, // Limited stock for rare cards
              image_url: card.image?.high || card.image?.low || null,
              description: `Rare Pokemon card from ${set.name}`,
              condition: 'Sealed',
              card_details: `Rarity: ${card.rarity}`,
            })

            createdProducts.push(product)
          } catch (err) {
            console.error(`Failed to create ${card.name}:`, err)
          }
        }
      }

      return createdProducts
    } catch (err) {
      console.error('Error importing rare cards:', err)
      throw err
    }
  },

  // Get all available sets
  getAvailableSets: async () => {
    return await tcgdexAPI.getSets()
  },
}
```

## Usage in Components

### Import Sets into Admin Panel

```javascript
// pages/Admin.jsx - add this to the component

import { tcgdexImporter } from '../services/tcgdexImporter'

export default function Admin() {
  const [availableSets, setAvailableSets] = useState([])
  const [importingSetId, setImportingSetId] = useState(null)
  const [importStatus, setImportStatus] = useState('')

  useEffect(() => {
    loadAvailableSets()
  }, [])

  const loadAvailableSets = async () => {
    try {
      const sets = await tcgdexImporter.getAvailableSets()
      setAvailableSets(sets)
    } catch (err) {
      console.error('Error loading sets:', err)
    }
  }

  const handleImportSet = async (setId) => {
    try {
      setImportingSetId(setId)
      setImportStatus(`Importing ${setId}...`)

      const products = await tcgdexImporter.importSetProducts(setId)

      setImportStatus(`Successfully imported ${products.length} products!`)
      fetchProducts() // Refresh product list
      setTimeout(() => setImportStatus(''), 3000)
    } catch (err) {
      console.error('Import error:', err)
      setImportStatus('Error importing set')
    } finally {
      setImportingSetId(null)
    }
  }

  return (
    <div className="admin-container">
      {/* Existing form... */}

      <section className="tcgdex-import-section">
        <h2>Import from TCGdex API</h2>
        {importStatus && <p className="import-status">{importStatus}</p>}

        <div className="sets-list">
          {availableSets.map((set) => (
            <div key={set.id} className="set-card">
              <h4>{set.name}</h4>
              <p>{set.printedTotal} cards</p>
              <button
                onClick={() => handleImportSet(set.id)}
                disabled={importingSetId === set.id}
              >
                {importingSetId === set.id ? 'Importing...' : 'Import All'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

## Popular Sets to Import

| Set ID | Name | Year | Cards |
|--------|------|------|-------|
| sv1 | Scarlet & Violet | 2023 | 220 |
| sv2 | Paldea Evolved | 2023 | 235 |
| sv3 | Obsidian Flames | 2023 | 230 |
| sv4pt | Paradox Rift | 2023 | 182 |
| sv4 | Crown Zenith | 2024 | 230 |

## API Response Examples

### Cards Array Item
```json
{
  "id": "sv1-1",
  "name": "Sprigatito",
  "hp": 40,
  "types": ["Grass"],
  "rarity": "Common",
  "image": {
    "small": "...",
    "high": "https://images.pokemontcg.io/sv1/1/high.png"
  },
  "attacks": [...],
  "abilities": [...]
}
```

## Error Handling

```javascript
try {
  const cards = await tcgdexAPI.getCardsBySet('sv1')
} catch (err) {
  if (err.response?.status === 404) {
    console.error('Set not found')
  } else if (err.response?.status === 429) {
    console.error('Rate limited - wait before retrying')
  } else {
    console.error('Network error:', err.message)
  }
}
```

## Rate Limiting

TCGdex API has no strict rate limits, but practice good citizenship:
- Don't make thousands of requests per minute
- Cache responses when possible
- Don't continuously refresh data

## Image URLs

Cards include image URLs. Example:
```
https://images.pokemontcg.io/sv1/1/high.png
```

These URLs are stable and can be used directly in your store.

## Custom Pricing Strategy

When importing, apply different pricing tiers:

```javascript
const getPriceByRarity = (rarity) => {
  const priceMap = {
    'Common': 9.99,
    'Uncommon': 14.99,
    'Rare': 24.99,
    'Rare Holo': 34.99,
    'Rare Holo V': 49.99,
    'Rare Holo VSTAR': 59.99,
    'Rare Holo VMax': 64.99,
  }
  return priceMap[rarity] || 19.99
}
```

## Next Steps

1. Create the `tcgdexImporter.js` file
2. Add import section to Admin panel
3. Start importing your favorite sets!
4. Adjust pricing and stock as needed

For more TCGdex API docs: https://tcgdex.dev/docs
