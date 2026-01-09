/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { logger } from '../utils/logger';
import { LocalDiscoveryInfo, TeamMember } from '../types/team';

/**
 * Local Discovery Service using mDNS
 * Discovers peers on the same local network without requiring a signaling server
 */
export class LocalDiscoveryService {
  private isAdvertising: boolean = false;
  private discoveredPeers: Map<string, LocalDiscoveryInfo> = new Map();
  private onPeerFoundHandlers: ((peer: LocalDiscoveryInfo) => void)[] = [];
  private onPeerLostHandlers: ((peerId: string) => void)[] = [];
  private advertisementInterval: NodeJS.Timer | null = null;
  private discoveryInterval: NodeJS.Timer | null = null;

  // Simulated local peer registry (in real implementation, would use mDNS library)
  private localRegistry: Map<string, LocalDiscoveryInfo> = new Map();

  /**
   * Start advertising this peer on the local network
   */
  async startAdvertising(advertisementInfo: LocalDiscoveryInfo, intervalMs: number = 5000): Promise<void> {
    if (this.isAdvertising) {
      logger.warn('[LocalDiscovery] Already advertising');
      return;
    }

    try {
      // Register in local registry (simulated mDNS)
      this.localRegistry.set(advertisementInfo.peerId, advertisementInfo);

      // Update advertisement periodically
      this.advertisementInterval = setInterval(() => {
        const updated = {
          ...advertisementInfo,
          timestamp: Date.now(),
        };
        this.localRegistry.set(advertisementInfo.peerId, updated);
      }, intervalMs);

      this.isAdvertising = true;
      logger.info(
        `[LocalDiscovery] Started advertising ${advertisementInfo.name} at ${advertisementInfo.networkAddress}:${advertisementInfo.port}`,
      );
    } catch (error) {
      logger.error('[LocalDiscovery] Failed to start advertising', error);
      throw error;
    }
  }

  /**
   * Stop advertising this peer
   */
  async stopAdvertising(): Promise<void> {
    if (!this.isAdvertising) {
      return;
    }

    if (this.advertisementInterval) {
      clearInterval(this.advertisementInterval as any);
      this.advertisementInterval = null;
    }

    this.isAdvertising = false;
    logger.info('[LocalDiscovery] Stopped advertising');
  }

  /**
   * Start discovering peers on the local network
   */
  async startDiscovery(teamId: string, intervalMs: number = 3000): Promise<void> {
    if (this.discoveryInterval) {
      logger.warn('[LocalDiscovery] Already discovering');
      return;
    }

    try {
      // Initial discovery
      await this.discoverPeers(teamId);

      // Periodic discovery
      this.discoveryInterval = setInterval(() => {
        this.discoverPeers(teamId).catch((error) => {
          logger.error('[LocalDiscovery] Discovery error', error);
        });
      }, intervalMs);

      logger.info(`[LocalDiscovery] Started discovering peers for team ${teamId}`);
    } catch (error) {
      logger.error('[LocalDiscovery] Failed to start discovery', error);
      throw error;
    }
  }

  /**
   * Stop discovering peers
   */
  async stopDiscovery(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval as any);
      this.discoveryInterval = null;
    }

    logger.info('[LocalDiscovery] Stopped discovering');
  }

  /**
   * Discover peers on the local network
   */
  private async discoverPeers(teamId: string): Promise<void> {
    try {
      // Scan for peers in local registry (simulated mDNS)
      for (const [peerId, peerInfo] of this.localRegistry) {
        // Only discover peers in same team
        if (peerInfo.teamId !== teamId) {
          continue;
        }

        // Check if peer is still active (within last 30 seconds)
        const now = Date.now();
        const timeSinceUpdate = now - peerInfo.timestamp;

        if (timeSinceUpdate > 30000) {
          // Peer is stale, remove it
          this.discoveredPeers.delete(peerId);
          this.onPeerLostHandlers.forEach((handler) => {
            handler(peerId);
          });
          continue;
        }

        // New peer discovered
        if (!this.discoveredPeers.has(peerId)) {
          this.discoveredPeers.set(peerId, peerInfo);
          logger.info(
            `[LocalDiscovery] Discovered peer ${peerInfo.name} (${peerInfo.networkAddress}:${peerInfo.port})`,
          );

          this.onPeerFoundHandlers.forEach((handler) => {
            handler(peerInfo);
          });
        }
      }
    } catch (error) {
      logger.error('[LocalDiscovery] Error during discovery', error);
    }
  }

  /**
   * Get discovered peers
   */
  getDiscoveredPeers(): LocalDiscoveryInfo[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Get discovered peer by ID
   */
  getDiscoveredPeer(peerId: string): LocalDiscoveryInfo | undefined {
    return this.discoveredPeers.get(peerId);
  }

  /**
   * Register event handler - on peer found
   */
  onPeerFound(handler: (peer: LocalDiscoveryInfo) => void): void {
    this.onPeerFoundHandlers.push(handler);
  }

  /**
   * Register event handler - on peer lost
   */
  onPeerLost(handler: (peerId: string) => void): void {
    this.onPeerLostHandlers.push(handler);
  }

  /**
   * Manually add discovered peer (for testing or manual connection)
   */
  addDiscoveredPeer(peerInfo: LocalDiscoveryInfo): void {
    this.discoveredPeers.set(peerInfo.peerId, peerInfo);
    logger.info(`[LocalDiscovery] Manually added peer ${peerInfo.name}`);

    this.onPeerFoundHandlers.forEach((handler) => {
      handler(peerInfo);
    });
  }

  /**
   * Manually remove discovered peer
   */
  removeDiscoveredPeer(peerId: string): void {
    this.discoveredPeers.delete(peerId);
    logger.info(`[LocalDiscovery] Manually removed peer ${peerId}`);

    this.onPeerLostHandlers.forEach((handler) => {
      handler(peerId);
    });
  }

  /**
   * Clear all discovered peers
   */
  clearDiscoveredPeers(): void {
    for (const peerId of this.discoveredPeers.keys()) {
      this.onPeerLostHandlers.forEach((handler) => {
        handler(peerId);
      });
    }
    this.discoveredPeers.clear();
    logger.info('[LocalDiscovery] Cleared all discovered peers');
  }

  /**
   * Get is advertising
   */
  getIsAdvertising(): boolean {
    return this.isAdvertising;
  }

  /**
   * Get discovery status
   */
  getIsDiscovering(): boolean {
    return this.discoveryInterval !== null;
  }
}

// Export singleton instance
export const localDiscoveryService = new LocalDiscoveryService();
