"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Map-Google Page - Redirect to main map page
 */
export default function MapGooglePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/map');
  }, [router]);
  
  return null;
}
