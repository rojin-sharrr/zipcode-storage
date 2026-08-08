// Vercel serverless function — replaces the old Express backend.
// Runs server-side only; GOOGLE_API_KEY here is never sent to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { zipCode } = req.body || {};

  if (!zipCode || !/^\d{5}$/.test(String(zipCode).trim())) {
    return res.status(400).json({ error: 'Please enter a valid 5-digit ZIP code.' });
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Google API key is not configured on the server.' });
  }

  try {
    // Step 1: Geocode ZIP → lat/lng
    const geoUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    geoUrl.searchParams.set('address', zipCode.trim());
    geoUrl.searchParams.set('key', GOOGLE_API_KEY);

    const geoData = await fetch(geoUrl).then((r) => r.json());

    if (geoData.status !== 'OK') {
      return res.status(400).json({ error: 'Could not locate that ZIP code. Please try another.' });
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    // Step 2: Run 3 parallel searches with different query terms to maximize results.
    // Google Places caps at 20 per query — 3 queries with deduplication = up to 60 unique results.
    const queries = ['self storage', 'storage units', 'mini storage'];

    const searchResponses = await Promise.all(
      queries.map((query) => {
        const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
        url.searchParams.set('query', query);
        url.searchParams.set('location', `${lat},${lng}`);
        url.searchParams.set('radius', '16093');
        url.searchParams.set('key', GOOGLE_API_KEY);
        return fetch(url)
          .then((r) => r.json())
          .catch(() => ({ results: [] }));
      })
    );

    // Deduplicate by place_id
    const placesMap = new Map();
    for (const data of searchResponses) {
      for (const place of data.results || []) {
        if (!placesMap.has(place.place_id)) {
          placesMap.set(place.place_id, place);
        }
      }
    }

    const allPlaces = [...placesMap.values()];

    if (allPlaces.length === 0) {
      return res.status(200).json({ results: [] });
    }

    // Step 3: Fetch full details for every unique place in parallel
    const detailResponses = await Promise.all(
      allPlaces.map((place) => {
        const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        url.searchParams.set('place_id', place.place_id);
        url.searchParams.set(
          'fields',
          'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url'
        );
        url.searchParams.set('key', GOOGLE_API_KEY);
        return fetch(url)
          .then((r) => r.json())
          .catch(() => ({ result: {} }));
      })
    );

    const results = detailResponses.map((detail, i) => {
      const d = detail.result || {};
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

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Search error:', err.message);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
