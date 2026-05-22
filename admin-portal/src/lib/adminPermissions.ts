export type AdminPermission =
  | "*"
  | "account.view"
  | "account.lock"
  | "account.unlock"
  | "audit_log.view"
  | "admin_user.view"
  | "admin_user.create"
  | "admin_user.update"
  | "admin_user.lock"
  | "role.view"
  | "role.update"
  | "role.assign"
  | "owner.view"
  | "owner.update"
  | "owner.lock"
  | "owner.unlock"
  | "owner.view_sensitive"
  | "owner.export"
  | "tenant.view"
  | "tenant.update"
  | "tenant.lock"
  | "tenant.unlock"
  | "tenant.view_sensitive"
  | "tenant.export"
  | "property.view"
  | "property.update"
  | "property.lock"
  | "property.unlock"
  | "room.view"
  | "room.update"
  | "room.lock"
  | "room.unlock"
  | "contract.view"
  | "contract.update"
  | "contract.cancel"
  | "contract.download_file"
  | "invoice.view"
  | "invoice.update"
  | "invoice.mark_paid"
  | "invoice.cancel"
  | "dashboard.view"
  | "report.view"
  | "report.export"
  | "system_config.view"
  | "system_config.update"
  | "notification.view"
  | "notification.create"
  | "notification.send"
  | "notification.cancel";

export type AdminPermissionResponse = {
  role: string;
  permissions: AdminPermission[];
};

export const hasAdminPermission = (
  permissions: readonly string[],
  permission: AdminPermission,
) => permissions.includes("*") || permissions.includes(permission);
