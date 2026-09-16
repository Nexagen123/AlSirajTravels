import AboutSection from "../AboutSection";
import ServicesSection from "../ServicesSection";
import ChooseUsSection from "../ChooseUsSection";
import SpecialOffer from "../SpecialOffer/SpecialOffer";
import DestinationsSection from "../Destination/Destinations";
import PartnersSection from "../PartnersSection";

export default function CommonSections() {
  return (
    <>
      <ServicesSection />
      <AboutSection />
      <SpecialOffer />
      {/* <DestinationsSection /> */}
      <ChooseUsSection />
      <PartnersSection />
    </>
  );
}
