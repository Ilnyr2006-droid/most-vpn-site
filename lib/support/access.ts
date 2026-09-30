import { getAdminSession } from "@/lib/admin/access";

export async function getSupportOperator() {
  return getAdminSession();
}
