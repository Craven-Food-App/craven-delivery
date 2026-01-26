import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { env } from "./env.js";
import documentsRoute from "./routes/documents.js";
import accessRoute from "./routes/access.js";
import invitesRoute from "./routes/invites.js";
import supportRoute from "./routes/support.js";

const app = express();

app.use(cors({ origin: env.ORIGIN, credentials: true }));

// Stripe webhook needs raw body - handle it before JSON parser
app.use("/api/support/webhook", bodyParser.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(bodyParser.json({ limit: "10mb" }));

app.use("/api/documents", documentsRoute);
app.use("/api/access", accessRoute);
app.use("/api/hub/invites", invitesRoute);
app.use("/api/support", supportRoute);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  console.log(`Server listening on :${env.PORT}`);
});

