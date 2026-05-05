"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTelegramBackButton, useTelegramWebApp } from "@/lib/telegram/hooks";

/**
 * Renders a custom back button when running as a standalone PWA,
 * and wires up Telegram's native BackButton when running inside Telegram.
 *
 * Use this on any non-root page that needs back navigation.
 */
export function PageBackButton({ href }: { href: string }) {
  const router = useRouter();
  const { isInTelegram } = useTelegramWebApp();

  useTelegramBackButton(() => {
    router.push(href);
  });

  if (isInTelegram) return null;

  return (
    <Button variant="ghost" size="icon" className="shrink-0" asChild>
      <Link href={href}>
        <ArrowLeft className="w-5 h-5" />
      </Link>
    </Button>
  );
}
