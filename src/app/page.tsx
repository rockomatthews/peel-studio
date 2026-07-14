import { ArrowDown, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { StickerStudio } from "@/components/sticker-studio";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <Link href="/" aria-label="PeelThis home"><BrandMark preload /></Link>
        <nav><a href="#how">How it works</a><a href="#studio">Create yours</a></nav>
        <a className="nav-cta" href="#studio">Make a sticker <Sparkles size={15} /></a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-sticker sticker-one">GOOD<br />IDEAS<br /><span>STICK</span></div>
          <div className="hero-sticker sticker-two">✦</div>
          <div className="hero-copy">
            <p className="eyebrow"><span /> From thought to sticker in minutes</p>
            <h1>Your weird little idea<br />belongs on a <em>sticker.</em></h1>
            <p className="hero-sub">Describe anything. We turn it into original, print-ready art and ship the real stickers to your door.</p>
            <div className="hero-actions"><a href="#studio" className="primary-link">Create a sticker <Sparkles size={18} /></a><a href="#how">See how it works <ArrowDown size={17} /></a></div>
            <div className="trust-row"><span><ShieldCheck /> Secure payment</span><span><PackageCheck /> Quality print</span><span><Truck /> Shipped to you</span></div>
          </div>
        </section>
        <StickerStudio />
        <section className="how-section" id="how">
          <p className="eyebrow">Simple by design</p><h2>One idea. Three steps. Zero inventory.</h2>
          <div className="how-grid">
            <article><span>1</span><Sparkles /><h3>Describe it</h3><p>Tell us the character, phrase, mood, colors—whatever is in your head.</p></article>
            <article><span>2</span><ShieldCheck /><h3>Approve it</h3><p>Choose your favorite result and a pack size. Regenerate anytime before paying.</p></article>
            <article><span>3</span><Truck /><h3>We ship it</h3><p>Stripe confirms payment, Printify prints it, and tracking follows automatically.</p></article>
          </div>
        </section>
      </main>
      <footer><BrandMark /><p>Make something worth sticking around.</p><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
    </>
  );
}
