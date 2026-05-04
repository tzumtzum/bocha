"use client";

import { toast as sonnerToast } from "sonner";
import { getTelegramWebApp } from "./telegram/webapp";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  description?: string;
  duration?: number;
}

function showTelegramPopup(title: string, message: string) {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.showPopup({ title, message, buttons: [{ type: "ok", text: "OK" }] }).catch(() => {});
    return true;
  }
  return false;
}

export function toast(message: string, options?: ToastOptions & { type?: ToastType }) {
  const { type = "info", description, duration } = options ?? {};

  // Prefer Telegram native popup when inside Telegram for critical messages
  if (type === "error" && showTelegramPopup("Error", description ? `${message}\n${description}` : message)) {
    return;
  }

  switch (type) {
    case "success":
      sonnerToast.success(message, { description, duration });
      break;
    case "error":
      sonnerToast.error(message, { description, duration });
      break;
    case "warning":
      sonnerToast.warning(message, { description, duration });
      break;
    default:
      sonnerToast(message, { description, duration });
  }
}

export function confirmDialog(
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) {
  const tg = getTelegramWebApp();
  if (tg) {
    tg
      .showConfirm(message)
      .then((confirmed) => {
        if (confirmed) onConfirm();
        else onCancel?.();
      })
      .catch(() => onCancel?.());
    return;
  }

  // Fallback to native confirm
  if (typeof window !== "undefined" && window.confirm(message)) {
    onConfirm();
  } else {
    onCancel?.();
  }
}
