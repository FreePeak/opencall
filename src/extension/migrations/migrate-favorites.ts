import * as vscode from 'vscode';
import { logger } from '../../utils/logger';
import { CollectionManager } from '../../core/collection-manager';
import { Request } from '../../types';

/**
 * Migrate userFavorites from GlobalState to Collections with isFavorite flag
 * @param context - Extension context
 * @param collectionManager - Collection manager instance
 * @returns Migration success boolean
 */
export async function migrateFavoritesToCollections(
  context: vscode.ExtensionContext,
  collectionManager: CollectionManager
): Promise<boolean> {
  const MIGRATION_KEY = 'opencall.favoriteMigrated';
  
  // Check if already migrated
  const alreadyMigrated = context.globalState.get<boolean>(MIGRATION_KEY, false);
  if (alreadyMigrated) {
    logger.info('[Migration] Favorites already migrated, skipping');
    return true;
  }
  
  logger.info('[Migration] Starting favorites migration');
  
  try {
    // Get existing favorites
    const userFavorites = context.globalState.get<any[]>('userFavorites', []);
    
    if (userFavorites.length === 0) {
      logger.info('[Migration] No favorites to migrate');
      await context.globalState.update(MIGRATION_KEY, true);
      return true;
    }
    
    logger.info('[Migration] Found favorites to migrate', { count: userFavorites.length });
    
    // Create "Favorites" collection if doesn't exist
    const allCollections = collectionManager.getAllCollections();
    let favoritesCollection = allCollections.find(c => c.name === '⭐ Favorites' && !c.parentId);
    
    if (!favoritesCollection) {
      favoritesCollection = await collectionManager.createCollection(
        '⭐ Favorites',
        'Auto-migrated favorites from previous version'
      );
      logger.info('[Migration] Created Favorites collection', { id: favoritesCollection.id });
    }
    
    // Migrate each favorite
    let migratedCount = 0;
    for (const fav of userFavorites) {
      try {
        const request: Request = {
          id: fav.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: fav.url || 'Unnamed Request',
          url: fav.url || '',
          method: fav.method || 'GET',
          headers: fav.headers || [],
          isFavorite: true,
          lastAccessedAt: fav.favoritedTime ? new Date(fav.favoritedTime) : new Date(),
          body: fav.requestObject?.body,
          params: fav.requestObject?.params,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await collectionManager.addRequestToCollection(favoritesCollection.id, request);
        migratedCount++;
      } catch (error) {
        logger.error('[Migration] Failed to migrate favorite', error);
      }
    }
    
    logger.info('[Migration] Migration completed', { migratedCount, total: userFavorites.length });
    
    // Backup original favorites (don't delete immediately)
    await context.globalState.update('userFavorites_backup', userFavorites);
    
    // Mark migration as complete
    await context.globalState.update(MIGRATION_KEY, true);
    
    // Show success message
    if (migratedCount > 0) {
      vscode.window.showInformationMessage(
        `OpenCall: Migrated ${migratedCount} favorites to Collections tab.`
      );
    }
    
    return true;
  } catch (error) {
    logger.error('[Migration] Migration failed', error);
    vscode.window.showErrorMessage('OpenCall: Failed to migrate favorites. Please contact support.');
    return false;
  }
}
