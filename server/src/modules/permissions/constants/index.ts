export const Resources = {
  USERS: "users",
  ROLES: "roles",
  PROJECTS: "projects",
  INVESTMENTS: "investments",
  OFFICES: "offices",
  AUDIT: "audit",
  SETTINGS: "settings",
  SUBSCRIPTIONS: "subscriptions",
  NOTIFICATIONS: "notifications",
  REPORTS: "reports",
} as const;

export type Resource = (typeof Resources)[keyof typeof Resources];

export const Actions = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  MANAGE: "manage",
} as const;

export type Action = (typeof Actions)[keyof typeof Actions];

export const Permissions = {
  // Users
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  // Roles
  ROLES_READ: "roles.read",
  ROLES_UPDATE: "roles.update",

  // Projects
  PROJECTS_READ: "projects.read",
  PROJECTS_CREATE: "projects.create",
  PROJECTS_UPDATE: "projects.update",
  PROJECTS_DELETE: "projects.delete",

  // Investments
  INVESTMENTS_READ: "investments.read",
  INVESTMENTS_CREATE: "investments.create",
  INVESTMENTS_UPDATE: "investments.update",
  INVESTMENTS_DELETE: "investments.delete",

  // Offices
  OFFICES_READ: "offices.read",
  OFFICES_CREATE: "offices.create",

  // Audit
  AUDIT_READ: "audit.read",

  // Settings
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",

  // Subscriptions
  SUBSCRIPTIONS_MANAGE: "subscriptions.manage",

  // Notifications
  NOTIFICATIONS_SEND: "notifications.send",

  // Reports
  REPORTS_READ: "reports.read",
} as const;

export type PermissionName = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS: Array<{
  name: PermissionName;
  description: string;
  resource: Resource;
  action: Action;
}> = [
  {
    name: Permissions.USERS_READ,
    description: "View users",
    resource: Resources.USERS,
    action: Actions.READ,
  },
  {
    name: Permissions.USERS_CREATE,
    description: "Create users",
    resource: Resources.USERS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.USERS_UPDATE,
    description: "Update users",
    resource: Resources.USERS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.USERS_DELETE,
    description: "Delete users",
    resource: Resources.USERS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.ROLES_READ,
    description: "View roles and permissions",
    resource: Resources.ROLES,
    action: Actions.READ,
  },
  {
    name: Permissions.ROLES_UPDATE,
    description: "Update role permissions",
    resource: Resources.ROLES,
    action: Actions.WRITE,
  },

  {
    name: Permissions.PROJECTS_READ,
    description: "View projects",
    resource: Resources.PROJECTS,
    action: Actions.READ,
  },
  {
    name: Permissions.PROJECTS_CREATE,
    description: "Create projects",
    resource: Resources.PROJECTS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.PROJECTS_UPDATE,
    description: "Update projects",
    resource: Resources.PROJECTS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.PROJECTS_DELETE,
    description: "Delete projects",
    resource: Resources.PROJECTS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.INVESTMENTS_READ,
    description: "View investments",
    resource: Resources.INVESTMENTS,
    action: Actions.READ,
  },
  {
    name: Permissions.INVESTMENTS_CREATE,
    description: "Create investments",
    resource: Resources.INVESTMENTS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.INVESTMENTS_UPDATE,
    description: "Update investments",
    resource: Resources.INVESTMENTS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.INVESTMENTS_DELETE,
    description: "Delete investments",
    resource: Resources.INVESTMENTS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.OFFICES_READ,
    description: "View offices",
    resource: Resources.OFFICES,
    action: Actions.READ,
  },
  {
    name: Permissions.OFFICES_CREATE,
    description: "Create offices",
    resource: Resources.OFFICES,
    action: Actions.WRITE,
  },

  {
    name: Permissions.AUDIT_READ,
    description: "View audit logs",
    resource: Resources.AUDIT,
    action: Actions.READ,
  },

  {
    name: Permissions.SETTINGS_READ,
    description: "View settings",
    resource: Resources.SETTINGS,
    action: Actions.READ,
  },
  {
    name: Permissions.SETTINGS_UPDATE,
    description: "Update settings",
    resource: Resources.SETTINGS,
    action: Actions.WRITE,
  },

  {
    name: Permissions.SUBSCRIPTIONS_MANAGE,
    description: "Manage subscriptions",
    resource: Resources.SUBSCRIPTIONS,
    action: Actions.MANAGE,
  },

  {
    name: Permissions.NOTIFICATIONS_SEND,
    description: "Send notifications",
    resource: Resources.NOTIFICATIONS,
    action: Actions.WRITE,
  },

  {
    name: Permissions.REPORTS_READ,
    description: "View reports",
    resource: Resources.REPORTS,
    action: Actions.READ,
  },
] as const;

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionName[]> = {
  super_admin: ALL_PERMISSIONS.map((p) => p.name),
  admin: [
    Permissions.USERS_READ,
    Permissions.USERS_CREATE,
    Permissions.USERS_UPDATE,
    Permissions.ROLES_READ,
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_CREATE,
    Permissions.PROJECTS_UPDATE,
    Permissions.PROJECTS_DELETE,
    Permissions.INVESTMENTS_READ,
    Permissions.OFFICES_READ,
    Permissions.OFFICES_CREATE,
    Permissions.AUDIT_READ,
    Permissions.SETTINGS_READ,
    Permissions.SETTINGS_UPDATE,
    Permissions.NOTIFICATIONS_SEND,
    Permissions.REPORTS_READ,
  ],
  investor: [
    Permissions.PROJECTS_READ,
    Permissions.INVESTMENTS_READ,
    Permissions.INVESTMENTS_CREATE,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_SEND,
  ],
  client: [Permissions.PROJECTS_READ, Permissions.INVESTMENTS_READ, Permissions.REPORTS_READ],
  support: [
    Permissions.USERS_READ,
    Permissions.PROJECTS_READ,
    Permissions.INVESTMENTS_READ,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_SEND,
  ],
};
