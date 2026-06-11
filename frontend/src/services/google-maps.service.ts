const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const googleMapsService = {
  getDistanceMatrix: async (origin: string, destination: string) => {
    if (!GOOGLE_MAPS_API_KEY) {
      // Mocked calculation if no API Key
      console.warn("Using mocked distance calculation because no Google API Key is provided.");
      return {
        distanceKm: Math.floor(Math.random() * 100) + 10,
        durationMin: Math.floor(Math.random() * 120) + 20
      };
    }

    try {
      // Since Distance Matrix API block CORS directly from frontend, typically it is proxied via backend.
      // But for this project scope, if there is a way or using a CORS proxy.
      // Assuming we have a proxy or we use the Google Maps JS SDK.
      // Since it's a direct API call:
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
        const element = data.rows[0].elements[0];
        return {
          distanceKm: element.distance.value / 1000,
          durationMin: Math.ceil(element.duration.value / 60)
        };
      }
      throw new Error("Unable to calculate distance");
    } catch (error) {
      console.error(error);
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
