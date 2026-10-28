export const MARKETPLACE_CORE_REALTIME_TABLES = [
  "lots",
  "offers",
  "workflow_events",
  "activity_history"
];
export const MARKETPLACE_REALTIME_TABLES = [...MARKETPLACE_CORE_REALTIME_TABLES, "pickup_appointments"];
export const MARKETPLACE_REALTIME_EVENTS = ["INSERT", "UPDATE"];

const unavailableStatuses = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);

export function subscribeToMarketplaceChanges(client, { userId, onChange, onStatus, debounceMs = 250 }) {
  if (!client || typeof client.channel !== "function" || typeof client.removeChannel !== "function") {
    throw new TypeError("A configured Supabase client is required for marketplace updates.");
  }
  if (!userId || typeof onChange !== "function" || typeof onStatus !== "function") {
    throw new TypeError("A user ID and marketplace update callbacks are required.");
  }

  let active = true;
  let refreshTimer;
  const refreshAfterChanges = () => {
    if (!active) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      if (active) onChange();
    }, debounceMs);
  };

  const channels = [];
  const coreChannel = client.channel(`marketplace-updates-${userId}`);
  for (const table of MARKETPLACE_CORE_REALTIME_TABLES) {
    for (const event of MARKETPLACE_REALTIME_EVENTS) {
      coreChannel.on(
        "postgres_changes",
        { event, schema: "public", table, select: ["id"] },
        refreshAfterChanges
      );
    }
  }

  channels.push(coreChannel);
  coreChannel.subscribe(status => {
    if (!active) return;
    if (status === "SUBSCRIBED") {
      onStatus("connected");
      // Re-read once the subscription is live to cover changes made while it connected.
      refreshAfterChanges();
    } else if (unavailableStatuses.has(status)) {
      onStatus("unavailable");
    } else {
      onStatus("connecting");
    }
  });

  // Keep the optional coordination subscription separate, so an unapplied
  // follow-up table cannot disable live updates for the core marketplace.
  const pickupChannel = client.channel(`marketplace-pickup-updates-${userId}`);
  for (const event of MARKETPLACE_REALTIME_EVENTS) {
    pickupChannel.on(
      "postgres_changes",
      { event, schema: "public", table: "pickup_appointments", select: ["id"] },
      refreshAfterChanges
    );
  }
  channels.push(pickupChannel);
  pickupChannel.subscribe(() => {});

  return () => {
    active = false;
    clearTimeout(refreshTimer);
    for (const channel of channels) {
      try {
        const removal = client.removeChannel(channel);
        if (removal && typeof removal.catch === "function") removal.catch(() => {});
      } catch {
        // Cleanup must not interrupt React unmount or account changes.
      }
    }
  };
}
