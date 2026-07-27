import { APP_URL } from "@/lib/constants"

export const hotelSchema = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  name: "Le Palme Ahangama",
  description: "Beachfront hotel in Ahangama, Sri Lanka",
  url: APP_URL,
  telephone: "+94-XXX-XXXXXX",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ahangama Beach Road",
    addressLocality: "Ahangama",
    addressRegion: "Southern Province",
    addressCountry: "LK",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 5.9833,
    longitude: 80.3500,
  },
  priceRange: "$80 - $150",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Beachfront", value: true },
    { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Restaurant", value: true },
    { "@type": "LocationFeatureSpecification", name: "Surfboard Rental", value: true },
    { "@type": "LocationFeatureSpecification", name: "Bicycle Rental", value: true },
    { "@type": "LocationFeatureSpecification", name: "Airport Transfer", value: true },
  ],
  checkInTime: "14:00",
  checkOutTime: "11:00",
  currenciesAccepted: "USD",
  paymentAccepted: "Cash, Credit Card",
  starRating: { "@type": "Rating", ratingValue: "4" },
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
