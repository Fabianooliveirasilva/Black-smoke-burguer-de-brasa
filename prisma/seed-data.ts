/** Catalog and store content for development/demo environments. Prices in cents. */

type Opt = [name: string, priceCents: number, maxQuantity: number];
type Ing = [name: string, removable: boolean];

export interface SeedProduct {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number;
  image: string;
  isPopular?: boolean;
  allowsDoneness?: boolean;
  ingredients: Ing[];
  options: Opt[];
}

const burgerExtras: Opt[] = [
  ["Bacon defumado na casa", 690, 2],
  ["Cheddar inglês", 490, 2],
  ["Cebola caramelizada no bourbon", 450, 1],
  ["Ovo de gema mole", 390, 1],
  ["Picles da casa", 290, 1],
];
const smashExtras: Opt[] = [["Smash extra 90 g", 990, 2], ...burgerExtras.slice(0, 2), ["Picles da casa", 290, 1]];

export const categories: Array<{ slug: string; name: string; products: SeedProduct[] }> = [
  {
    slug: "burgers",
    name: "Burgers",
    products: [
      {
        slug: "smoke-classic",
        name: "Smoke Classic",
        tagline: "O que deu nome à casa.",
        description:
          "Blend de 180 g de acém e peito, defumado por 40 minutos em lenha de macieira antes de ir para a grelha. Cheddar inglês, cebola caramelizada no bourbon e maionese de alho assado no brioche tostado na manteiga.",
        priceCents: 3890,
        image: "/images/products/smoke-classic.jpg",
        isPopular: true,
        allowsDoneness: true,
        ingredients: [["Brioche", false], ["Blend defumado 180 g", false], ["Cheddar inglês", true], ["Cebola caramelizada", true], ["Maionese de alho assado", true]],
        options: [["Blend extra 180 g", 1490, 1], ...burgerExtras],
      },
      {
        slug: "double-smash",
        name: "Double Smash",
        tagline: "Duas bolas de 90 g, prensadas até virar crosta.",
        description:
          "Dois smashes prensados na chapa de ferro a 260 °C, com a borda rendada e o centro suculento. American cheese em dobro, picles da casa, cebola branca crua e o molho Black.",
        priceCents: 3690,
        image: "/images/products/double-smash.jpg",
        isPopular: true,
        ingredients: [["Pão de batata", false], ["2 smashes de 90 g", false], ["American cheese", true], ["Picles da casa", true], ["Cebola branca", true], ["Molho Black", true]],
        options: smashExtras,
      },
      {
        slug: "brasa-bacon",
        name: "Brasa Bacon",
        tagline: "Bacon de barriga curado por sete dias.",
        description:
          "Blend de 180 g, bacon de barriga curado e defumado aqui mesmo, provolone maçaricado na hora e barbecue de café coado. Pede guardanapo extra.",
        priceCents: 4690,
        image: "/images/products/brasa-bacon.jpg",
        isPopular: true,
        allowsDoneness: true,
        ingredients: [["Brioche", false], ["Blend 180 g", false], ["Bacon da casa", true], ["Provolone maçaricado", true], ["Barbecue de café", true]],
        options: [["Blend extra 180 g", 1490, 1], ...burgerExtras],
      },
      {
        slug: "black-pickle",
        name: "Black Pickle",
        tagline: "Para quem acha que picles nunca é demais.",
        description:
          "Dois discos de 100 g, cheddar derretido, picles de pepino e de cebola roxa fermentados na cozinha e mostarda escura com mel de engenho.",
        priceCents: 4190,
        image: "/images/products/black-pickle.jpg",
        ingredients: [["Pão de batata", false], ["2 discos de 100 g", false], ["Cheddar", true], ["Picles de pepino", true], ["Cebola roxa em conserva", true], ["Mostarda escura", true]],
        options: smashExtras,
      },
      {
        slug: "noir-double",
        name: "Noir Double",
        tagline: "O mais caro do cardápio. E o mais pedido às sextas.",
        description:
          "Dois discos de 120 g selados na grelha, queijo suíço derretido no vapor, cebola branca, picles finos e maionese de trufa negra. Servido no brioche de gergelim preto.",
        priceCents: 5490,
        image: "/images/products/noir-double.jpg",
        allowsDoneness: true,
        ingredients: [["Brioche de gergelim preto", false], ["2 discos de 120 g", false], ["Queijo suíço", true], ["Cebola branca", true], ["Picles", true], ["Maionese de trufa", true]],
        options: burgerExtras,
      },
      {
        slug: "barbecue-cheddar",
        name: "Barbecue Cheddar",
        tagline: "Rapadura, chipotle e cheddar cremoso.",
        description:
          "Blend de 180 g, cheddar cremoso, barbecue de rapadura com chipotle defumado e cebola crispy por cima. Doce, ácido e defumado na mesma mordida.",
        priceCents: 4490,
        image: "/images/products/barbecue-cheddar.jpg",
        allowsDoneness: true,
        ingredients: [["Brioche", false], ["Blend 180 g", false], ["Cheddar cremoso", true], ["Barbecue de rapadura", true], ["Cebola crispy", true], ["Alface", true]],
        options: [["Blend extra 180 g", 1490, 1], ...burgerExtras],
      },
      {
        slug: "red-crust",
        name: "Red Crust",
        tagline: "Pão de beterraba e queijo coalho na brasa.",
        description:
          "Pão de fermentação natural com beterraba, blend de 160 g, queijo coalho grelhado, vinagrete de pimenta biquinho e folhas de rúcula.",
        priceCents: 4290,
        image: "/images/products/red-crust.jpg",
        allowsDoneness: true,
        ingredients: [["Pão de beterraba", false], ["Blend 160 g", false], ["Queijo coalho", true], ["Vinagrete de biquinho", true], ["Rúcula", true]],
        options: burgerExtras,
      },
      {
        slug: "onion-smash",
        name: "Onion Smash",
        tagline: "Cebola prensada junto com a carne.",
        description:
          "Cebola fatiada fina prensada sobre o smash ainda cru: ela carameliza na gordura da carne. Cheddar e mostarda amarela. Simples e difícil de parar.",
        priceCents: 3490,
        image: "/images/products/onion-smash.jpg",
        ingredients: [["Pão de batata", false], ["Smash de 120 g", false], ["Cebola na chapa", false], ["Cheddar", true], ["Mostarda amarela", true]],
        options: smashExtras,
      },
      {
        slug: "classico-da-casa",
        name: "Clássico da Casa",
        tagline: "Alface, tomate, queijo. Sem invenção.",
        description:
          "Blend de 160 g, queijo prato, alface americana, tomate, cebola roxa e maionese da casa. O burger para quem veio pela carne.",
        priceCents: 3390,
        image: "/images/products/jardim.jpg",
        allowsDoneness: true,
        ingredients: [["Brioche", false], ["Blend 160 g", false], ["Queijo prato", true], ["Alface americana", true], ["Tomate", true], ["Cebola roxa", true], ["Maionese da casa", true]],
        options: burgerExtras,
      },
    ],
  },
  {
    slug: "combos",
    name: "Combos",
    products: [
      {
        slug: "combo-smoke",
        name: "Combo Smoke",
        tagline: "Smoke Classic, fritas da casa e limonada.",
        description: "Smoke Classic, porção individual de fritas da casa e limonada siciliana de 400 ml. Economia de R$ 12,80 sobre os itens separados.",
        priceCents: 5790,
        image: "/images/products/combo-smoke.jpg",
        isPopular: true,
        allowsDoneness: true,
        ingredients: [["Cebola caramelizada", true], ["Maionese de alho assado", true]],
        options: [["Trocar por fritas rústicas", 400, 1], ["Bacon defumado na casa", 690, 2]],
      },
      {
        slug: "combo-brasa",
        name: "Combo Brasa",
        tagline: "Brasa Bacon, onion rings e IPA artesanal.",
        description: "Brasa Bacon, onion rings e uma IPA artesanal de 355 ml. Venda de bebida alcoólica proibida para menores de 18 anos.",
        priceCents: 7490,
        image: "/images/products/combo-brasa.jpg",
        allowsDoneness: true,
        ingredients: [["Provolone maçaricado", true], ["Barbecue de café", true]],
        options: [["Bacon defumado na casa", 690, 2]],
      },
    ],
  },
  {
    slug: "acompanhamentos",
    name: "Acompanhamentos",
    products: [
      {
        slug: "fritas-da-casa",
        name: "Fritas da Casa",
        tagline: "Corte fino, fritura dupla, sal grosso.",
        description: "Batata cortada na casa, fritura em duas temperaturas para ficar crocante por fora e macia por dentro. 300 g, com maionese de alho.",
        priceCents: 1890,
        image: "/images/products/fritas-casa.jpg",
        isPopular: true,
        ingredients: [["Maionese de alho", true]],
        options: [["Cheddar cremoso por cima", 690, 1], ["Bacon em cubos", 790, 1]],
      },
      {
        slug: "fritas-rusticas",
        name: "Fritas Rústicas",
        tagline: "Com casca, alecrim e páprica defumada.",
        description: "Batata com casca em gomos, alecrim fresco e páprica defumada. 350 g, acompanha ketchup de goiabada.",
        priceCents: 2290,
        image: "/images/products/fritas-rusticas.jpg",
        ingredients: [["Alecrim", true], ["Ketchup de goiabada", true]],
        options: [["Cheddar cremoso por cima", 690, 1]],
      },
      {
        slug: "onion-rings",
        name: "Onion Rings",
        tagline: "Empanados na cerveja escura.",
        description: "Anéis de cebola grossos empanados em massa de cerveja escura. 10 unidades com molho Black.",
        priceCents: 2490,
        image: "/images/products/onion-rings.jpg",
        ingredients: [["Molho Black", true]],
        options: [],
      },
      {
        slug: "cebola-crispy",
        name: "Cebola Crispy",
        tagline: "Porção para dividir.",
        description: "Cebola em tiras finas, empanada e frita até estalar. Porção de 250 g com barbecue de rapadura.",
        priceCents: 1990,
        image: "/images/products/cebola-crispy.jpg",
        ingredients: [["Barbecue de rapadura", true]],
        options: [],
      },
    ],
  },
  {
    slug: "bebidas",
    name: "Bebidas",
    products: [
      {
        slug: "shake-cookies",
        name: "Shake Cookies & Cream",
        tagline: "Sorvete de baunilha e cookies quebrados.",
        description: "Milkshake de sorvete de baunilha batido com cookies de cacau, calda de chocolate na borda. 450 ml.",
        priceCents: 2490,
        image: "/images/products/shake-cookies.jpg",
        isPopular: true,
        ingredients: [["Calda de chocolate", true], ["Chantilly", true]],
        options: [["Chantilly extra", 300, 1]],
      },
      {
        slug: "shake-doce-de-leite",
        name: "Shake Doce de Leite",
        tagline: "Doce de leite mineiro e flor de sal.",
        description: "Milkshake de baunilha com doce de leite de Minas e uma pitada de flor de sal. 450 ml.",
        priceCents: 2490,
        image: "/images/products/shake-doce-de-leite.jpg",
        ingredients: [["Chantilly", true]],
        options: [["Chantilly extra", 300, 1]],
      },
      {
        slug: "shake-chocolate",
        name: "Shake Chocolate 70%",
        tagline: "Chocolate amargo de verdade.",
        description: "Sorvete de chocolate batido com ganache de chocolate 70% cacau. 450 ml.",
        priceCents: 2690,
        image: "/images/products/shake-chocolate.jpg",
        ingredients: [],
        options: [["Chantilly", 300, 1]],
      },
      {
        slug: "limonada-siciliana",
        name: "Limonada Siciliana",
        tagline: "Espremida na hora.",
        description: "Limão siciliano espremido no pedido, água com gás e xarope de açúcar demerara. 400 ml.",
        priceCents: 1290,
        image: "/images/products/limonada.jpg",
        ingredients: [["Açúcar", true]],
        options: [],
      },
      {
        slug: "limonada-hortela",
        name: "Limonada com Hortelã",
        tagline: "Limão taiti e hortelã fresca.",
        description: "Limão taiti batido com hortelã fresca e gelo. 400 ml.",
        priceCents: 1390,
        image: "/images/products/limonada-hortela.jpg",
        ingredients: [["Açúcar", true]],
        options: [],
      },
    ],
  },
];

