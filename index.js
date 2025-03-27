const axios = require("axios");
const fs = require("fs");  // Pour écrire dans un fichier

const GOOGLE_API_KEY = ""; // 🔴 Mets ta clé API ici
const LOCATIONS = [
  "45.764043,4.835659", // 📍 Centre de Lyon
  "45.748460,4.846710", // 📍 Lyon Sud
  "45.7831,4.8724",     // 📍 Lyon Est
  "45.7277,4.8309"      // 📍 Lyon Ouest
];
const RADIUS = 5000; // 🔎 Rayon plus petit pour éviter le chevauchement
const SEARCH_TERMS = ["plumber", "artisan plombier", "chauffagiste"]; // 🔥 Plus de mots-clés

// 🔹 Récupérer les numéros de téléphone
async function getPhoneNumbers(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number&key=${GOOGLE_API_KEY}`;
  
  try {
    const { data } = await axios.get(url);
    return data.result?.formatted_phone_number || null;
  } catch (error) {
    console.error(`❌ Erreur tel pour ${placeId} :`, error.message);
    return null;
  }
}

// 🔹 Récupérer les artisans pour une recherche
async function getArtisans(location, searchTerm, nextPageToken = "") {
  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${RADIUS}&keyword=${encodeURIComponent(searchTerm)}&key=${GOOGLE_API_KEY}`;
  if (nextPageToken) url += `&pagetoken=${nextPageToken}`;

  const results = [];
  try {
    const { data } = await axios.get(url);
    if (!data.results || data.results.length === 0) return results;

    console.log(`✅ ${data.results.length} artisans trouvés avec "${searchTerm}" à ${location}`);

    for (const place of data.results) {
      const phone = await getPhoneNumbers(place.place_id);
      if (phone) {
        results.push({
          name: place.name,
          phone: phone,
          location: location,
          searchTerm: searchTerm
        });
      }
    }

    // 🔹 Charger la page suivante si dispo
    if (data.next_page_token) {
      console.log("🔄 Chargement de la page suivante...");
      setTimeout(async () => {
        const nextResults = await getArtisans(location, searchTerm, data.next_page_token);
        results.push(...nextResults);  // Ajouter les résultats de la page suivante
      }, 2000);
    }

    return results;
  } catch (error) {
    console.error("❌ Erreur API :", error.message);
    return results;
  }
}

// 🔹 Fonction pour convertir les résultats en CSV
function convertToCSV(results) {
  const header = ["Nom", "Téléphone", "Lieu", "Mot-clé"];
  const rows = results.map(item => `"${item.name}","${item.phone}","${item.location}","${item.searchTerm}"`);
  return [header.join(",")].concat(rows).join("\n");
}

// 🔥 Lancer la recherche sur toutes les zones et tous les mots-clés
async function startSearch() {
  let allResults = [];
  for (const location of LOCATIONS) {
    for (const term of SEARCH_TERMS) {
      console.log(`🔎 Recherche "${term}" à ${location}`);
      const results = await getArtisans(location, term);
      allResults = allResults.concat(results);
    }
  }

  // 🔹 Convertir en CSV et l'enregistrer dans un fichier
  if (allResults.length > 0) {
    const csv = convertToCSV(allResults);
    fs.writeFileSync("artisans.csv", csv);
    console.log("✅ Données exportées en CSV : artisans.csv");
  } else {
    console.log("❌ Aucun artisan trouvé.");
  }
}

startSearch();

