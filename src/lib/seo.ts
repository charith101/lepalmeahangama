import type { Metadata } from "next"
import {
  APP_URL,
  HOTEL_ADDRESS_LOCALITY,
  HOTEL_ADDRESS_REGION,
  HOTEL_ADDRESS_STREET,
  HOTEL_CHECK_IN,
  HOTEL_CHECK_OUT,
  HOTEL_DESCRIPTION,
  HOTEL_EMAIL,
  HOTEL_IMAGES,
  HOTEL_LATITUDE,
  HOTEL_LONGITUDE,
  HOTEL_MAP_LINK,
  HOTEL_NAME,
  HOTEL_PHONE_TEL,
} from "@/lib/constants"

/**
 * Canonical + social metadata for a public page. Keeping this in one place
 * stops child routes from silently inheriting the homepage's og:url.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = "/og-image.jpg",
}: {
  title: string
  description: string
  path: string
  image?: string
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: path,
      siteName: HOTEL_NAME,
      title: `${title} | ${HOTEL_NAME}`,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${HOTEL_NAME} — ${title.toLowerCase()}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${HOTEL_NAME}`,
      description,
      images: [image],
    },
  }
}

export const hotelSchema = {
  "@context": "https://schema.org",
  "@type": "Hotel",
  "@id": `${APP_URL}/#hotel`,
  name: HOTEL_NAME,
  alternateName: "Le Palme",
  description: HOTEL_DESCRIPTION,
  url: APP_URL,
  logo: `${APP_URL}/logo.png`,
  image: HOTEL_IMAGES,
  telephone: HOTEL_PHONE_TEL,
  email: HOTEL_EMAIL,
  hasMap: HOTEL_MAP_LINK,
  address: {
    "@type": "PostalAddress",
    streetAddress: HOTEL_ADDRESS_STREET,
    addressLocality: HOTEL_ADDRESS_LOCALITY,
    addressRegion: HOTEL_ADDRESS_REGION,
    addressCountry: "LK",
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
  checkinTime: HOTEL_CHECK_IN,
  checkoutTime: HOTEL_CHECK_OUT,
  currenciesAccepted: "LKR, USD, EUR",
  paymentAccepted: "Cash, Credit Card",
  petsAllowed: false,
}

// Site-level entity. Lets Google associate the brand name with the domain
// instead of falling back to the bare hostname in search results.
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${APP_URL}/#website`,
  name: HOTEL_NAME,
  alternateName: "Le Palme",
  url: APP_URL,
  inLanguage: "en",
  publisher: { "@id": `${APP_URL}/#hotel` },
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
