export interface ZortOutConfig {
  apiKey: string
  apiUrl: string
}

export class ZortOutService {
  private config: ZortOutConfig | null = null

  setConfig(config: ZortOutConfig) {
    this.config = config
  }

  async syncInventory() {
    if (!this.config) {
      throw new Error('ZortOut not configured')
    }

    console.log('Syncing inventory with ZortOut...')
  }

  async getProducts() {
    if (!this.config) {
      throw new Error('ZortOut not configured')
    }

    console.log('Fetching products from ZortOut...')
    return []
  }
}

export const zortOutService = new ZortOutService()
