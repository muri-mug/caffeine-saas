import type { PosProvider, ProviderConfig } from '@sarta/shared';
import { LoyverseProvider } from './loyverse/loyverse.provider.js';

type ProviderBuilder = (config: ProviderConfig) => PosProvider;

export class ProviderRegistry {
  private static builders: Map<string, ProviderBuilder> = new Map();

  static register(providerId: string, builder: ProviderBuilder): void {
    this.builders.set(providerId, builder);
  }

  static build(providerId: string, config: ProviderConfig): PosProvider {
    const builder = this.builders.get(providerId);
    if (!builder) throw new Error(`Provider "${providerId}" não registrado`);
    return builder(config);
  }

  static listAvailable(): string[] {
    return Array.from(this.builders.keys());
  }

  static isRegistered(providerId: string): boolean {
    return this.builders.has(providerId);
  }
}

// ── Registro dos providers disponíveis ───────────────────────────────────────
ProviderRegistry.register('loyverse', (config) => new LoyverseProvider(config));
// ProviderRegistry.register('square', (config) => new SquareProvider(config));  // V2
// ProviderRegistry.register('ifood',  (config) => new IFoodProvider(config));   // V2
