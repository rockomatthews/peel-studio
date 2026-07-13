import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function TermsPage() {
  return <main className="legal-page"><Link href="/"><BrandMark /></Link><article><p className="eyebrow">Legal</p><h1>Terms of service</h1><p>You must own or have permission to use the ideas, names, images, and other material in your prompt. Do not request unlawful, infringing, hateful, deceptive, or harmful content.</p><h2>Generated artwork</h2><p>AI output can be imperfect or resemble existing styles. You are responsible for reviewing and approving the displayed design before purchase. We may reject content that violates these terms or a provider policy.</p><h2>Custom goods</h2><p>Orders are custom-made. Except for damaged, defective, or incorrectly fulfilled items, sales are final to the extent permitted by law. Report fulfillment problems promptly with photos and your order reference.</p><h2>Before launch</h2><p>Replace this starter text with terms reviewed for your business, refund policy, shipping commitments, intellectual-property process, warranties, liability limits, and governing law.</p></article></main>;
}
