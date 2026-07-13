import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function PrivacyPage() {
  return <main className="legal-page"><Link href="/"><BrandMark /></Link><article><p className="eyebrow">Legal</p><h1>Privacy policy</h1><p>Peel collects the prompts you submit, generated artwork, email, shipping address, and order details needed to create and fulfill your purchase.</p><h2>Service providers</h2><p>OpenAI processes prompts to generate artwork. Stripe processes payment and collects checkout details. Printify receives the artwork and delivery information needed to manufacture and ship your order. Vercel hosts the application and its storage.</p><h2>Retention and rights</h2><p>Order records are retained for support, fraud prevention, tax, and legal obligations. Contact the store operator to request access or deletion where applicable.</p><h2>Important</h2><p>This starter policy must be reviewed and completed with your business name, contact details, jurisdiction, retention schedule, and any required state or international disclosures before launch.</p></article></main>;
}
