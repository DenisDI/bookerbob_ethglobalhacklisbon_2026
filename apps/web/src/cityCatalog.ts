// Local inventory preview per demo city. The race still quotes live /offers;
// this catalog is what flips the moment the city select changes, so the desk
// does not look stuck on Lisbon while the gateway round-trips (or falls back
// to the Lisbon fixture).

import type { Offer } from "./types";

export const CITIES = [
  { value: "lisbon", label: "Lisbon" },
  { value: "munich", label: "Munich" },
  { value: "paris", label: "Paris" },
  { value: "madrid", label: "Madrid" },
] as const;

export type CityId = (typeof CITIES)[number]["value"];

export const DEFAULT_CITY: CityId = "lisbon";

/** Four rooms each — Lisbon rows taken from fixtures/lisbon.json (2026-07-25). */
const BY_CITY: Record<CityId, Offer[]> = {
  lisbon: [
    {
      hotelId: "the_delight_hostel_lisbon",
      name: "The Delight Hostel Lisbon",
      stars: 1,
      address: "R. Tomás Ribeiro 95, Lisbon",
      perNightUsd: 70.09,
      totalUsd: 210.28,
      freeCancellationBefore: "2026-08-06T23:00:00",
      photoUrl:
        "https://cdn.worldota.net/t/1024x768/content/be/c7/bec7e982dc0089b6518f586af8df30bddd928849.JPEG",
    },
    {
      hotelId: "hotel_dom_sancho_i",
      name: "Hotel Dom Sancho I",
      stars: 2,
      address: "Avenida Liberdade 202, Lisbon",
      perNightUsd: 94.99,
      totalUsd: 284.97,
      freeCancellationBefore: "2026-07-28T16:00:00",
      photoUrl:
        "https://cdn.worldota.net/t/1024x768/content/07/3b/073b9b8d73c211a931744896465f6b2935e0e534.jpeg",
    },
    {
      hotelId: "neya_lisboa_hotel",
      name: "Neya Lisboa Hotel",
      stars: 4,
      address: "Rua Dona Estefânia 71-77, Lisbon",
      perNightUsd: 144.78,
      totalUsd: 434.35,
      freeCancellationBefore: "2026-08-11T13:00:00",
      photoUrl:
        "https://cdn.worldota.net/t/1024x768/content/e6/0f/e60fc59ad7026fc7cf3c57c3845a9b80a638d7f2.JPEG",
    },
    {
      hotelId: "turim_marques_hotel",
      name: "TURIM Marques Hotel",
      stars: 4,
      address: "Rua Mouzinho da Silveira 26, Lisbon",
      perNightUsd: 156.66,
      totalUsd: 469.97,
      freeCancellationBefore: "2026-08-09T16:00:00",
      photoUrl:
        "https://cdn.worldota.net/t/1024x768/content/46/70/467004011ee5c9270bf17a8448d8496f81fc27f4.jpeg",
    },
  ],
  munich: [
    {
      hotelId: "munich_maximilian",
      name: "Hotel Maximilian Munich",
      stars: 4,
      address: "Hochbrückenstraße 18, Munich",
      perNightUsd: 168.0,
      totalUsd: 504.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80",
    },
    {
      hotelId: "munich_flushing",
      name: "Flushing Hotel München",
      stars: 3,
      address: "Bayerstraße 47, Munich",
      perNightUsd: 112.5,
      totalUsd: 337.5,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&q=80",
    },
    {
      hotelId: "munich_anna",
      name: "Hotel Anna",
      stars: 3,
      address: "Schützenstraße 1, Munich",
      perNightUsd: 129.0,
      totalUsd: 387.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&q=80",
    },
    {
      hotelId: "munich_torbrau",
      name: "Hotel Torbräu",
      stars: 4,
      address: "Tal 41, Munich",
      perNightUsd: 189.0,
      totalUsd: 567.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&q=80",
    },
  ],
  paris: [
    {
      hotelId: "paris_malte",
      name: "Hôtel de Malte Opera",
      stars: 4,
      address: "63 Rue de Richelieu, Paris",
      perNightUsd: 198.0,
      totalUsd: 594.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&q=80",
    },
    {
      hotelId: "paris_jardin",
      name: "Hôtel du Jardin",
      stars: 3,
      address: "5 Rue Censier, Paris",
      perNightUsd: 142.0,
      totalUsd: 426.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&q=80",
    },
    {
      hotelId: "paris_brighton",
      name: "Hôtel Brighton",
      stars: 4,
      address: "218 Rue de Rivoli, Paris",
      perNightUsd: 245.0,
      totalUsd: 735.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&q=80",
    },
    {
      hotelId: "paris_latin",
      name: "Familia Hôtel",
      stars: 2,
      address: "11 Rue des Écoles, Paris",
      perNightUsd: 98.0,
      totalUsd: 294.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&q=80",
    },
  ],
  madrid: [
    {
      hotelId: "madrid_urban",
      name: "Only YOU Boutique Hotel Madrid",
      stars: 5,
      address: "Calle Barquillo 21, Madrid",
      perNightUsd: 220.0,
      totalUsd: 660.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=640&q=80",
    },
    {
      hotelId: "madrid_petit",
      name: "Petit Palace Lealtad Plaza",
      stars: 4,
      address: "Calle de Monte Esquinza 15, Madrid",
      perNightUsd: 155.0,
      totalUsd: 465.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&q=80",
    },
    {
      hotelId: "madrid_catalonia",
      name: "Catalonia Atocha",
      stars: 4,
      address: "Calle de Atocha 81, Madrid",
      perNightUsd: 134.0,
      totalUsd: 402.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80",
    },
    {
      hotelId: "madrid_hostal",
      name: "Hostal Persal",
      stars: 2,
      address: "Plaza del Ángel 12, Madrid",
      perNightUsd: 78.0,
      totalUsd: 234.0,
      freeCancellationBefore: null,
      photoUrl:
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&q=80",
    },
  ],
};

export function cityLabel(city: string): string {
  const hit = CITIES.find((c) => c.value === city.toLowerCase());
  return hit?.label ?? city;
}

export function hotelsForCity(city: string): Offer[] {
  const key = city.trim().toLowerCase() as CityId;
  return BY_CITY[key] ?? BY_CITY.lisbon;
}
