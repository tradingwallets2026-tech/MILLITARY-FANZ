"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface CreditBalance {
  balance: number;
  total_purchased: number;
  total_used: number;
}

interface UseRealtimeCreditsReturn {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Subscribes to real-time credit balance changes via Supabase Realtime.
 * Updates instantly when webhook fires (Paystack → add_credits() → Realtime event).
 */
export function useRealtimeCredits(
  userId: string,
  initialBalance: number = 0
): UseRealtimeCreditsReturn {
  const [credits,   setCredits]   = useState<CreditBalance>({
    balance:          initialBalance,
    total_purchased:  0,
    total_used:       0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("credits")
        .select("balance, total_purchased, total_used")
        .eq("user_id", userId)
        .single();
      if (data) setCredits(data);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    refresh();

    // Subscribe to Realtime changes on the credits table
    const channel = supabase
      .channel(`credits:${userId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "credits",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const row = payload.new as CreditBalance;
          if (row) {
            setCredits({
              balance:         row.balance,
              total_purchased: row.total_purchased,
              total_used:      row.total_used,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, refresh]);

  return {
    balance:        credits.balance,
    totalPurchased: credits.total_purchased,
    totalUsed:      credits.total_used,
    isLoading,
    refresh,
  };
}
