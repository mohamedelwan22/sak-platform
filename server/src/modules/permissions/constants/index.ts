export const Resources = {
  USERS: "users",
  ROLES: "roles",
  PROJECTS: "projects",
  INVESTMENTS: "investments",
  INVESTORS: "investors",
  TRANSACTIONS: "transactions",
  OFFICES: "offices",
  AUDIT: "audit",
  SETTINGS: "settings",
  SUBSCRIPTIONS: "subscriptions",
  NOTIFICATIONS: "notifications",
  REPORTS: "reports",
  COUNTRIES: "countries",
  CITIES: "cities",
  WALLETS: "wallets",
  LANDS: "lands",
  KYC: "kyc",
  PAYMENTS: "payments",
  GOLD: "gold",
  SAK: "sak",
  PORTFOLIO: "portfolio",
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
  NOTIFICATIONS_READ: "notifications.read",
  NOTIFICATIONS_CREATE: "notifications.create",
  NOTIFICATIONS_UPDATE: "notifications.update",
  NOTIFICATIONS_DELETE: "notifications.delete",
  NOTIFICATIONS_SEND: "notifications.send",

  // Reports
  REPORTS_READ: "reports.read",

  // Countries
  COUNTRIES_READ: "countries.read",
  COUNTRIES_CREATE: "countries.create",
  COUNTRIES_UPDATE: "countries.update",
  COUNTRIES_DELETE: "countries.delete",

  // Cities
  CITIES_READ: "cities.read",
  CITIES_CREATE: "cities.create",
  CITIES_UPDATE: "cities.update",
  CITIES_DELETE: "cities.delete",

  // Investors
  INVESTORS_READ: "investors.read",
  INVESTORS_CREATE: "investors.create",
  INVESTORS_UPDATE: "investors.update",
  INVESTORS_DELETE: "investors.delete",

  // Wallets
  WALLETS_READ: "wallets.read",
  WALLETS_CREATE: "wallets.create",
  WALLETS_UPDATE: "wallets.update",
  WALLETS_DELETE: "wallets.delete",

  // Transactions
  TRANSACTIONS_READ: "transactions.read",
  TRANSACTIONS_CREATE: "transactions.create",
  TRANSACTIONS_UPDATE: "transactions.update",
  TRANSACTIONS_DELETE: "transactions.delete",

  // KYC
  KYC_READ: "kyc.read",
  KYC_CREATE: "kyc.create",
  KYC_UPDATE: "kyc.update",

  // Payments
  PAYMENTS_READ: "payments.read",
  PAYMENTS_CREATE: "payments.create",
  PAYMENTS_UPDATE: "payments.update",

  // Lands
  LANDS_READ: "lands.read",
  LANDS_CREATE: "lands.create",
  LANDS_UPDATE: "lands.update",
  LANDS_DELETE: "lands.delete",

  // Gold
  GOLD_READ: "gold.read",
  GOLD_CREATE: "gold.create",
  GOLD_UPDATE: "gold.update",
  GOLD_DELETE: "gold.delete",

  // SAK Config
  SAK_READ: "sak.read",
  SAK_CREATE: "sak.create",
  SAK_UPDATE: "sak.update",
  SAK_DELETE: "sak.delete",

  // Portfolio (holdings + buy SAK)
  PORTFOLIO_READ: "portfolio.read",
  PORTFOLIO_CREATE: "portfolio.create",
  PORTFOLIO_UPDATE: "portfolio.update",
  PORTFOLIO_DELETE: "portfolio.delete",
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
    name: Permissions.NOTIFICATIONS_READ,
    description: "View notifications",
    resource: Resources.NOTIFICATIONS,
    action: Actions.READ,
  },
  {
    name: Permissions.NOTIFICATIONS_CREATE,
    description: "Create notifications",
    resource: Resources.NOTIFICATIONS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.NOTIFICATIONS_UPDATE,
    description: "Update notifications",
    resource: Resources.NOTIFICATIONS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.NOTIFICATIONS_DELETE,
    description: "Delete notifications",
    resource: Resources.NOTIFICATIONS,
    action: Actions.DELETE,
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

  {
    name: Permissions.COUNTRIES_READ,
    description: "View countries",
    resource: Resources.COUNTRIES,
    action: Actions.READ,
  },
  {
    name: Permissions.COUNTRIES_CREATE,
    description: "Create countries",
    resource: Resources.COUNTRIES,
    action: Actions.WRITE,
  },
  {
    name: Permissions.COUNTRIES_UPDATE,
    description: "Update countries",
    resource: Resources.COUNTRIES,
    action: Actions.WRITE,
  },
  {
    name: Permissions.COUNTRIES_DELETE,
    description: "Delete countries",
    resource: Resources.COUNTRIES,
    action: Actions.DELETE,
  },

  {
    name: Permissions.CITIES_READ,
    description: "View cities",
    resource: Resources.CITIES,
    action: Actions.READ,
  },
  {
    name: Permissions.CITIES_CREATE,
    description: "Create cities",
    resource: Resources.CITIES,
    action: Actions.WRITE,
  },
  {
    name: Permissions.CITIES_UPDATE,
    description: "Update cities",
    resource: Resources.CITIES,
    action: Actions.WRITE,
  },
  {
    name: Permissions.CITIES_DELETE,
    description: "Delete cities",
    resource: Resources.CITIES,
    action: Actions.DELETE,
  },

  {
    name: Permissions.INVESTORS_READ,
    description: "View investors",
    resource: Resources.INVESTORS,
    action: Actions.READ,
  },
  {
    name: Permissions.INVESTORS_CREATE,
    description: "Create investors",
    resource: Resources.INVESTORS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.INVESTORS_UPDATE,
    description: "Update investors",
    resource: Resources.INVESTORS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.INVESTORS_DELETE,
    description: "Delete investors",
    resource: Resources.INVESTORS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.WALLETS_READ,
    description: "View wallets",
    resource: Resources.WALLETS,
    action: Actions.READ,
  },
  {
    name: Permissions.WALLETS_CREATE,
    description: "Create wallets",
    resource: Resources.WALLETS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.WALLETS_UPDATE,
    description: "Update wallets",
    resource: Resources.WALLETS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.WALLETS_DELETE,
    description: "Delete wallets",
    resource: Resources.WALLETS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.TRANSACTIONS_READ,
    description: "View transactions",
    resource: Resources.TRANSACTIONS,
    action: Actions.READ,
  },
  {
    name: Permissions.TRANSACTIONS_CREATE,
    description: "Create transactions",
    resource: Resources.TRANSACTIONS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.TRANSACTIONS_UPDATE,
    description: "Update transactions",
    resource: Resources.TRANSACTIONS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.TRANSACTIONS_DELETE,
    description: "Delete transactions",
    resource: Resources.TRANSACTIONS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.KYC_READ,
    description: "View KYC submissions",
    resource: Resources.KYC,
    action: Actions.READ,
  },
  {
    name: Permissions.KYC_CREATE,
    description: "Submit KYC documents",
    resource: Resources.KYC,
    action: Actions.WRITE,
  },
  {
    name: Permissions.KYC_UPDATE,
    description: "Review KYC submissions",
    resource: Resources.KYC,
    action: Actions.WRITE,
  },

  {
    name: Permissions.PAYMENTS_READ,
    description: "View payment requests",
    resource: Resources.PAYMENTS,
    action: Actions.READ,
  },
  {
    name: Permissions.PAYMENTS_CREATE,
    description: "Create payment requests",
    resource: Resources.PAYMENTS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.PAYMENTS_UPDATE,
    description: "Review payment requests",
    resource: Resources.PAYMENTS,
    action: Actions.WRITE,
  },

  {
    name: Permissions.LANDS_READ,
    description: "View lands",
    resource: Resources.LANDS,
    action: Actions.READ,
  },
  {
    name: Permissions.LANDS_CREATE,
    description: "Create lands",
    resource: Resources.LANDS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.LANDS_UPDATE,
    description: "Update lands",
    resource: Resources.LANDS,
    action: Actions.WRITE,
  },
  {
    name: Permissions.LANDS_DELETE,
    description: "Delete lands",
    resource: Resources.LANDS,
    action: Actions.DELETE,
  },

  {
    name: Permissions.GOLD_READ,
    description: "View gold prices",
    resource: Resources.GOLD,
    action: Actions.READ,
  },
  {
    name: Permissions.GOLD_CREATE,
    description: "Create gold price entries",
    resource: Resources.GOLD,
    action: Actions.WRITE,
  },
  {
    name: Permissions.GOLD_UPDATE,
    description: "Update gold prices",
    resource: Resources.GOLD,
    action: Actions.WRITE,
  },
  {
    name: Permissions.GOLD_DELETE,
    description: "Delete gold price entries",
    resource: Resources.GOLD,
    action: Actions.DELETE,
  },

  {
    name: Permissions.SAK_READ,
    description: "View SAK configuration",
    resource: Resources.SAK,
    action: Actions.READ,
  },
  {
    name: Permissions.SAK_CREATE,
    description: "Create SAK configurations",
    resource: Resources.SAK,
    action: Actions.WRITE,
  },
  {
    name: Permissions.SAK_UPDATE,
    description: "Update SAK configurations",
    resource: Resources.SAK,
    action: Actions.WRITE,
  },
  {
    name: Permissions.SAK_DELETE,
    description: "Delete SAK configurations",
    resource: Resources.SAK,
    action: Actions.DELETE,
  },

  {
    name: Permissions.PORTFOLIO_READ,
    description: "View portfolio holdings",
    resource: Resources.PORTFOLIO,
    action: Actions.READ,
  },
  {
    name: Permissions.PORTFOLIO_CREATE,
    description: "Create holdings (buy SAK)",
    resource: Resources.PORTFOLIO,
    action: Actions.WRITE,
  },
  {
    name: Permissions.PORTFOLIO_UPDATE,
    description: "Update holdings",
    resource: Resources.PORTFOLIO,
    action: Actions.WRITE,
  },
  {
    name: Permissions.PORTFOLIO_DELETE,
    description: "Delete holdings",
    resource: Resources.PORTFOLIO,
    action: Actions.DELETE,
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
    Permissions.NOTIFICATIONS_READ,
    Permissions.NOTIFICATIONS_CREATE,
    Permissions.NOTIFICATIONS_UPDATE,
    Permissions.NOTIFICATIONS_DELETE,
    Permissions.NOTIFICATIONS_SEND,
    Permissions.REPORTS_READ,
    Permissions.COUNTRIES_READ,
    Permissions.COUNTRIES_CREATE,
    Permissions.COUNTRIES_UPDATE,
    Permissions.COUNTRIES_DELETE,
    Permissions.CITIES_READ,
    Permissions.CITIES_CREATE,
    Permissions.CITIES_UPDATE,
    Permissions.CITIES_DELETE,
    Permissions.INVESTORS_READ,
    Permissions.INVESTORS_CREATE,
    Permissions.INVESTORS_UPDATE,
    Permissions.INVESTORS_DELETE,
    Permissions.WALLETS_READ,
    Permissions.WALLETS_CREATE,
    Permissions.WALLETS_UPDATE,
    Permissions.WALLETS_DELETE,
    Permissions.TRANSACTIONS_READ,
    Permissions.TRANSACTIONS_CREATE,
    Permissions.TRANSACTIONS_UPDATE,
    Permissions.TRANSACTIONS_DELETE,
    Permissions.KYC_READ,
    Permissions.KYC_UPDATE,
    Permissions.PAYMENTS_READ,
    Permissions.PAYMENTS_UPDATE,
    Permissions.LANDS_READ,
    Permissions.LANDS_CREATE,
    Permissions.LANDS_UPDATE,
    Permissions.LANDS_DELETE,
    Permissions.GOLD_READ,
    Permissions.GOLD_CREATE,
    Permissions.GOLD_UPDATE,
    Permissions.GOLD_DELETE,
    Permissions.SAK_READ,
    Permissions.SAK_CREATE,
    Permissions.SAK_UPDATE,
    Permissions.SAK_DELETE,
    Permissions.PORTFOLIO_READ,
    Permissions.PORTFOLIO_CREATE,
    Permissions.PORTFOLIO_UPDATE,
    Permissions.PORTFOLIO_DELETE,
  ],
  investor: [
    Permissions.PROJECTS_READ,
    Permissions.INVESTMENTS_READ,
    Permissions.INVESTMENTS_CREATE,
    Permissions.LANDS_READ,
    Permissions.GOLD_READ,
    Permissions.SAK_READ,
    Permissions.PORTFOLIO_READ,
    Permissions.PORTFOLIO_CREATE,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_READ,
    Permissions.NOTIFICATIONS_UPDATE,
    Permissions.NOTIFICATIONS_SEND,
    Permissions.KYC_READ,
    Permissions.KYC_CREATE,
    Permissions.PAYMENTS_READ,
    Permissions.PAYMENTS_CREATE,
  ],
  client: [Permissions.PROJECTS_READ, Permissions.INVESTMENTS_READ, Permissions.REPORTS_READ],
  support: [
    Permissions.USERS_READ,
    Permissions.PROJECTS_READ,
    Permissions.INVESTMENTS_READ,
    Permissions.REPORTS_READ,
    Permissions.NOTIFICATIONS_READ,
    Permissions.NOTIFICATIONS_SEND,
  ],
};
