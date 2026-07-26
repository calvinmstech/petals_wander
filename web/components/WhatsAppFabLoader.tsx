"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import WhatsAppFab from "@/components/WhatsAppFab";
import type { HomeSettings } from "@/lib/types";

// Fetches the WhatsApp number once and renders the floating button on every
// storefront page. Kept separate so the storefront layout can stay a server
// component. WhatsAppFab renders nothing until (and unless) a number is set.
export default function WhatsAppFabLoader() {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: HomeSettings }>("/settings/home")
      .then((res) => setNumber(res.data.whatsapp_number ?? null))
      .catch(() => {});
  }, []);

  return <WhatsAppFab number={number} />;
}
