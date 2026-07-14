import Image from "next/image";

export function BrandMark({ preload = false }: { preload?: boolean }) {
  return (
    <span className="brand-mark">
      <Image
        className="brand-logo"
        src="/peel-this-logo.png"
        alt="PeelThis"
        width={1569}
        height={350}
        sizes="(max-width: 600px) 150px, 190px"
        preload={preload}
      />
    </span>
  );
}
