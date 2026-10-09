/**
 * Production bootstrap: makes sure roles/permissions exist and creates the first Super Admin.
 *
 *   ADMIN_EMAIL=owner@malika.example ADMIN_NAME="Owner" ADMIN_PASSWORD='…12+ chars…' npm run db:bootstrap
 *
 * Nothing is hardcoded: without these variables it only syncs roles and permissions.
 * Safe to re-run; it refuses to create a second account with the same email.
 */
import { syncRbac } from "../src/server/services/rbac";
import { countSuperAdmins, createAdminUser } from "../src/server/services/admin-auth";

async function main() {
  await syncRbac();
  console.log("Roles and permissions are in sync.");
  const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log(`Super admins: ${await countSuperAdmins()}. Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD to create one.`);
    return process.exit(0);
  }
  const res = await createAdminUser({ email: ADMIN_EMAIL, name: ADMIN_NAME ?? "Super Admin", password: ADMIN_PASSWORD, roleKey: "super_admin" });
  if (!res.ok) {
    console.error("Could not create the admin:", res.code, "issues" in res ? res.issues : "");
    return process.exit(1);
  }
  console.log(`Created super admin ${ADMIN_EMAIL}.`);
  process.exit(0);
}
main();
