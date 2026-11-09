import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LogoMark } from "@/components/ui/logo";
import { getStore } from "@/server/store";
import { weeklySchedule } from "@/server/hours";
import { StoreStatus } from "./store-status";

async function FooterContact() {
  await connection();
  const { settings } = await getStore();
  const wa = settings.whatsapp.replace(/\D/g, "");
  return (
    <address className="flex flex-col gap-1 not-italic text-fumaca">
      <span className="text-osso">{settings.street}</span>
      <span>
        {settings.neighborhood}, {settings.city}/{settings.state} · {settings.cep}
      </span>
      <a className="mt-2 hover:text-osso" href={`tel:+55${settings.phone.replace(/\D/g, "")}`}>
        {settings.phone}
      </a>
      <a className="hover:text-osso" href={`https://wa.me/55${wa}`} target="_blank" rel="noopener noreferrer">
        WhatsApp {settings.whatsapp}
      </a>
      <a className="hover:text-osso" href={`mailto:${settings.email}`}>
        {settings.email}
      </a>
    </address>
  );
}

async function FooterHours() {
  await connection();
  const { settings } = await getStore();
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      {weeklySchedule(settings.openingHours).map((d) => (
        <div key={d.day} className="contents">
          <dt className="text-fumaca">{d.name}</dt>
          <dd className="tabular">{d.windows.length ? d.windows.map((w) => `${w.open}–${w.close}`).join(" · ") : "Fechado"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-osso/10 bg-[#100d0b] pb-28 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-16 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-10">
        <div className="flex flex-col gap-5">
          <LogoMark className="size-12 text-osso" />
          <p className="display text-4xl">Black Smoke Burger</p>
          <p className="max-w-xs text-fumaca">Carne moída na casa todas as manhãs, fumaça de lenha de macieira e chapa de ferro a 260 °C.</p>
          <Suspense fallback={<p className="h-5" />}>
            <StoreStatus />
          </Suspense>
        </div>
        <div>
          <h2 className="mb-4 font-semibold">Endereço e contato</h2>
          <Suspense fallback={<p className="text-fumaca">Carregando…</p>}>
            <FooterContact />
          </Suspense>
        </div>
        <div>
          <h2 className="mb-4 font-semibold">Horários</h2>
          <Suspense fallback={<p className="text-fumaca">Carregando…</p>}>
            <FooterHours />
          </Suspense>
        </div>
        <nav aria-label="Rodapé">
          <h2 className="mb-4 font-semibold">Navegação</h2>
          <ul className="flex flex-col gap-2 text-fumaca">
            <li><Link className="hover:text-osso" href="/cardapio">Cardápio completo</Link></li>
            <li><Link className="hover:text-osso" href="/carrinho">Seu pedido</Link></li>
            <li><Link className="hover:text-osso" href="/conta">Minha conta</Link></li>
            <li><Link className="hover:text-osso" href="/entrar">Entrar</Link></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-14 flex max-w-7xl flex-col gap-2 border-t border-osso/10 px-4 pt-6 text-xs text-fumaca sm:px-6 md:flex-row md:justify-between lg:px-10">
        <p>© {2026} Black Smoke Burger. Marca fictícia para demonstração.</p>
        <p>
          Fotos: <a className="underline hover:text-osso" href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash</a> · Vídeo:{" "}
          <a className="underline hover:text-osso" href="https://mixkit.co/license/" target="_blank" rel="noopener noreferrer">Mixkit</a>
        </p>
      </div>
    </footer>
  );
}
