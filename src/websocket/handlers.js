// websocket/handlers.js

/**
 * Called once per Redis pub/sub message.
 * Parses the raw Redis message, finds the correct io room,
 * and emits the right event to connected clients.
 *
 * @param {import("socket.io").Server} io
 * @param {string} channel  - Redis channel name e.g. "channel:positions:9158"
 * @param {string} rawMessage - Raw JSON string from Redis
 */
export const handleChannelMessage = (io, channel, rawMessage) => {
  let payload;

  try {
    payload = JSON.parse(rawMessage);
  } catch (err) {
    console.error(`[WS] Failed to parse message on channel "${channel}":`, err.message);
    return;
  }

  const { event, sessionKey, room, data, timestamp } = payload;

  if (!event || (!sessionKey && !room)) {
    console.warn(`[WS] Malformed payload on channel "${channel}":`, payload);
    return;
  }

  const resolvedRoom = room ?? `session:${sessionKey}`;

  // Remove the clientCount === 0 early return — just always emit
  io.to(resolvedRoom).emit(event, { data, timestamp, sessionKey });

  console.log(`[WS] → ${event} to room "${resolvedRoom}"`);
};