import axios from 'axios'

const API_URL = import.meta.env.VITE_TCGDEX_API_URL || 'https://api.tcgdex.net/v1'

const tcgdexClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

export const tcgdexAPI = {
  // Get all sets
  getSets: async () => {
    try {
      const response = await tcgdexClient.get('/sets')
      return response.data
    } catch (error) {
      console.error('Error fetching sets:', error)
      throw error
    }
  },

  // Get set by ID
  getSet: async (setId) => {
    try {
      const response = await tcgdexClient.get(`/sets/${setId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching set:', error)
      throw error
    }
  },

  // Get cards by set ID
  getCardsBySet: async (setId) => {
    try {
      const response = await tcgdexClient.get(`/sets/${setId}/cards`)
      return response.data
    } catch (error) {
      console.error('Error fetching cards:', error)
      throw error
    }
  },

  // Get card by ID
  getCard: async (cardId) => {
    try {
      const response = await tcgdexClient.get(`/cards/${cardId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching card:', error)
      throw error
    }
  },

  // Search cards
  searchCards: async (query) => {
    try {
      const response = await tcgdexClient.get('/cards', {
        params: { q: query },
      })
      return response.data
    } catch (error) {
      console.error('Error searching cards:', error)
      throw error
    }
  },
}
