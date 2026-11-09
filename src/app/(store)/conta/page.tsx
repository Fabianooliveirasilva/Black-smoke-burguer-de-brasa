import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/money";
import { STATUS_LABEL } from "@/server/order-status";
import { AccountClient } from "@/components/account/account-client";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

async function Account() {
  const user = await requireUser("/conta");
  const data = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      role: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: { orderBy: { createdAt: "desc" }, take: 30, select: { number: true, trackingToken: true, status: true, totalCents: true, createdAt: true, items: { select: { productName: true, quantity: true } } } },
    },
  });
  return (
    <div className="mt-10 grid gap-14 lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="hist">
        <h2 id="hist" className="display text-4xl">Seus pedidos</h2>
        {data.orders.length === 0 ? (
          <p className="mt-4 text-fumaca">
            Nenhum pedido ainda. <Link className="text-osso underline" href="/cardapio">Abrir o cardápio</Link>
          </p>
        ) : (
          <ul className="mt-4">
            {data.orders.map((o) => (
              <li key={o.number} className="border-b border-osso/10">
                <Link href={`/pedido/${o.trackingToken}`} className="flex items-center justify-between gap-4 py-4 hover:text-brasa">
                  <span>
                    <span className="font-semibold">#{o.number}</span> · {STATUS_LABEL[o.status]}
                    <span className="block text-sm text-fumaca">
                      {o.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                    </span>
                  </span>
                  <span className="tabular shrink-0">{formatBRL(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <AccountClient
        isAdmin={data.role === "admin"}
        profile={{ name: data.name, email: data.email, phone: data.phone ?? "" }}
        addresses={data.addresses.map((a) => ({ id: a.id, label: a.label, street: a.street, number: a.number, complement: a.complement, neighborhood: a.neighborhood, city: a.city, cep: a.cep, reference: a.reference, isDefault: a.isDefault }))}
      />
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <h1 className="display text-[clamp(3.5rem,11vw,7rem)]">Minha conta</h1>
      <Suspense fallback={<div className="mt-10 h-80 animate-pulse rounded bg-fuligem" />}>
        <Account />
      </Suspense>
    </div>
  );
}
