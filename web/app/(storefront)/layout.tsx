import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFabLoader from "@/components/WhatsAppFabLoader";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFabLoader />
    </>
  );
}
