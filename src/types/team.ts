/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Team Management Types
 * Handles team collaboration features including members, roles, and permissions
 */

export type TeamRole = 'admin' | 'lead' | 'member';

export interface TeamMember {
  // Identifiers
  id: string;                    // Unique member ID (UUID)
  name: string;                  // Member display name
  email?: string;                // Member email address
  peerId?: string;               // WebRTC peer ID for P2P connections

  // Role and permissions
  role: TeamRole;                // Member role (admin, lead, member)
  joinedAt: Date;                // When member joined the team
  lastActive?: Date;             // Last activity timestamp

  // P2P Connection state
  isOnline?: boolean;            // Current online status
  networkAddress?: string;       // Local network IP address (for mDNS discovery)
  port?: number;                 // Network port for P2P connection

  // Metadata
  avatarColor?: string;          // Avatar display color
  metadata?: Record<string, any>; // Additional metadata
}

export interface Team {
  // Identifiers
  id: string;                    // Team ID (UUID)
  name: string;                  // Team name
  description?: string;          // Team description

  // Members
  members: TeamMember[];         // Team members
  adminId: string;               // Primary admin ID
  leadIds: string[];             // Team lead IDs (can add/remove members)

  // Shared resources
  sharedCollectionIds: string[]; // Collections shared with team
  sharedEnvironmentIds: string[];// Environments shared with team

  // P2P Configuration
  p2pEnabled: boolean;           // Enable P2P synchronization
  mdnsEnabled: boolean;          // Enable mDNS for local discovery
  syncInterval?: number;         // Sync interval in milliseconds (default: 5000)

  // Metadata
  createdAt: Date;               // Team creation timestamp
  updatedAt: Date;               // Last update timestamp
  isActive: boolean;             // Team active status
}

export interface TeamPermissions {
  canAddMembers: boolean;        // Can add new members
  canRemoveMembers: boolean;     // Can remove members
  canEditTeam: boolean;          // Can edit team settings
  canShareCollections: boolean;  // Can share collections
  canShareEnvironments: boolean; // Can share environments
  canManageRoles: boolean;       // Can change member roles
}

export interface SyncConflict {
  id: string;                    // Conflict ID
  resourceId: string;            // Resource with conflict
  resourceType: 'collection' | 'environment' | 'request';
  localVersion: any;             // Local version of resource
  remoteVersion: any;            // Remote version of resource
  conflictTime: Date;            // When conflict occurred
  resolvedBy?: string;           // Member who resolved conflict
  resolutionTime?: Date;         // When conflict was resolved
}

export interface P2PMessage {
  id: string;                    // Message ID
  from: string;                  // Sender peer ID
  to: string;                    // Recipient peer ID
  type: 'sync' | 'request' | 'response' | 'heartbeat';
  action: 'create' | 'update' | 'delete';
  resourceType: 'collection' | 'environment' | 'request' | 'team';
  resource: any;                 // The actual resource data
  timestamp: number;             // Message timestamp
  version: number;               // Version number for conflict resolution
}

export interface LocalDiscoveryInfo {
  peerId: string;                // Peer ID
  teamId: string;                // Team ID
  name: string;                  // Peer name
  networkAddress: string;        // IP address
  port: number;                  // Listening port
  version: string;               // OpenCall version
  timestamp: number;             // Advertisement timestamp
}
