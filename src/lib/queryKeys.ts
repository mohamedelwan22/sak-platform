export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.users.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: () => [...queryKeys.roles.all, "list"] as const,
  },
  countries: {
    all: ["countries"] as const,
    list: () => [...queryKeys.countries.all, "list"] as const,
    detail: (id: string) => [...queryKeys.countries.all, "detail", id] as const,
  },
  cities: {
    all: ["cities"] as const,
    list: (countryId?: string) => [...queryKeys.cities.all, "list", { countryId }] as const,
    detail: (id: string) => [...queryKeys.cities.all, "detail", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (id: string) => [...queryKeys.projects.all, "detail", id] as const,
  },
  lands: {
    all: ["lands"] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.lands.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.lands.all, "detail", id] as const,
  },
  wallets: {
    all: ["wallets"] as const,
    detail: (userId: string) => [...queryKeys.wallets.all, "detail", userId] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.transactions.all, "list", params] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => [...queryKeys.notifications.all, "list"] as const,
  },
  kyc: {
    all: ["kyc"] as const,
    list: () => [...queryKeys.kyc.all, "list"] as const,
    detail: (id: string) => [...queryKeys.kyc.all, "detail", id] as const,
  },
  holdings: {
    all: ["holdings"] as const,
    list: () => [...queryKeys.holdings.all, "list"] as const,
  },
  marketplace: {
    all: ["marketplace"] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.marketplace.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.marketplace.all, "detail", id] as const,
  },
  gold: {
    all: ["gold"] as const,
    price: () => [...queryKeys.gold.all, "price"] as const,
  },
  sak: {
    all: ["sak"] as const,
    config: () => [...queryKeys.sak.all, "config"] as const,
    price: () => [...queryKeys.sak.all, "price"] as const,
  },
} as const;
