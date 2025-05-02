import { createSchema, createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";
import { resolvers } from "./Query";
import { db } from "./db";

const fs = require("fs");
const path = require("path");

// Schema setup
export const schema = createSchema<{ 
  isSubscriptionUpdate: boolean;
}>({
  typeDefs: fs.readFileSync(
    path.join(__dirname, "../schema/schema.graphql"),
    "utf-8"
  ),
  resolvers,
});

// Server initialization
function main() {
  const yoga = createYoga({ 
    schema,
    graphiql: {
      subscriptionsProtocol: 'WS'
    },
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    context: (): { isSubscriptionUpdate: boolean } => ({
      isSubscriptionUpdate: false
    })
  });

  const server = createServer(yoga);

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server,
    path: '/graphql'
  });

  useServer(
    {
      // Remove the onConnect authentication for development
      // Keep this simple for now to avoid the auth token error
      onConnect: () => {
        console.log('[WS] New connection established');
        return true; // Always accept connections in development
      },
      onDisconnect: (ctx) => {
        const contextValue = ctx.extra.contextValue as unknown as { subscriptionId?: string };
        console.log(`[WS] Disconnected: ${contextValue?.subscriptionId}`);
      },
      execute: (args) => (args.rootValue as { execute: Function }).execute(args),
      subscribe: (args) => (args.rootValue as { subscribe: Function }).subscribe(args),
      onSubscribe: async (ctx, msg) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
          ...ctx,
          req: ctx.extra.request,
          socket: ctx.extra.socket,
          params: msg.payload
        });

        const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        console.log(`[WS] New subscription ID: ${subscriptionId}`);

        const args = {
          schema,
          operationName: msg.payload.operationName,
          document: parse(msg.payload.query),
          variableValues: msg.payload.variables,
          contextValue: await contextFactory({ 
            isSubscriptionUpdate: true,
            subscriptionId,
            isInitialConnection: true
          }),
          rootValue: {
            execute,
            subscribe
          }
        };

        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
        return args;
      }
    },
    wsServer
  );

  server.on('error', (err) => {
    console.error('[Server] Error:', err);
  });

  server.listen(4000, () => {
    console.log('[Server] Running on http://localhost:4000/graphql');
    console.log('[Server] Subscriptions at ws://localhost:4000/graphql');
  });
}

main();