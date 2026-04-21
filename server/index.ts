import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { env } from "./env.js";
import { securityHeaders, additionalSecurityHeaders, devSecurityHeaders } from "./middleware/security.js";
import documentsRoute from "./routes/documents.js";
import accessRoute from "./routes/access.js";
import invitesRoute from "./routes/invites.js";
import supportRoute from "./routes/support.js";
import mailRoute from "./routes/mail.js";
import { startMailSyncScheduler } from "./mail/scheduler.js";
import { assertMailCredentialsKeyConfigured } from "./mail/crypto.js";

const app = express();
assertMailCredentialsKeyConfigured();

// Apply security headers FIRST (before any other middleware)
if (env.NODE_ENV === 'production') {
  app.use(securityHeaders);
  app.use(additionalSecurityHeaders);
} else {
  app.use(devSecurityHeaders);
}

// CORS configuration with whitelist
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
const isLocalDevOrigin = (origin: string) =>
  /^https?:\/\/localhost:\d+$/i.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/i.test(origin);

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin) || (env.NODE_ENV !== "production" && isLocalDevOrigin(origin))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Stripe webhook needs raw body - handle it before JSON parser
app.use("/api/support/webhook", bodyParser.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(bodyParser.json({ limit: "10mb" }));

app.use("/api/documents", documentsRoute);
app.use("/api/access", accessRoute);
app.use("/api/hub/invites", invitesRoute);
app.use("/api/support", supportRoute);
app.use("/api/mail", mailRoute);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  console.log(`Server listening on :${env.PORT}`);
  startMailSyncScheduler();
});

