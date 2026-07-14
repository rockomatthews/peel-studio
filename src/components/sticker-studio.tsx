"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { ArrowRight, ImagePlus, LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { formatMoney, packs } from "@/lib/catalog";

type PrintOption = {
  variantId: number;
  title: string;
  productTitle: string;
  width: number;
  height: number;
};

type GeneratedDesign = {
  id: string;
  imageUrl: string;
  purchasable: boolean;
  notice?: string;
  printOption: PrintOption;
};

type ReferenceFile = { id: string; file: File; preview: string };

export function StickerStudio() {
  const [prompt, setPrompt] = useState("");
  const [packId, setPackId] = useState("three");
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [printOptions, setPrintOptions] = useState<PrintOption[]>([]);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/print-options")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load print sizes");
        setPrintOptions(body.options);
        setVariantId(body.options[0]?.variantId ?? null);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load print sizes"));
  }, []);

  function addReferences(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const valid = selected.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 8 * 1024 * 1024);
    if (valid.length !== selected.length) setError("References must be PNG, JPG, or WebP files under 8 MB.");
    setReferences((current) => [
      ...current,
      ...valid.slice(0, Math.max(0, 3 - current.length)).map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })),
    ]);
    event.target.value = "";
  }

  function removeReference(id: string) {
    setReferences((current) => {
      const removed = current.find((reference) => reference.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((reference) => reference.id !== id);
    });
  }

  async function uploadReferences() {
    return Promise.all(references.map(async ({ file }) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const blob = await upload(`references/${crypto.randomUUID()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/references/upload",
      });
      return blob.url;
    }));
  }

  async function generate() {
    if (!variantId) return;
    setLoading(true);
    setError("");
    try {
      const referenceImageUrls = await uploadReferences();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, variantId, referenceImageUrls }),
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
          <div className="limits-note"><strong>Your instructions are authoritative</strong><span>The artwork comes only from your description and any images you upload. Include every visual detail that must be preserved.</span></div>

          <div className="step-row section-step"><span>02</span><p>Add references <small>optional · max 3</small></p></div>
          <label className="reference-upload">
            <ImagePlus size={20} />
            <span><strong>Upload PNG, JPG, or WebP</strong><small>Treated as authoritative visual references · 8 MB each</small></span>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addReferences} disabled={references.length >= 3} />
          </label>
          {references.length > 0 &&
            <div className="reference-list">
              {references.map((reference) => <div className="reference-thumb" key={reference.id}><Image src={reference.preview} alt={reference.file.name} width={76} height={76} unoptimized /><button type="button" onClick={() => removeReference(reference.id)} aria-label={`Remove ${reference.file.name}`}><X size={13} /></button></div>)}
            </div>
          }

          <div className="step-row section-step"><span>03</span><p>Choose the printed size</p></div>
          <div className="print-option-grid">
            {printOptions.map((option) => <button type="button" className={variantId === option.variantId ? "print-option selected" : "print-option"} key={option.variantId} onClick={() => setVariantId(option.variantId)}><strong>{option.title}</strong><span>{option.productTitle}</span><small>{option.width} × {option.height}px print canvas</small></button>)}
          </div>

          <button className="generate-button" type="button" onClick={generate} disabled={loading || !variantId || prompt.trim().length < 8}>
            {loading ? <><LoaderCircle className="spin" size={19} /> Drawing & fitting your sticker…</> : <><Sparkles size={18} /> Create my sticker <ArrowRight size={18} /></>}
          </button>
          <p className="microcopy">AI artwork is cropped, padded, and exported to the exact selected Printify canvas</p>
        </div>

        <div className="preview-side">
          <div className="preview-topline"><span>Print preview</span>{design && <button type="button" onClick={generate} disabled={loading}><RefreshCw size={14} /> Regenerate</button>}</div>
          <div className={loading ? "sticker-stage generating" : "sticker-stage"}>
            <div className="grid-paper" /><div className="print-safe-guide" />
            {loading ? (
              <div className="generation-state"><span className="magic-orb"><Sparkles /></span><strong>Making something sticky</strong><small>Drawing · isolating · sizing for print</small></div>
            ) : design ? (
              <div className="sticker-result"><Image src={design.imageUrl} alt="Your generated sticker" width={520} height={520} unoptimized priority /></div>
            ) : (
              <div className="empty-preview"><span><Sparkles /></span><strong>Your idea lands here</strong><small>The dashed line marks the protected print area.</small></div>
            )}
          </div>
          {(design?.printOption || printOptions.find((option) => option.variantId === variantId)) && <p className="canvas-spec">Exact export: {(design?.printOption || printOptions.find((option) => option.variantId === variantId))?.width} × {(design?.printOption || printOptions.find((option) => option.variantId === variantId))?.height}px PNG · transparent background</p>}

          {design && (
            <div className="order-panel">
              {design.notice && <div className="preview-notice">{design.notice}</div>}
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
