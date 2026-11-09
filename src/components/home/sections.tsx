import Image from "next/image";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/menu/product-card";
import { getMenu } from "@/server/catalog";
import { getPromotions, getStore } from "@/server/store";
import { describeStatus, localClock, weeklySchedule } from "@/server/hours";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CopyCode } from "./copy-code";
import { MapFacade } from "./map-facade";

export function SectionHeading({ id, kicker, title, children }: { id: string; kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {kicker && <p className="mb-3 text-sm text-brasa">{kicker}</p>}
        <h2 id={id} className="display text-[clamp(2.8rem,7vw,5.5rem)]">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

export async function PopularRail() {
  await connection();
  const menu = await getMenu();
  const popular = menu.flatMap((c) => c.products).filter((p) => p.isPopular && p.isAvailable).slice(0, 6);
  return (
    <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
      {popular.map((p) => (
        <li key={p.id} className="w-[78vw] max-w-sm shrink-0 snap-start lg:w-auto lg:max-w-none">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function RailSkeleton() {
  return (
    <div className="mt-10 flex gap-4 overflow-hidden lg:grid lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="aspect-[4/5] w-[78vw] max-w-sm shrink-0 animate-pulse rounded-[1.75rem] bg-fuligem lg:w-auto lg:max-w-none" />
      ))}
    </div>
  );
}

const STEPS = [
  { t: "Moemos às 10h", d: "Acém e peito de novilho chegam inteiros do açougue parceiro e passam pelo moedor uma vez, com 20% de gordura. Nada fica de um dia para o outro." },
  { t: "Defumamos 40 minutos", d: "Os blends grandes descansam na defumadora com lenha de macieira antes de qualquer pedido. É de onde vem o nome da casa." },
  { t: "Prensamos a 260 °C", d: "A chapa de ferro de 12 mm segura o calor: a carne toca, é prensada e forma a crosta em menos de dois minutos." },
  { t: "Montamos na hora", d: "Pão tostado na manteiga, queijo derretido no vapor e o burger fechado só quando o entregador já está na porta." },
];

export function Process() {
  return (
    <section aria-labelledby="processo-title" id="processo" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div className="relative lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="processo-title" title="Do moedor ao balcão" />
          <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-[1.75rem]">
            <Image src="/images/brand/smash-press.jpg" alt="Espátula de aço prensando o blend de carne na chapa" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>
        <ol className="flex flex-col">
          {STEPS.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-osso/12 py-9 first:border-t-0 lg:first:pt-2">
              <span className="display tabular text-4xl text-brasa" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="display text-4xl">{s.t}</h3>
                <p className="mt-3 max-w-prose text-fumaca">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Ingredients() {
  return (
    <section aria-labelledby="ingredientes-title" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <SectionHeading id="ingredientes-title" title="O que vai dentro" />
      <div className="mt-10 grid gap-4 md:grid-cols-6 md:grid-rows-[repeat(2,minmax(16rem,1fr))]">
        <figure className="relative min-h-[26rem] overflow-hidden rounded-[1.75rem] bg-black md:col-span-3 md:row-span-2">
          <Image src="/images/brand/deconstructed.jpg" alt="Camadas de um burger suspensas no ar: pão, queijo, tomate, cebola e carne" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(0_0_0/0.85),transparent)] p-6 pt-20">
            <p className="display text-3xl">Seis camadas, nenhuma de enfeite</p>
            <p className="mt-2 max-w-sm text-sm text-osso/80">Cada ingrediente pode ser removido no pedido, menos o pão e a carne.</p>
          </figcaption>
        </figure>
        <figure className="relative min-h-64 overflow-hidden rounded-[1.75rem] md:col-span-3">
          <Image src="/images/brand/beef-cuts.jpg" alt="Cortes de carne bovina crua sobre papel kraft" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
          <figcaption className="absolute bottom-0 left-0 m-4 rounded-2xl bg-carvao/85 p-4 backdrop-blur">
            <p className="font-semibold">Acém e peito, 80/20</p>
            <p className="text-sm text-fumaca">Novilho do Sul de Minas, moído na casa.</p>
          </figcaption>
        </figure>
        <figure className="relative min-h-64 overflow-hidden rounded-[1.75rem] md:col-span-2">
          <Image src="/images/brand/fire-patty.jpg" alt="Blend de carne grelhando sobre chamas" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />
          <figcaption className="absolute bottom-0 left-0 m-4 rounded-2xl bg-carvao/85 p-4 backdrop-blur">
            <p className="font-semibold">Lenha de macieira</p>
            <p className="text-sm text-fumaca">Fumaça adocicada, sem amargor.</p>
          </figcaption>
        </figure>
        <figure className="relative min-h-64 overflow-hidden rounded-[1.75rem] md:col-span-1">
          <Image src="/images/brand/patties.jpg" alt="Discos de carne moída prontos para a chapa" fill sizes="(min-width:768px) 17vw, 100vw" className="object-cover" />
          <figcaption className="sr-only">Discos de carne porcionados no dia</figcaption>
        </figure>
      </div>
    </section>
  );
}

export async function Promotions() {
  await connection();
  const now = new Date();
  const promos = (await getPromotions())
    .filter((p) => (!p.startsAt || p.startsAt <= now) && (!p.expiresAt || p.expiresAt > now) && (p.maxUses === null || p.usesCount < p.maxUses))
    .slice(0, 3);
  if (promos.length === 0) {
    return <p className="mt-10 text-fumaca">Nenhuma promoção ativa agora. Volte na sexta.</p>;
  }
  return (
    <ul className="mt-10 grid gap-6 md:grid-cols-2">
      {promos.map((p) => (
        <li key={p.code} className="ticket flex flex-col gap-5 rounded-sm px-7 sm:flex-row sm:items-center sm:justify-between" data-testid="promo-ticket">
          <div>
            <p className="display text-6xl">{p.type === "PERCENT" ? `${p.value}% off` : `${formatBRL(p.value)} off`}</p>
            <p className="mt-2 max-w-xs text-tinta/80">{p.description}</p>
            {p.expiresAt && <p className="mt-1 text-xs text-tinta/70">Válido até {p.expiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}
          </div>
          <CopyCode code={p.code} />
        </li>
      ))}
    </ul>
  );
}

const QUOTES = [
  { q: "A crosta do Double Smash é a coisa mais próxima de Nova York que comi em São Paulo.", a: "Rafael, Vila Madalena" },
  { q: "Pedi sem cebola e com ponto mal passado. Chegou exatamente assim, quente, em 30 minutos.", a: "Juliana, Pinheiros" },
  { q: "O Noir Double vale cada centavo. A maionese de trufa não é perfume, tem gosto mesmo.", a: "Caio, Perdizes" },
];

export function Testimonials() {
  return (
    <section aria-labelledby="depoimentos-title" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
      <h2 id="depoimentos-title" className="sr-only">
        Depoimentos de clientes
      </h2>
      <ul className="grid gap-12 lg:grid-cols-3">
        {QUOTES.map((t) => (
          <li key={t.a}>
            <figure>
              <blockquote className="text-2xl leading-snug font-medium text-osso">“{t.q}”</blockquote>
              <figcaption className="mt-5 text-fumaca">{t.a}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function Location() {
  await connection();
  const { settings } = await getStore();
  const now = new Date();
  const status = settings.ordersPaused ? { open: false, label: "Pedidos pausados no momento" } : describeStatus(now, settings.openingHours);
  const today = localClock(now).day;
  const { latitude: lat, longitude: lng } = settings;
  const bbox = [lng - 0.008, lat - 0.005, lng + 0.008, lat + 0.005].join(",");
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <MapFacade
        title={`Mapa: ${settings.street}, ${settings.neighborhood}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
      />
      <div className="flex flex-col gap-8 rounded-[1.75rem] bg-fuligem p-7 sm:p-9">
        <div>
          <p className="display text-4xl">{settings.street}</p>
          <p className="mt-2 text-fumaca">
            {settings.neighborhood} · {settings.city}/{settings.state} · CEP {settings.cep}
          </p>
          <p className={cn("mt-4 inline-flex items-center gap-2 text-sm", status.open ? "text-osso" : "text-fumaca")}>
            <span className={cn("size-2 rounded-full", status.open ? "bg-musgo" : "bg-sangue")} aria-hidden />
            {status.label}
          </p>
        </div>
        <table className="w-full text-left text-[0.95rem]">
          <caption className="sr-only">Horário de funcionamento</caption>
          <tbody>
            {weeklySchedule(settings.openingHours).map((d) => (
              <tr key={d.day} className={cn("border-b border-osso/8 last:border-0", d.day === today && "text-brasa")} aria-current={d.day === today ? "date" : undefined}>
                <th scope="row" className="py-2 font-medium">
                  {d.name}
                  {d.day === today && <span className="sr-only"> (hoje)</span>}
                </th>
                <td className="tabular py-2 text-right">{d.windows.length ? d.windows.map((w) => `${w.open} – ${w.close}`).join(", ") : "Fechado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
            Como chegar
          </ButtonLink>
          <ButtonLink href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, "")}`} variant="outline" target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
