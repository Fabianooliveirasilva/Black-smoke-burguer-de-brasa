import { requireAdmin } from "@/lib/session";
import { listCoupons } from "@/server/admin";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata = { title: "Cupons" };

export default async function CouponsPage() {
  await requireAdmin();
  const coupons = await listCoupons();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="display text-6xl">Cupons</h1>
      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id, code: c.code, description: c.description, type: c.type, value: c.value, minOrderCents: c.minOrderCents, maxUses: c.maxUses,
          usesCount: c.usesCount, active: c.active, startsAt: c.startsAt?.toISOString() ?? null, expiresAt: c.expiresAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
