const plantImagesBySpeciesId = {
  // Eugenia uniflora — Pitangueira (Surinam Cherry / Pitanga)
  "eugenia-uniflora":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/654004464/large.jpg",

  // Schinus terebinthifolia — Aroeira-pimenteira (Brazilian Peppertree)
  "schinus-terebinthifolia":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/57240422/large.jpg",

  // Pleroma mutabile — Manacá-da-serra (Glory Bush / Serra Tibouchina)
  "pleroma-mutabile":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/209454766/large.jpeg",

  // Cecropia pachystachya — Embaúba-branca (Silver Cecropia / Trumpet Tree)
  "cecropia-pachystachya":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/155708818/large.jpg",

  // Calliandra tweediei — Esponjinha-vermelha (Brazilian Powderpuff)
  "calliandra-tweediei":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/451215548/large.jpeg",

  // Campomanesia phaea — Cambuci (Cambuci Tree)
  "campomanesia-phaea":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/85544282/large.jpg",

  // Psidium cattleianum — Araçá-amarelo (Yellow Cattley Guava / Araçá)
  "psidium-cattleianum":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/125312747/large.jpg",

  // Myrcia glabra — Cabeludinha / Cambucá-mirim (Velvet Jaboticaba / Shade Myrtle)
  "myrcia-glabra":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/124084412/large.jpeg",

  // Bromelia antiacantha — Gravatá (Caraguatá Terrestrial Bromeliad)
  "bromelia-antiacantha":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/168690786/large.jpeg",

  // Salvia splendens — Cardeal-do-brejo / Sálvia-vermelha (Scarlet Sage)
  "salvia-splendens":
    "https://inaturalist-open-data.s3.amazonaws.com/photos/54804513/large.jpeg",
};

const fallbackPlantImages = Object.values(plantImagesBySpeciesId);

export function getPlantImage(plant, index = 0) {
  if (plant?.species_id && plantImagesBySpeciesId[plant.species_id]) {
    return plantImagesBySpeciesId[plant.species_id];
  }
  return fallbackPlantImages[index % fallbackPlantImages.length];
}

export default plantImagesBySpeciesId;
