// Local five-star inventory per demo city.
//
// NOT WHAT THE DEMO SHOWS. Rooms on screen come from the supplier snapshot in
// fixtures/, through the gateway, because a list of hotels nobody quoted is a
// list of invented hotels: the prices here are made up and the photographs are
// stock. This pool stays for the day the booker is reachable again and the other
// cities can be captured for real; until then the selector offers the one city
// we actually have a supplier response for.

import type { Offer } from "./types";

export const CITIES = [
  { value: "lisbon", label: "Lisbon" },
  // Munich, Paris and Madrid are captured the moment the booker answers again.
  // Offering a city with no supplier response behind it would mean showing rooms
  // that were never quoted, which is the one thing this surface must not do.
] as const;

export type CityId = (typeof CITIES)[number]["value"];

export const DEFAULT_CITY: CityId = "lisbon";

function five(
  hotelId: string,
  name: string,
  address: string,
  perNightUsd: number,
  photoUrl: string,
): Offer {
  return {
    hotelId,
    name,
    stars: 5,
    address,
    perNightUsd,
    totalUsd: Number((perNightUsd * 3).toFixed(2)),
    freeCancellationBefore: null,
    photoUrl,
  };
}

/** Fifteen distinct five-star properties per city. */
const BY_CITY: Record<string, Offer[]> = {
  lisbon: [
    five("lisbon_four_seasons_roritz", "Four Seasons Hotel Ritz Lisbon", "Rua Rodrigo da Fonseca 88, Lisbon", 420, "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80"),
    five("lisbon_pestana_palace", "Pestana Palace Lisboa", "Rua Jau 54, Lisbon", 380, "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&q=80"),
    five("lisbon_olissippo_lapa", "Olissippo Lapa Palace", "Rua do Pau de Bandeira 4, Lisbon", 360, "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&q=80"),
    five("lisbon_tivoli_avenida", "Tivoli Avenida Liberdade", "Av. da Liberdade 185, Lisbon", 310, "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&q=80"),
    five("lisbon_corinthia", "Corinthia Lisbon", "Av. Columbano Bordalo Pinheiro 105, Lisbon", 290, "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&q=80"),
    five("lisbon_altis_belem", "Altis Belém Hotel & Spa", "Doca do Bom Sucesso, Lisbon", 275, "https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&q=80"),
    five("lisbon_epic_sana", "EPIC SANA Lisboa Hotel", "Av. Eng. Duarte Pacheco 15, Lisbon", 265, "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&q=80"),
    five("lisbon_real_palacio", "Real Palácio Hotel", "Rua Tomás Ribeiro 115, Lisbon", 255, "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=640&q=80"),
    five("lisbon_soft_inn", "Sofitel Lisbon Liberdade", "Av. da Liberdade 127, Lisbon", 340, "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&q=80"),
    five("lisbon_heritage_avenida", "Heritage Avenida Liberdade", "Av. da Liberdade 28, Lisbon", 248, "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80"),
    five("lisbon_memmo_alfama", "Memmo Alfama Hotel", "Travessa das Merceeiras 27, Lisbon", 235, "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&q=80"),
    five("lisbon_bairro_alto", "Bairro Alto Hotel", "Praça Luís de Camões 2, Lisbon", 320, "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80"),
    five("lisbon_porto_bay", "Porto Bay Liberdade", "Rua Rosa Araújo 16, Lisbon", 270, "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=640&q=80"),
    five("lisbon_hotel_da_baixa", "Hotel da Baixa", "Rua da Prata 80, Lisbon", 228, "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=640&q=80"),
    five("lisbon_santa_clara", "Santa Clara 1950", "Campo Santa Clara, Lisbon", 295, "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=640&q=80"),
  ],
  munich: [
    five("munich_bayerischer_hof", "Hotel Bayerischer Hof", "Promenadeplatz 2-6, Munich", 410, "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80"),
    five("munich_vier_jahreszeiten", "Hotel Vier Jahreszeiten Kempinski", "Maximilianstraße 17, Munich", 450, "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&q=80"),
    five("munich_mandarin", "Mandarin Oriental Munich", "Neuturmstraße 1, Munich", 480, "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&q=80"),
    five("munich_charles", "The Charles Hotel", "Sophienstraße 28, Munich", 390, "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&q=80"),
    five("munich_palace", "Hotel Palace München", "Trogerstraße 21, Munich", 320, "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&q=80"),
    five("munich_platzl", "Platzl Hotel", "Sparkassenstraße 10, Munich", 285, "https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&q=80"),
    five("munich_louis", "Louis Hotel", "Viktualienmarkt 6, Munich", 300, "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&q=80"),
    five("munich_torbrau", "Hotel Torbräu", "Tal 41, Munich", 275, "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=640&q=80"),
    five("munich_roomers", "Roomers Munich", "Landsberger Straße 68, Munich", 310, "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&q=80"),
    five("munich_flushing", "Flushing Hotel München", "Bayerstraße 47, Munich", 260, "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80"),
    five("munich_anna", "Hotel Anna", "Schützenstraße 1, Munich", 255, "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&q=80"),
    five("munich_maximilian", "Hotel Maximilian Munich", "Hochbrückenstraße 18, Munich", 295, "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80"),
    five("munich_geisel", "Geisel Privathotels Torbräu", "Tal 41, Munich", 330, "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=640&q=80"),
    five("munich_ruby_lily", "Ruby Lily Hotel Munich", "Bayerstraße 95, Munich", 245, "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=640&q=80"),
    five("munich_cortina", "Hotel Cortina", "Ledererstraße 8, Munich", 305, "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=640&q=80"),
  ],
  paris: [
    five("paris_ritz", "Ritz Paris", "15 Place Vendôme, Paris", 920, "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&q=80"),
    five("paris_plaza_athenee", "Hôtel Plaza Athénée", "25 Av. Montaigne, Paris", 880, "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&q=80"),
    five("paris_le_bristol", "Le Bristol Paris", "112 Rue du Faubourg Saint-Honoré, Paris", 850, "https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&q=80"),
    five("paris_george_v", "Four Seasons Hotel George V", "31 Av. George V, Paris", 900, "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&q=80"),
    five("paris_crillon", "Hôtel de Crillon", "10 Place de la Concorde, Paris", 870, "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=640&q=80"),
    five("paris_meurice", "Le Meurice", "228 Rue de Rivoli, Paris", 780, "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&q=80"),
    five("paris_brighton", "Hôtel Brighton", "218 Rue de Rivoli, Paris", 420, "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80"),
    five("paris_malte", "Hôtel de Malte Opera", "63 Rue de Richelieu, Paris", 310, "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&q=80"),
    five("paris_jardin", "Hôtel du Jardin", "5 Rue Censier, Paris", 280, "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80"),
    five("paris_lutetia", "Hôtel Lutetia", "45 Boulevard Raspail, Paris", 520, "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=640&q=80"),
    five("paris_shangri_la", "Shangri-La Paris", "10 Avenue d'Iéna, Paris", 760, "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=640&q=80"),
    five("paris_peninsula", "The Peninsula Paris", "19 Avenue Kléber, Paris", 810, "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=640&q=80"),
    five("paris_cheval_blanc", "Cheval Blanc Paris", "8 Quai du Louvre, Paris", 950, "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80"),
    five("paris_mandarin", "Mandarin Oriental Paris", "251 Rue Saint-Honoré, Paris", 720, "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&q=80"),
    five("paris_park_hyatt", "Park Hyatt Paris-Vendôme", "5 Rue de la Paix, Paris", 690, "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&q=80"),
  ],
  madrid: [
    five("madrid_ritz", "Hotel Ritz Madrid", "Plaza de la Lealtad 5, Madrid", 620, "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=640&q=80"),
    five("madrid_villa_magna", "Hotel Villa Magna", "Paseo de la Castellana 22, Madrid", 540, "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=640&q=80"),
    five("madrid_urbany", "Only YOU Boutique Hotel Madrid", "Calle Barquillo 21, Madrid", 310, "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=640&q=80"),
    five("madrid_palace", "The Westin Palace Madrid", "Plaza de las Cortes 7, Madrid", 380, "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=640&q=80"),
    five("madrid_urso", "URSO Hotel & Spa", "Calle de Mejía Lequerica 8, Madrid", 290, "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80"),
    five("madrid_me_madrid", "ME Madrid Reina Victoria", "Plaza de Santa Ana 14, Madrid", 275, "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=640&q=80"),
    five("madrid_petit", "Petit Palace Lealtad Plaza", "Calle de Monte Esquinza 15, Madrid", 260, "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=640&q=80"),
    five("madrid_catalonia", "Catalonia Atocha", "Calle de Atocha 81, Madrid", 245, "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=640&q=80"),
    five("madrid_vp_jardines", "VP Jardín de Recoletos", "Calle de Gil de Santivañes 6, Madrid", 300, "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=80"),
    five("madrid_orfila", "Hotel Orfila", "Calle de Orfila 6, Madrid", 350, "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=640&q=80"),
    five("madrid_unico", "Único Hotel Madrid", "Calle de Claudio Coello 67, Madrid", 335, "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=640&q=80"),
    five("madrid_bless", "BLESS Hotel Madrid", "Calle de Velázquez 62, Madrid", 365, "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=640&q=80"),
    five("madrid_thompson", "Thompson Madrid", "Plaza del Carmen 4, Madrid", 320, "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=640&q=80"),
    five("madrid_rosewood", "Rosewood Villa Magna", "Paseo de la Castellana 22, Madrid", 560, "https://images.unsplash.com/photo-1455587734955-081b22074882?w=640&q=80"),
    five("madrid_barcelo", "Barceló Torre de Madrid", "Plaza de España 18, Madrid", 285, "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=640&q=80"),
  ],
};

export function cityLabel(city: string): string {
  const hit = CITIES.find((c) => c.value === city.toLowerCase());
  return hit?.label ?? city;
}

export function hotelsForCity(city: string): Offer[] {
  const key = city.trim().toLowerCase();
  return BY_CITY[key] ?? BY_CITY.lisbon ?? [];
}

/** Shuffle the city's pool and take `count` rooms (default 5). */
export function pickHotels(city: string, count = 5): Offer[] {
  const pool = [...hotelsForCity(city)];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}
