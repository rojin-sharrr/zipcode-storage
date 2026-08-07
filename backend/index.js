require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/api/search', async (req, res) => {
  const { zipCode } = req.body;

  if (!zipCode || !/^\d{5}$/.test(String(zipCode).trim())) {
    return res.status(400).json({ error: 'Please enter a valid 5-digit ZIP code.' });
  }

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key is not configured on the server.' });
  }

  try {
    // Step 1: Geocode ZIP → lat/lng
    const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: zipCode.trim(), key: GOOGLE_API_KEY },
    });

    if (geoRes.data.status !== 'OK') {
      return res.status(400).json({ error: 'Could not locate that ZIP code. Please try another.' });
    }

    const { lat, lng } = geoRes.data.results[0].geometry.location;

    // Step 2: Run 3 parallel searches with different query terms to maximize results.
    // Google Places caps at 20 per query — 3 queries with deduplication = up to 60 unique results.
    const queries = ['self storage', 'storage units', 'mini storage'];

    const searchRequests = queries.map((query) =>
      axios
        .get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
          params: { query, location: `${lat},${lng}`, radius: 16093, key: GOOGLE_API_KEY },
        })
        .catch(() => ({ data: { results: [] } }))
    );

    const searchResponses = await Promise.all(searchRequests);

    // Deduplicate by place_id
    const placesMap = new Map();
    for (const res of searchResponses) {
      for (const place of res.data.results || []) {
        if (!placesMap.has(place.place_id)) {
          placesMap.set(place.place_id, place);
        }
      }
    }

    const allPlaces = [...placesMap.values()];
    console.log(`  Found ${allPlaces.length} unique places across ${queries.length} queries`);

    if (allPlaces.length === 0) {
      return res.json({ results: [] });
    }

    // Step 3: Fetch full details for every unique place in parallel
    const detailRequests = allPlaces.map((place) =>
      axios
        .get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            place_id: place.place_id,
            fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url',
            key: GOOGLE_API_KEY,
          },
        })
        .catch(() => ({ data: { result: {} } }))
    );

    const detailResponses = await Promise.all(detailRequests);

    const results = detailResponses.map((detail, i) => {
      const d = detail.data.result || {};
      return {
        id: allPlaces[i].place_id,
        name: d.name || allPlaces[i].name,
        address: d.formatted_address || allPlaces[i].formatted_address || '',
        phone: d.formatted_phone_number || null,
        rating: d.rating || null,
        totalRatings: d.user_ratings_total || 0,
        hasWebsite: !!d.website,
        website: d.website || null,
        mapsUrl:
          d.url ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            (d.name || allPlaces[i].name) + ' ' + (d.formatted_address || '')
          )}`,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  StoreFinder backend · http://localhost:${PORT}`);
  console.log('  Google API: live\n');
});
