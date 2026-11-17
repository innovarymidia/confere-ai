import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  variant?: "icon" | "full";
}

/**
 * Logo Oficial do Mercado Livre utilizando a imagem em anexo.
 */
export function MercadoLivreLogo({
  className,
  _variant = "icon",
  alt = "Mercado Livre",
  ...props
}: LogoProps & { _variant?: "icon" | "full" }) {
  return (
    <img
      src="/logos/mercadolivre.png"
      alt={alt}
      loading="lazy"
      className={cn("object-contain shrink-0 select-none", className)}
      {...props}
    />
  );
}

/**
 * Logo Oficial da Shopee utilizando a imagem em anexo.
 */
export function ShopeeLogo({
  className,
  _variant = "icon",
  alt = "Shopee",
  ...props
}: LogoProps & { _variant?: "icon" | "full" }) {
  return (
    <img
      src="/logos/shopee.png"
      alt={alt}
      loading="lazy"
      className={cn("object-contain shrink-0 select-none", className)}
      {...props}
    />
  );
}

/**
 * Componente unificado para renderizar o logo da plataforma correspondente.
 */
export function MarketplaceBadgeLogo({
  platform,
  variant = "icon",
  className,
  ...props
}: LogoProps & { platform: "mercadolivre" | "shopee" | string }) {
  if (platform === "mercadolivre" || platform === "Mercado Livre") {
    return <MercadoLivreLogo variant={variant} className={className} {...props} />;
  }
  return <ShopeeLogo variant={variant} className={className} {...props} />;
}
