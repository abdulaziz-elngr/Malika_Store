import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const stamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const roles = pgTable(
  "role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // stable slug, e.g. "content_manager"
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    isSystem: boolean("is_system").notNull().default(false), // system roles cannot be deleted
    ...stamps,
  },
  (t) => [uniqueIndex("role_key_idx").on(t.key)],
);

export const permissions = pgTable(
  "permission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(), // "<resource>:<action>"
    resource: text("resource").notNull(),
    action: text("action").notNull(),
  },
  (t) => [uniqueIndex("permission_key_idx").on(t.key)],
);

export const rolePermissions = pgTable(
  "role_permission",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const adminUsers = pgTable(
  "admin_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
    active: boolean("active").notNull().default(true),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...stamps,
  },
  (t) => [uniqueIndex("admin_user_email_idx").on(t.email), index("admin_user_role_idx").on(t.roleId)],
);

export const adminSessions = pgTable(
  "admin_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // absolute lifetime
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(), // idle timeout
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admin_session_token_idx").on(t.tokenHash), index("admin_session_user_idx").on(t.userId)],
);

/** Every sign-in attempt, successful or not, for both admins and customers. */
export const loginActivity = pgTable(
  "login_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(), // admin | customer
    email: text("email").notNull(),
    userId: uuid("user_id"),
    success: boolean("success").notNull(),
    reason: text("reason"), // bad_credentials | locked | inactive | rate_limited
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_activity_email_idx").on(t.email, t.createdAt), index("login_activity_created_idx").on(t.createdAt)],
);

export const auditLogs = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    userName: text("user_name").notNull(), // snapshot: survives user deletion and renames
    userRole: text("user_role"),
    action: text("action").notNull(), // e.g. product.update, order.status_change
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId), index("audit_user_idx").on(t.userId, t.createdAt)],
);

/** Key/value store for site-wide settings (SEO defaults, shipping, theme tokens…). Filled by later phases. */
export const siteSettings = pgTable("site_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per browser session that opens the storefront (anonymous random id, no personal data).
 * It is the denominator of the dashboard's conversion rate: orders / unique visitors.
 */
export const storefrontVisits = pgTable(
  "storefront_visit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorId: text("visitor_id").notNull(),
    path: text("path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("visit_created_idx").on(t.createdAt), index("visit_visitor_idx").on(t.visitorId)],
);
