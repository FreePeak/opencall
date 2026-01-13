import { RequestManager } from "../core/request-manager";
import { CollectionManager } from "../core/collection-manager";
import { EnvironmentManager } from "../core/environment-manager";
import { TeamManager } from "../core/team-manager";
import { P2PSyncService } from "../core/p2p-sync-service";
import { LocalDiscoveryService } from "../core/local-discovery-service";
import { StorageManager } from "../storage/storage-manager";

/**
 * Service Registry
 * Provides access to all core services throughout the extension
 */
class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;

  private requestManager: RequestManager | null = null;
  private collectionManager: CollectionManager | null = null;
  private environmentManager: EnvironmentManager | null = null;
  private teamManager: TeamManager | null = null;
  private p2pSyncService: P2PSyncService | null = null;
  private localDiscoveryService: LocalDiscoveryService | null = null;
  private storageManager: StorageManager | null = null;

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  registerRequestManager(manager: RequestManager): void {
    this.requestManager = manager;
  }

  registerCollectionManager(manager: CollectionManager): void {
    this.collectionManager = manager;
  }

  registerEnvironmentManager(manager: EnvironmentManager): void {
    this.environmentManager = manager;
  }

  registerTeamManager(manager: TeamManager): void {
    this.teamManager = manager;
  }

  registerP2PSyncService(service: P2PSyncService): void {
    this.p2pSyncService = service;
  }

  registerLocalDiscoveryService(service: LocalDiscoveryService): void {
    this.localDiscoveryService = service;
  }

  registerStorageManager(manager: StorageManager): void {
    this.storageManager = manager;
  }

  getRequestManager(): RequestManager {
    if (!this.requestManager) {
      throw new Error('RequestManager not initialized');
    }
    return this.requestManager;
  }

  getCollectionManager(): CollectionManager {
    if (!this.collectionManager) {
      throw new Error('CollectionManager not initialized');
    }
    return this.collectionManager;
  }

  getEnvironmentManager(): EnvironmentManager {
    if (!this.environmentManager) {
      throw new Error('EnvironmentManager not initialized');
    }
    return this.environmentManager;
  }

  getTeamManager(): TeamManager {
    if (!this.teamManager) {
      throw new Error('TeamManager not initialized');
    }
    return this.teamManager;
  }

  getP2PSyncService(): P2PSyncService {
    if (!this.p2pSyncService) {
      throw new Error('P2PSyncService not initialized');
    }
    return this.p2pSyncService;
  }

  getLocalDiscoveryService(): LocalDiscoveryService {
    if (!this.localDiscoveryService) {
      throw new Error('LocalDiscoveryService not initialized');
    }
    return this.localDiscoveryService;
  }

  getStorageManager(): StorageManager {
    if (!this.storageManager) {
      throw new Error('StorageManager not initialized');
    }
    return this.storageManager;
  }
}

export default ServiceRegistry;
