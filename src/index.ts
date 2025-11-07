import express, { Express } from "express";
import config from "./config/config";
import morgan from "morgan";
import { connectToDatabase } from "./config/database";
import { setupSocket } from "./config/socket";

import authRoutes from "./routes/auth_routes";
import userRoutes from "./routes/user_routes";
import postRoutes from "./routes/post_routes";
import messageRoutes from "./routes/message_route";
import appServiceRoutes from "./routes/app_service_route";
import subscriptionRoutes from "./routes/subscription_routes";
import adminRoutes from "./routes/admin_route";
import supportTicketRoutes from "./routes/support_ticket_routes";
import invitationRoutes from "./routes/invitation_routes";
import { authRateLimiter, apiRateLimiter } from "./config/rateLimit";

import bodyParser from "body-parser";
import cors from "cors";

import "./jobs/subscription_job";
import "./jobs/cleanup_incomplete_subscriptions";

import { handleWebhook } from "./services/stripe_service";

const app: Express = express();
const port = config.port;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://vetted-admin-b34e.onrender.com"],
    credentials: true,
  })
);

app.post(
  "/api/subscription/webhook",
  bodyParser.raw({ type: "application/json" }),
  handleWebhook
);

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/user", apiRateLimiter, userRoutes);
app.use("/api/post", apiRateLimiter, postRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/services", apiRateLimiter, appServiceRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support-ticket", supportTicketRoutes);
app.use("/api/invitations", invitationRoutes);

// Connect to database
connectToDatabase();

const server = app.listen(port, async () => {
  console.log(`⚡️Server is running on port: ${port}`);
});

setupSocket(server);
