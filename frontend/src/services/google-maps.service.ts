const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyB3IJ6vI1b4ACGNZTJ7wG_1A-au_Mw2KBg';

export const googleMapsService = {
  computeRouteWithTolls: async (origin: string, destination: string) => {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API Key não configurada.");
    }

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const body = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      extraComputations: ["TOLLS"],
      languageCode: "pt-BR",
      units: "METRIC"
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.travelAdvisory,routes.polyline.encodedPolyline'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (!response.ok || !data.routes || data.routes.length === 0) {
        throw new Error(data.error?.message || "Rota não encontrada");
      }

      const route = data.routes[0];
      const distanceKm = route.distanceMeters ? route.distanceMeters / 1000 : 0;
      const durationMin = route.duration ? Math.ceil(parseInt(route.duration) / 60) : 0;
      
      let tollCost = 0;
      if (route.travelAdvisory?.tollInfo?.estimatedPrice?.length > 0) {
        const toll = route.travelAdvisory.tollInfo.estimatedPrice.find((p: any) => p.currencyCode === 'BRL') || route.travelAdvisory.tollInfo.estimatedPrice[0];
        tollCost = parseFloat(toll.units || '0') + (toll.nanos ? toll.nanos / 1e9 : 0);
      }

      return {
        distanceKm,
        durationMin,
        tollCost, // Custo estimado total (geralmente carro de passeio)
        encodedPolyline: route.polyline?.encodedPolyline || ''
      };
    } catch (error) {
      console.error('Google Routes API Error:', error);
      throw error;
    }
  },

  getStaticMapUrl: (origin: string, destination: string) => {
    if (!GOOGLE_MAPS_API_KEY) {
      return ''; // No map if no key
    }
    const path = `color:blue|weight:5|${encodeURIComponent(origin)}|${encodeURIComponent(destination)}`;
    return `https://maps.googleapis.com/maps/api/staticmap?size=600x300&path=${path}&markers=color:green|label:A|${encodeURIComponent(origin)}&markers=color:red|label:B|${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
  }
};
