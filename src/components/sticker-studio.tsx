"use client";

import Image from "next/image";
import { ArrowRight, Check, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { formatMoney, packs, stickerShapes, stickerStyles } from "@/lib/catalog";

type GeneratedDesign = { id: string; imageUrl: string; demo: boolean; purchasable: boolean };

const ideas = [
  "A sleepy cowboy moon drinking tiny coffee",
  "A fast little tomato with racing goggles",
  "Desert mountains shaped like a friendly cat",
];

export function StickerStudio() {
  const [prompt, setPrompt] = useState(ideas[0]);
  const [style, setStyle] = useState("bold");
  const [shape, setShape] = useState("Die-cut");
  const [packId, setPackId] = useState("ten");
  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, shape }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Generation failed");
      setDesign(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    if (!design?.purchasable) return;
    setCheckingOut(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: design.id, packId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Checkout failed");
      window.location.assign(body.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout failed");
      setCheckingOut(false);
    }
  }

  return (
    <section className="studio-shell" id="studio">
      <div className="studio-heading">
        <span className="eyebrow"><Sparkles size={14} /> Your tiny design studio</span>
        <h2>Say it. See it. Stick it.</h2>
        <p>No design software. Just describe the sticker you wish existed.</p>
      </div>

      <div className="studio-card">
        <div className="studio-form">
          <div className="step-row"><span>01</span><p>Describe your sticker</p></div>
          <label className="sr-only" htmlFor="prompt">Sticker idea</label>
          <div className="prompt-box">
            <textarea id="prompt" value={prompt} maxLength={800} onChange={(event) => setPrompt(event.target.value)} placeholder="A roller-skating raccoon holding a slice of pizza..." />
            <span>{prompt.length}/800</span>
          </div>
          <div className="idea-row">
            <span>Try an idea:</span>
            {ideas.slice(1).map((idea, index) => <button key={idea} type="button" onClick={() => setPrompt(idea)}>{index === 0 ? "Racing tomato" : "Desert cat"}</button>)}
          </div>

          <div className="step-row section-step"><span>02</span><p>Pick a vibe</p></div>
          <div className="style-grid">
            {stickerStyles.map((option) => (
              <button type="button" className={style === option.id ? "style-option selected" : "style-option"} key={option.id} onClick={() => setStyle(option.id)}>
                <span className={`style-swatch swatch-${option.id}`} />
                <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                {style === option.id && <Check className="option-check" size={16} />}
              </button>
            ))}
          </div>

          <div className="shape-row">
            <span>Cut style</span>
            <div>{stickerShapes.map((option) => <button type="button" className={shape === option ? "selected" : ""} key={option} onClick={() => setShape(option)}>{option}</button>)}</div>
          </div>

          <button className="generate-button" type="button" onClick={generate} disabled={loading || prompt.trim().length < 8}>
            {loading ? <><LoaderCircle className="spin" size={19} /> Drawing your sticker…</> : <><Sparkles size={18} /> Create my sticker <ArrowRight size={18} /></>}
          </button>
          <p className="microcopy">Original artwork generated for you · usually ready in under a minute</p>
        </div>

        <div className="preview-side">
          <div className="preview-topline"><span>Live preview</span>{design && <button type="button" onClick={generate} disabled={loading}><RefreshCw size={14} /> Regenerate</button>}</div>
          <div className={loading ? "sticker-stage generating" : "sticker-stage"}>
            <div className="grid-paper" />
            {loading ? (
              <div className="generation-state"><span className="magic-orb"><Sparkles /></span><strong>Making something sticky</strong><small>Sketching · coloring · cutting</small></div>
            ) : design ? (
              <div className="sticker-result"><Image src={design.imageUrl} alt="Your generated sticker" width={520} height={520} unoptimized priority /></div>
            ) : (
              <div className="empty-preview"><span><Sparkles /></span><strong>Your idea lands here</strong><small>Describe it, choose a vibe, and watch it appear.</small></div>
            )}
          </div>

          {design && (
            <div className="order-panel">
              {design.demo && <div className="preview-notice">Preview mode — add service keys to generate and sell live artwork.</div>}
              <div className="pack-title"><strong>Choose your pack</strong><span>Free standard shipping</span></div>
              <div className="pack-grid">
                {packs.map((pack) => (
                  <button type="button" className={packId === pack.id ? "pack selected" : "pack"} key={pack.id} onClick={() => setPackId(pack.id)}>
                    {"featured" in pack && pack.featured && <em>Most popular</em>}<strong>{pack.label}</strong><span>{formatMoney(pack.priceCents)}</span>
                  </button>
                ))}
              </div>
              <button className="checkout-button" type="button" onClick={checkout} disabled={!design.purchasable || checkingOut}>
                {checkingOut ? <><LoaderCircle className="spin" size={18} /> Opening checkout…</> : design.purchasable ? <>Print & ship my stickers <ArrowRight size={18} /></> : <>Ready for service connection</>}
              </button>
              <p className="secure-line"><span>↗</span> Secure checkout by Stripe · printed by Printify</p>
            </div>
          )}
          {error && <p className="error-message" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
