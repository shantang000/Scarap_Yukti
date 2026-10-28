import assert from "node:assert/strict";
import test from "node:test";
import { MARKETPLACE_CORE_REALTIME_TABLES, MARKETPLACE_REALTIME_EVENTS, MARKETPLACE_REALTIME_TABLES, subscribeToMarketplaceChanges } from "../src/lib/marketplaceRealtime.js";

function makeClient() {
  const registrations = [];
  const client = {
    channelNames: [],
    callbacks: [],
    removed: [],
    channel(name) {
      const index = this.channelNames.length;
      this.channelNames.push(name);
      const channel = {
        on(event, filter, handler) {
          registrations.push({ event, filter, handler, channelIndex: index });
          return channel;
        },
        subscribe(callback) {
          client.callbacks[index] = callback;
          return channel;
        }
      };
      return channel;
    },
    removeChannel(channel) { this.removed.push(channel); return Promise.resolve("ok"); }
  };
  return { client, registrations };
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test("subscribes to marketplace tables through authenticated Postgres Changes and refreshes after connect", async () => {
  const { client, registrations } = makeClient();
  let changes = 0;
  const statuses = [];
  const unsubscribe = subscribeToMarketplaceChanges(client, {
    userId: "user-123",
    onChange: () => changes++,
    onStatus: value => statuses.push(value),
    debounceMs: 5
  });

  assert.deepEqual(client.channelNames, ["marketplace-updates-user-123", "marketplace-pickup-updates-user-123"]);
  assert.deepEqual(registrations.map(item => item.filter.table), MARKETPLACE_REALTIME_TABLES.flatMap(table => [table, table]));
  assert.ok(registrations.every(item => item.event === "postgres_changes" && item.filter.schema === "public" && item.filter.select[0] === "id"));
  assert.deepEqual([...new Set(registrations.map(item => item.filter.event))], MARKETPLACE_REALTIME_EVENTS);
  assert.deepEqual([...new Set(registrations.filter(item => item.channelIndex === 0).map(item => item.filter.table))], MARKETPLACE_CORE_REALTIME_TABLES);
  client.callbacks[0]("SUBSCRIBED");
  client.callbacks[1]("CHANNEL_ERROR");
  await delay(15);
  assert.equal(changes, 1);
  assert.deepEqual(statuses, ["connected"]);
  unsubscribe();
  assert.equal(client.removed.length, 2);
});

test("coalesces related table events and reports an unavailable subscription", async () => {
  const { client, registrations } = makeClient();
  let changes = 0;
  const statuses = [];
  subscribeToMarketplaceChanges(client, {
    userId: "user-456",
    onChange: () => changes++,
    onStatus: value => statuses.push(value),
    debounceMs: 10
  });

  client.callbacks[0]("CHANNEL_ERROR");
  registrations[0].handler({});
  registrations[1].handler({});
  await delay(20);
  assert.deepEqual(statuses, ["unavailable"]);
  assert.equal(changes, 1);
});

test("cleans up pending refreshes and ignores events after unsubscribe", async () => {
  const { client, registrations } = makeClient();
  let changes = 0;
  const unsubscribe = subscribeToMarketplaceChanges(client, {
    userId: "user-789",
    onChange: () => changes++,
    onStatus: () => {},
    debounceMs: 10
  });

  registrations[0].handler({});
  unsubscribe();
  registrations[1].handler({});
  await delay(20);
  assert.equal(changes, 0);
});