export const openingHours = [
  { day: 0, open: "12:00", close: "16:00" },
  { day: 0, open: "18:00", close: "23:00" },
  { day: 2, open: "18:00", close: "23:30" },
  { day: 3, open: "18:00", close: "23:30" },
  { day: 4, open: "18:00", close: "23:30" },
  { day: 5, open: "18:00", close: "01:00" },
  { day: 6, open: "12:00", close: "01:00" },
];

export const alwaysOpenHours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "00:00", close: "23:59" }));

export const store = {
  name: "Black Smoke Burger",
  phone: "(11) 3000-0000",
  whatsapp: "(11) 90000-0000",
  email: "contato@blacksmoke.example",
  street: "Rua da Brasa, 214",
  neighborhood: "Pinheiros",
  city: "São Paulo",
  state: "SP",
  cep: "05416-001",
  latitude: -23.5629,
  longitude: -46.6907,
  minOrderCents: 3000,
  prepTimeMinutes: 25,
};

export const zones = [
  { name: "Pinheiros e Vila Madalena", neighborhoods: ["Pinheiros", "Vila Madalena"], feeCents: 690, etaMinutes: 35 },
  { name: "Zona Oeste próxima", neighborhoods: ["Perdizes", "Alto de Pinheiros", "Vila Beatriz", "Jardim Paulistano", "Sumarezinho"], feeCents: 990, etaMinutes: 45 },
  { name: "Centro expandido", neighborhoods: ["Itaim Bibi", "Jardim Paulista", "Jardim América", "Consolação", "Butantã"], feeCents: 1290, etaMinutes: 55 },
];

export const coupons = [
  { code: "PRIMEIRABRASA", description: "15% no primeiro pedido acima de R$ 50", type: "PERCENT" as const, value: 15, minOrderCents: 5000, maxUses: 500 },
  { code: "SMOKE10", description: "R$ 10 de desconto em pedidos acima de R$ 80", type: "FIXED" as const, value: 1000, minOrderCents: 8000, maxUses: null },
];
