import { v4 as uuidv4 } from 'uuid';
import { Team, TeamMember, P2PMessage, SyncConflict, LocalDiscoveryInfo } from '../types/team';
import { logger } from '../utils/logger';

/**
 * P2P Synchronization Service
 * Handles real-time data synchronization between team members over local network
 * Uses WebRTC for direct peer connections and mDNS for local discovery
 */
export class P2PSyncService {
  private peerId: string;
  private teamId: string | null = null;
  private connectedPeers: Map<string, any> = new Map();
  private messageQueue: P2PMessage[] = [];
  private syncConflicts: Map<string, SyncConflict> = new Map();
  private localAdvertisement: LocalDiscoveryInfo | null = null;

  // Event handlers
  private onMessageHandlers: ((message: P2PMessage) => void)[] = [];
  private onPeerConnectedHandlers: ((peerId: string, member: TeamMember) => void)[] = [];
  private onPeerDisconnectedHandlers: ((peerId: string) => void)[] = [];
  private onConflictHandlers: ((conflict: SyncConflict) => void)[] = [];

  constructor() {
    this.peerId = uuidv4();
    logger.info(`[P2PSync] Initialized with peer ID: ${this.peerId}`);
  }

  /**
   * Initialize P2P synchronization for a team
   */
  async initialize(team: Team, localAddress: string, port: number): Promise<void> {
    this.teamId = team.id;

    // Setup local advertisement for mDNS discovery
    if (team.mdnsEnabled) {
      this.localAdvertisement = {
        peerId: this.peerId,
        teamId: team.id,
        name: team.name,
        networkAddress: localAddress,
        port,
        version: '1.0.0',
        timestamp: Date.now(),
      };

      logger.info(
        `[P2PSync] Setup mDNS advertisement: ${team.name} at ${localAddress}:${port}`,
      );
    }

    logger.info(`[P2PSync] Initialized for team ${team.id}`);
  }

  /**
   * Connect to a peer
   */
  async connectToPeer(peerId: string, networkAddress: string, port: number): Promise<void> {
    try {
      if (this.connectedPeers.has(peerId)) {
        logger.warn(`[P2PSync] Already connected to peer ${peerId}`);
        return;
      }

      // WebRTC connection setup would happen here
      // For now, we'll simulate the connection
      this.connectedPeers.set(peerId, {
        peerId,
        address: networkAddress,
        port,
        connectedAt: new Date(),
        isActive: true,
      });

      logger.info(`[P2PSync] Connected to peer ${peerId} at ${networkAddress}:${port}`);

      // Notify handlers
      this.onPeerConnectedHandlers.forEach((handler) => {
        handler(peerId, {
          id: peerId,
          name: `Peer ${peerId.substring(0, 8)}`,
          role: 'member',
          joinedAt: new Date(),
          isOnline: true,
          networkAddress,
          port,
        });
      });

      // Send initial sync request
      await this.requestFullSync(peerId);
    } catch (error) {
      logger.error(`[P2PSync] Failed to connect to peer ${peerId}`, error);
    }
  }

  /**
   * Disconnect from a peer
   */
  async disconnectFromPeer(peerId: string): Promise<void> {
    if (!this.connectedPeers.has(peerId)) {
      return;
    }

    this.connectedPeers.delete(peerId);
    logger.info(`[P2PSync] Disconnected from peer ${peerId}`);

    // Notify handlers
    this.onPeerDisconnectedHandlers.forEach((handler) => {
      handler(peerId);
    });
  }

