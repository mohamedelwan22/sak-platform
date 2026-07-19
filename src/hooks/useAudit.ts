import { useQuery } from "@tanstack/react-query";
import { auditApi, type AuditLogFilters, type AuditSearchInput } from "@/api/audit.api";

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit", "logs", filters],
    queryFn: async () => {
      const response = await auditApi.getAll(filters);
      return response.data;
    },
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ["audit", "log", id],
    queryFn: async () => {
      const response = await auditApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAuditUserLogs(
  userId: string,
  filters?: Pick<
    AuditLogFilters,
    "action" | "entityType" | "startDate" | "endDate" | "page" | "limit"
  >,
) {
  return useQuery({
    queryKey: ["audit", "user", userId, filters],
    queryFn: async () => {
      const response = await auditApi.getByUser(userId, filters);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useAuditEntityLogs(
  entity: string,
  entityId: string,
  filters?: Pick<AuditLogFilters, "action" | "startDate" | "endDate" | "page" | "limit">,
) {
  return useQuery({
    queryKey: ["audit", "entity", entity, entityId, filters],
    queryFn: async () => {
      const response = await auditApi.getByEntity(entity, entityId, filters);
      return response.data;
    },
    enabled: !!entity && !!entityId,
  });
}

export function useAuditSearch(input: AuditSearchInput) {
  return useQuery({
    queryKey: ["audit", "search", input],
    queryFn: async () => {
      const response = await auditApi.search(input);
      return response.data;
    },
    enabled: false,
  });
}
