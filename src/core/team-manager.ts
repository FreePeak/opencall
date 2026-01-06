import { v4 as uuidv4 } from 'uuid';
import { Team, TeamMember, TeamRole, TeamPermissions } from '../types/team';
import { logger } from '../utils/logger';

/**
 * Team Management Service
 * Manages team creation, member management, and permission control
 */
export class TeamManager {
  private teams: Map<string, Team> = new Map();
  private currentTeamId: string | null = null;

  /**
   * Create a new team
   */
  async createTeam(name: string, description?: string, adminId?: string): Promise<Team> {
    const id = uuidv4();
    const actualAdminId = adminId || uuidv4();

    const team: Team = {
      id,
      name,
      description,
      members: [
        {
          id: actualAdminId,
          name: 'Team Admin',
          role: 'admin',
          joinedAt: new Date(),
          isOnline: true,
        },
      ],
      adminId: actualAdminId,
      leadIds: [actualAdminId],
      sharedCollectionIds: [],
      sharedEnvironmentIds: [],
      p2pEnabled: true,
      mdnsEnabled: true,
      syncInterval: 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.teams.set(id, team);
    this.currentTeamId = id;

    logger.info(`[TeamManager] Created team: ${name} (${id})`);
    return team;
  }

  /**
   * Add member to team (only admin/lead can do this)
   */
  async addMember(
    teamId: string,
    name: string,
    email?: string,
    role: TeamRole = 'member',
  ): Promise<TeamMember> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    // Check if member already exists
    if (team.members.some((m) => m.email === email && email)) {
      throw new Error(`Member with email ${email} already exists`);
    }

    const memberId = uuidv4();
    const member: TeamMember = {
      id: memberId,
      name,
      email,
      role,
      joinedAt: new Date(),
      isOnline: false,
    };

    team.members.push(member);
    team.updatedAt = new Date();

    // If adding lead, add to leadIds
    if (role === 'lead' && !team.leadIds.includes(memberId)) {
      team.leadIds.push(memberId);
    }

    logger.info(`[TeamManager] Added member ${name} to team ${teamId}`);
    return member;
  }

  /**
   * Remove member from team (only admin/lead can do this)
   */
  async removeMember(teamId: string, memberId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    const memberIndex = team.members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Don't allow removing the sole admin
    const admins = team.members.filter((m) => m.role === 'admin');
    if (admins.length === 1 && team.members[memberIndex].role === 'admin') {
      throw new Error('Cannot remove the only admin from team');
    }

    const removedMember = team.members[memberIndex];
    team.members.splice(memberIndex, 1);

    // Remove from leadIds if applicable
    const leadIndex = team.leadIds.indexOf(memberId);
    if (leadIndex !== -1) {
      team.leadIds.splice(leadIndex, 1);
    }

    team.updatedAt = new Date();

    logger.info(`[TeamManager] Removed member ${memberId} from team ${teamId}`);
  }

  /**
   * Update member role (only admin can do this)
   */
  async updateMemberRole(teamId: string, memberId: string, newRole: TeamRole): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    const member = team.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Member not found: ${memberId}`);
    }

    // Update lead IDs
    const leadIndex = team.leadIds.indexOf(memberId);
    if (newRole === 'lead' && leadIndex === -1) {
      team.leadIds.push(memberId);
    } else if (newRole !== 'lead' && leadIndex !== -1) {
      team.leadIds.splice(leadIndex, 1);
    }

    member.role = newRole;
    team.updatedAt = new Date();

    logger.info(`[TeamManager] Updated member ${memberId} role to ${newRole}`);
  }

  /**
   * Get team by ID
   */
  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  /**
   * Get current team
   */
  getCurrentTeam(): Team | undefined {
    if (!this.currentTeamId) return undefined;
    return this.teams.get(this.currentTeamId);
  }

  /**
   * Set current team
   */
  setCurrentTeam(teamId: string): void {
    if (!this.teams.has(teamId)) {
      throw new Error(`Team not found: ${teamId}`);
    }
    this.currentTeamId = teamId;
  }

  /**
   * Get all teams
   */
  getAllTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  /**
   * Get team member
   */
  getTeamMember(teamId: string, memberId: string): TeamMember | undefined {
    const team = this.teams.get(teamId);
    if (!team) return undefined;
    return team.members.find((m) => m.id === memberId);
  }

  /**
   * Get all team members
   */
  getTeamMembers(teamId: string): TeamMember[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    return team.members;
  }

  /**
   * Get member permissions
   */
  getMemberPermissions(teamId: string, memberId: string): TeamPermissions {
    const team = this.teams.get(teamId);
    if (!team) {
      return {
        canAddMembers: false,
        canRemoveMembers: false,
        canEditTeam: false,
        canShareCollections: false,
        canShareEnvironments: false,
        canManageRoles: false,
      };
    }

    const member = team.members.find((m) => m.id === memberId);
    if (!member) {
      return {
        canAddMembers: false,
        canRemoveMembers: false,
        canEditTeam: false,
        canShareCollections: false,
        canShareEnvironments: false,
        canManageRoles: false,
      };
    }

    const isAdmin = member.role === 'admin';
    const isLead = member.role === 'lead' || isAdmin;

    return {
      canAddMembers: isLead,
      canRemoveMembers: isLead,
      canEditTeam: isAdmin,
      canShareCollections: true, // All members can share
      canShareEnvironments: true, // All members can share
      canManageRoles: isAdmin,
    };
  }

  /**
   * Share collection with team
   */
  async shareCollection(teamId: string, collectionId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    if (!team.sharedCollectionIds.includes(collectionId)) {
      team.sharedCollectionIds.push(collectionId);
      team.updatedAt = new Date();
    }

    logger.info(`[TeamManager] Shared collection ${collectionId} with team ${teamId}`);
  }

  /**
   * Share environment with team
   */
  async shareEnvironment(teamId: string, environmentId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }

    if (!team.sharedEnvironmentIds.includes(environmentId)) {
      team.sharedEnvironmentIds.push(environmentId);
      team.updatedAt = new Date();
    }

    logger.info(`[TeamManager] Shared environment ${environmentId} with team ${teamId}`);
  }

  /**
   * Update member online status
   */
  updateMemberStatus(teamId: string, memberId: string, isOnline: boolean, networkAddress?: string, port?: number): void {
    const member = this.getTeamMember(teamId, memberId);
    if (!member) return;

    member.isOnline = isOnline;
    member.lastActive = new Date();

    if (networkAddress) {
      member.networkAddress = networkAddress;
    }
    if (port) {
      member.port = port;
    }

    const team = this.getTeam(teamId);
    if (team) {
      team.updatedAt = new Date();
    }
  }

  /**
   * Get online members
   */
  getOnlineMembers(teamId: string): TeamMember[] {
    const team = this.teams.get(teamId);
    if (!team) return [];
    return team.members.filter((m) => m.isOnline);
  }
}

// Export singleton instance
export const teamManager = new TeamManager();
