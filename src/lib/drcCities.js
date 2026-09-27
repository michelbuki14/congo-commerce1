// Approximate city centres used to place activity on the delivery map.
export const DRC_CITIES = {
  kinshasa: [-4.325, 15.322],
  lubumbashi: [-11.664, 27.483],
  goma: [-1.679, 29.222],
  bukavu: [-2.508, 28.861],
  kisangani: [0.515, 25.191],
  matadi: [-5.816, 13.45],
  mbujimayi: [-6.136, 23.59],
  'mbuji-mayi': [-6.136, 23.59],
  kananga: [-5.896, 22.417],
  kolwezi: [-10.716, 25.472],
  likasi: [-10.981, 26.733],
  boma: [-5.85, 13.05],
  mbandaka: [0.048, 18.26],
  kikwit: [-5.041, 18.816],
  uvira: [-3.395, 29.137],
  bunia: [1.566, 30.252],
};

export const cityCoords = (city) =>
  DRC_CITIES[String(city || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || null;