/**
 * Identity Resolution Engine
 * Resolves subjects across current identity records, historical audit logs,
 * email changes, phone changes, name changes, and stable user IDs.
 */
import { UserIdentity, UserAuditLog } from '../types';

export class IdentityResolver {
  private emailToUserId: Map<string, string> = new Map();
  private phoneToUserId: Map<string, string> = new Map();
  private nameToUserId: Map<string, string> = new Map();
  private userIdToIdentity: Map<string, UserIdentity> = new Map();
  private userAllEmails: Map<string, Set<string>> = new Map();
  private userAllPhones: Map<string, Set<string>> = new Map();
  private userAllNames: Map<string, Set<string>> = new Map();
  private userAuditEvents: Map<string, UserAuditLog[]> = new Map();

  constructor(identities: UserIdentity[], auditLogs: UserAuditLog[]) {
    this.buildGraph(identities, auditLogs);
  }

  private buildGraph(identities: UserIdentity[], auditLogs: UserAuditLog[]) {
    // 1. Ingest current identities
    for (const id of identities) {
      const uid = id.user_id;
      this.userIdToIdentity.set(uid, { ...id });

      const email = id.email?.trim().toLowerCase();
      if (email) {
        this.emailToUserId.set(email, uid);
        if (!this.userAllEmails.has(uid)) this.userAllEmails.set(uid, new Set());
        this.userAllEmails.get(uid)!.add(email);
      }

      const phone = id.phone?.trim();
      if (phone) {
        this.phoneToUserId.set(phone, uid);
        if (!this.userAllPhones.has(uid)) this.userAllPhones.set(uid, new Set());
        this.userAllPhones.get(uid)!.add(phone);
      }

      const name = id.name?.trim().toLowerCase();
      if (name) {
        this.nameToUserId.set(name, uid);
        if (!this.userAllNames.has(uid)) this.userAllNames.set(uid, new Set());
        this.userAllNames.get(uid)!.add(name);
      }
    }

    // 2. Ingest historical audit logs
    for (const log of auditLogs) {
      const uid = log.user_id;
      if (!this.userAuditEvents.has(uid)) {
        this.userAuditEvents.set(uid, []);
      }
      this.userAuditEvents.get(uid)!.push(log);

      if (log.field_name === 'email') {
        const oldEmail = log.old_value?.trim().toLowerCase();
        const newEmail = log.new_value?.trim().toLowerCase();
        if (oldEmail) {
          this.emailToUserId.set(oldEmail, uid);
          if (!this.userAllEmails.has(uid)) this.userAllEmails.set(uid, new Set());
          this.userAllEmails.get(uid)!.add(oldEmail);
        }
        if (newEmail) {
          this.emailToUserId.set(newEmail, uid);
          if (!this.userAllEmails.has(uid)) this.userAllEmails.set(uid, new Set());
          this.userAllEmails.get(uid)!.add(newEmail);
        }
      } else if (log.field_name === 'phone') {
        const oldPhone = log.old_value?.trim();
        const newPhone = log.new_value?.trim();
        if (oldPhone) {
          this.phoneToUserId.set(oldPhone, uid);
          if (!this.userAllPhones.has(uid)) this.userAllPhones.set(uid, new Set());
          this.userAllPhones.get(uid)!.add(oldPhone);
        }
        if (newPhone) {
          this.phoneToUserId.set(newPhone, uid);
          if (!this.userAllPhones.has(uid)) this.userAllPhones.set(uid, new Set());
          this.userAllPhones.get(uid)!.add(newPhone);
        }
      } else if (log.field_name === 'name') {
        const oldName = log.old_value?.trim().toLowerCase();
        const newName = log.new_value?.trim().toLowerCase();
        if (oldName) {
          this.nameToUserId.set(oldName, uid);
          if (!this.userAllNames.has(uid)) this.userAllNames.set(uid, new Set());
          this.userAllNames.get(uid)!.add(oldName);
        }
        if (newName) {
          this.nameToUserId.set(newName, uid);
          if (!this.userAllNames.has(uid)) this.userAllNames.set(uid, new Set());
          this.userAllNames.get(uid)!.add(newName);
        }
      }
    }

    // Update enriched fields on identity objects
    for (const [uid, identity] of this.userIdToIdentity.entries()) {
      identity.historical_emails = Array.from(this.userAllEmails.get(uid) || []);
      identity.historical_phones = Array.from(this.userAllPhones.get(uid) || []);
      identity.historical_names = Array.from(this.userAllNames.get(uid) || []);
    }
  }

  public resolveByEmail(email: string): UserIdentity | undefined {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    const uid = this.emailToUserId.get(cleanEmail);
    if (!uid) return undefined;
    return this.userIdToIdentity.get(uid);
  }

  public resolveByUserId(userId: string): UserIdentity | undefined {
    if (!userId) return undefined;
    return this.userIdToIdentity.get(userId.trim());
  }

  public getAllKnownEmails(userId: string): string[] {
    const set = this.userAllEmails.get(userId);
    return set ? Array.from(set) : [];
  }

  public getAllKnownPhones(userId: string): string[] {
    const set = this.userAllPhones.get(userId);
    return set ? Array.from(set) : [];
  }

  public getAllKnownNames(userId: string): string[] {
    const set = this.userAllNames.get(userId);
    return set ? Array.from(set) : [];
  }

  public getAuditEvents(userId: string): UserAuditLog[] {
    return this.userAuditEvents.get(userId) || [];
  }

  public doesSubjectMatch(userId: string, candidate: string): boolean {
    if (!candidate || !userId) return false;
    const clean = candidate.trim().toLowerCase();
    if (userId.toLowerCase() === clean) return true;
    if (this.userAllEmails.get(userId)?.has(clean)) return true;
    if (this.userAllPhones.get(userId)?.has(candidate.trim())) return true;
    if (this.userAllNames.get(userId)?.has(clean)) return true;
    return false;
  }
}
