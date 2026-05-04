"use client";

import { Bird, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function EmptyBirdState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <Bird className="w-10 h-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
        No birds yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[240px]">
        Add your first bird to start tracking their health and weight.
      </p>
      <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
        <Link href="/onboarding">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Your First Bird
        </Link>
      </Button>
    </div>
  );
}
