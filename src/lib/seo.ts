import {
  APP_URL,
  HOTEL_ADDRESS_COUNTRY,
  HOTEL_ADDRESS_LOCALITY,
  HOTEL_ADDRESS_REGION,
  HOTEL_ADDRESS_STREET,
  HOTEL_DESCRIPTION,
  HOTEL_LATITUDE,
  HOTEL_LONGITUDE,
  HOTEL_NAME,
  HOTEL_PHONE_TEL,
} from "@/lib/constants"

export const hotelSchema = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: HOTEL_NAME,
  description: HOTEL_DESCRIPTION,
  url: APP_URL,
  telephone: HOTEL_PHONE_TEL,
  address: {
    "@type": "PostalAddress",
    streetAddress: HOTEL_ADDRESS_STREET,
    addressLocality: HOTEL_ADDRESS_LOCALITY,
    addressRegion: HOTEL_ADDRESS_REGION,
    addressCountry: HOTEL_ADDRESS_COUNTRY,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: HOTEL_LATITUDE,
    longitude: HOTEL_LONGITUDE,
  },
  priceRange: "$$",
  starRating: { "@type": "Rating", ratingValue: "4" },
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: true },
    { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Family Rooms", value: true },
    { "@type": "LocationFeatureSpecification", name: "Private Bathroom", value: true },
    { "@type": "LocationFeatureSpecification", name: "Balcony", value: true },
    { "@type": "LocationFeatureSpecification", name: "Garden View", value: true },
    { "@type": "LocationFeatureSpecification", name: "Sun Terrace", value: true },
    { "@type": "LocationFeatureSpecification", name: "Garden", value: true },
    { "@type": "LocationFeatureSpecification", name: "Shared Lounge", value: true },
    { "@type": "LocationFeatureSpecification", name: "Outdoor Fireplace", value: true },
    { "@type": "LocationFeatureSpecification", name: "Children's Playground", value: true },
    { "@type": "LocationFeatureSpecification", name: "Shared Kitchen", value: true },
    { "@type": "LocationFeatureSpecification", name: "Coffee Shop", value: true },
    { "@type": "LocationFeatureSpecification", name: "Outdoor Seating Area", value: true },
    { "@type": "LocationFeatureSpecification", name: "Full English / Irish Breakfast", value: true },
    { "@type": "LocationFeatureSpecification", name: "Vegetarian & Asian Options", value: true },
    { "@type": "LocationFeatureSpecification", name: "Airport Shuttle", value: true },
    { "@type": "LocationFeatureSpecification", name: "Free Private Parking", value: true },
    { "@type": "LocationFeatureSpecification", name: "Concierge Service", value: true },
    { "@type": "LocationFeatureSpecification", name: "Room Service", value: true },
    { "@type": "LocationFeatureSpecification", name: "Currency Exchange", value: true },
    { "@type": "LocationFeatureSpecification", name: "Bicycle Rental", value: true },
    { "@type": "LocationFeatureSpecification", name: "Surfboard Rental", value: true },
    { "@type": "LocationFeatureSpecification", name: "Diving", value: true },
    { "@type": "LocationFeatureSpecification", name: "Fishing", value: true },
  ],
  checkInTime: "14:00",
  checkOutTime: "11:00",
  currenciesAccepted: "LKR, USD, EUR",
  paymentAccepted: "Cash",
  petsAllowed: false,
}

export function roomSchema(
  name: string,
  description: string,
  price: number,
  occupancy: number,
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name,
    description,
    url,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: occupancy,
    },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  }
}

export function bookingOrderSchema(
  bookingNumber: string,
  roomName: string,
  checkIn: string,
  checkOut: string,
  price: number,
  status: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Order",
    orderNumber: bookingNumber,
    acceptedOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "HotelRoom",
        name: roomName,
      },
      price,
      priceCurrency: "USD",
    },
    orderDate: new Date().toISOString(),
    orderStatus: status === "confirmed" ? "https://schema.org/OrderConfirmed" : "https://schema.org/OrderPending",
    startDate: checkIn,
    endDate: checkOut,
  }
}
