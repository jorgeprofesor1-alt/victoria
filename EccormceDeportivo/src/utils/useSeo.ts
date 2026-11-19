import { useEffect } from 'react';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  jsonLd?: Record<string, any>;
}

const DEFAULT_TITLE = 'Victoria | Nutrición Deportiva, Geles Isotónicos y Endurance Colombia';
const DEFAULT_DESC = 'Tienda especializada en nutrición deportiva y endurance de alto rendimiento en Colombia. Geles energéticos, hidratación, electrolitos y suplementos con envíos garantizados.';

export function useSeo({
  title,
  description,
  keywords,
  ogImage,
  canonicalUrl,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    // 1. Título de la pestaña
    const fullTitle = title ? `${title} | Victoria Sports Nutrition` : DEFAULT_TITLE;
    document.title = fullTitle;

    // 2. Metadatos de descripción
    const finalDesc = description || DEFAULT_DESC;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', finalDesc);
    }

    // 3. Open Graph Title & Description
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', finalDesc);

    // 4. Open Graph Image
    if (ogImage) {
      const ogImgTag = document.querySelector('meta[property="og:image"]');
      if (ogImgTag) ogImgTag.setAttribute('content', ogImage);
    }

    // 5. Canonical
    if (canonicalUrl) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (linkCanonical) linkCanonical.setAttribute('href', canonicalUrl);
    }

    // 6. Keywords
    if (keywords) {
      let metaKw = document.querySelector('meta[name="keywords"]');
      if (metaKw) metaKw.setAttribute('content', keywords);
    }

    // 7. Dynamic JSON-LD (Schema.org)
    let scriptTag: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.id = 'dynamic-seo-jsonld';
      scriptTag.text = JSON.stringify(jsonLd);
      document.head.appendChild(scriptTag);
    }

    return () => {
      // Limpiar schema dinámico al salir de la página
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, [title, description, keywords, ogImage, canonicalUrl, jsonLd]);
}

