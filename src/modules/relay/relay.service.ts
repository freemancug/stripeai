import type { RelayChatRequest } from './relay.schema.js';
import { ProviderRegistry } from '../providers/provider-registry.js';

export class RelayService {
  constructor(private readonly providerRegistry = new ProviderRegistry()) {}

  relayChat(request: RelayChatRequest) {
    const adapter = this.providerRegistry.resolve(request.provider, request.model);
    return adapter.relay(request);
  }

  listProviders() {
    return this.providerRegistry.list();
  }
}
