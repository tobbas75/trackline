import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Projects } from "@/components/projects";
import { About } from "@/components/about";
import { Approach } from "@/components/approach";
import { Contact } from "@/components/contact";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <div className="dust-line" />
        <Projects />
        <div className="dust-line" />
        <About />
        <div className="dust-line" />
        <Approach />
        <div className="dust-line" />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
