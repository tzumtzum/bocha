"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";

export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    setIsDemo(url.includes("placeholder") || !url);
  }, []);

  if (!isDemo) return null;

  return (
    <div className="bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs text-center py-1.5 px-4 flex items-center justify-center gap-1.5">
      <Info className="w-3 h-3" />
      Demo mode — data is stored locally and will reset if you clear browser data
    </div>
  );
}
