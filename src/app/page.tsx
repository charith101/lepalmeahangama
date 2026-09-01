import { HeroSection } from "@/components/public/HeroSection"
import { WelcomeSection } from "@/components/public/WelcomeSection"
import { HotelIntroSection } from "@/components/public/HotelIntroSection"
import { RoomShowcase } from "@/components/public/RoomShowcase"
import { RestaurantSection } from "@/components/public/RestaurantSection"
import { ExperiencesSection } from "@/components/public/ExperiencesSection"
import { EventsSection } from "@/components/public/EventsSection"

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <WelcomeSection />
      <HotelIntroSection />
      <RoomShowcase />
      <RestaurantSection />
      <ExperiencesSection />
      <EventsSection />
      {/* <NewsletterSection /> */}
    </>
  )
}