  /**
   * Send a message to a peer
   */
  async sendMessage(peerId: string, message: Omit<P2PMessage, 'id' | 'from' | 'timestamp'>): Promise<void> {
    if (!this.connectedPeers.has(peerId)) {
      logger.warn(`[P2PSync] Peer not connected: ${peerId}, queuing message`);
      this.messageQueue.push({
        ...message,
        id: uuidv4(),
        from: this.peerId,
        to: peerId,
        timestamp: Date.now(),
      });
      return;
    }

    const p2pMessage: P2PMessage = {
      ...message,
      id: uuidv4(),
      from: this.peerId,
      to: peerId,
      timestamp: Date.now(),
    };

    try {
      // Send via WebRTC (simulated here)
      logger.debug(`[P2PSync] Sending ${message.type} message to ${peerId}`);

      // Notify local handlers
      this.onMessageHandlers.forEach((handler) => {
        handler(p2pMessage);
      });
    } catch (error) {
      logger.error(`[P2PSync] Failed to send message to ${peerId}`, error);
      this.messageQueue.push(p2pMessage);
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  async broadcastMessage(message: Omit<P2PMessage, 'id' | 'from' | 'timestamp' | 'to'>): Promise<void> {
    const promises = Array.from(this.connectedPeers.keys()).map((peerId) =>
      this.sendMessage(peerId, {
        ...message,
        to: peerId,
      } as any),
    );

    await Promise.all(promises);
    logger.info(`[P2PSync] Broadcasted ${message.type} message to ${promises.length} peers`);
  }

  /**
   * Request full sync from a peer
   */
  async requestFullSync(peerId: string): Promise<void> {
    await this.sendMessage(peerId, {
      type: 'request',
      action: 'create',
      resourceType: 'team',
      resource: { action: 'fullSync' },
      version: 1,
      to: peerId,
    } as any);
  }

  /**
   * Detect and handle conflicts
   */
  detectConflict(
    resourceId: string,
    resourceType: 'collection' | 'environment' | 'request',
    localVersion: any,
    remoteVersion: any,
  ): SyncConflict {
    const conflict: SyncConflict = {
      id: uuidv4(),
      resourceId,
      resourceType,
      localVersion,
      remoteVersion,
      conflictTime: new Date(),
    };

    this.syncConflicts.set(conflict.id, conflict);

    logger.warn(`[P2PSync] Detected conflict for ${resourceType} ${resourceId}`);

    // Notify handlers
    this.onConflictHandlers.forEach((handler) => {
      handler(conflict);
    });

    return conflict;
  }

  /**
   * Resolve conflict (take local or remote version)
   */
  async resolveConflict(conflictId: string, takeLocal: boolean, memberId: string): Promise<void> {
    const conflict = this.syncConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    conflict.resolvedBy = memberId;
    conflict.resolutionTime = new Date();

    const resolution = takeLocal ? conflict.localVersion : conflict.remoteVersion;

    // Broadcast resolution to peers
    await this.broadcastMessage({
      type: 'sync',
      action: 'update',
      resourceType: conflict.resourceType,
      resource: {
        ...resolution,
        conflictId,
        resolvedBy: memberId,
      },
      version: takeLocal ? 1 : 2, // Version indicates which side won
    });

    logger.info(
      `[P2PSync] Resolved conflict ${conflictId} (took ${takeLocal ? 'local' : 'remote'})`,
    );
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): Array<{ peerId: string; address: string; port: number; connectedAt: Date }> {
    return Array.from(this.connectedPeers.values());
  }

  /**
   * Get peer connection status
   */
  getPeerStatus(peerId: string): 'connected' | 'disconnected' | 'reconnecting' {
    if (!this.connectedPeers.has(peerId)) {
      return 'disconnected';
    }
    return 'connected';
  }

  /**
   * Get sync conflicts
   */
  getConflicts(): SyncConflict[] {
    return Array.from(this.syncConflicts.values());
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): SyncConflict[] {
    return Array.from(this.syncConflicts.values()).filter((c) => !c.resolutionTime);
  }

  /**
   * Register event handler - on message received
   */
  onMessage(handler: (message: P2PMessage) => void): void {
    this.onMessageHandlers.push(handler);
  }

  /**
   * Register event handler - on peer connected
   */
  onPeerConnected(handler: (peerId: string, member: TeamMember) => void): void {
    this.onPeerConnectedHandlers.push(handler);
  }

  /**
   * Register event handler - on peer disconnected
   */
  onPeerDisconnected(handler: (peerId: string) => void): void {
    this.onPeerDisconnectedHandlers.push(handler);
  }

  /**
   * Register event handler - on conflict detected
   */
  onConflict(handler: (conflict: SyncConflict) => void): void {
    this.onConflictHandlers.push(handler);
  }

  /**
   * Get peer ID
   */
  getPeerId(): string {
    return this.peerId;
  }

  /**
   * Get local advertisement info
   */
  getLocalAdvertisement(): LocalDiscoveryInfo | null {
    return this.localAdvertisement;
  }
}

// Export singleton instance
export const p2pSyncService = new P2PSyncService();
