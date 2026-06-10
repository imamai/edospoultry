"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Redirects old /depot/quotations/new URL to the unified Sales Terminal */
export default function QuotationRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/depot/pos"); }, [router]);
  return null;
}
