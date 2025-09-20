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

const app: Express = express();
const port = config.port;

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/services", appServiceRoutes);
app.use("/api/subscription", subscriptionRoutes);

// Connect to database
connectToDatabase();

const server = app.listen(port, async () => {
  console.log(`⚡️Server is running on port: ${port}`);
});

setupSocket(server);
