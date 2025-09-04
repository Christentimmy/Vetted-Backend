import express, { Express } from "express";
import config from "./config/config";
import morgan from "morgan";
import { connectToDatabase } from "./config/database";

import authRoutes from "./routes/auth_routes";
import userRoutes from "./routes/user_routes";
import postRoutes from "./routes/post_routes";

const app: Express = express();
const port = config.port;

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);

// Connect to database
connectToDatabase();

app.listen(port, async () => {
  console.log(`⚡️Server is running on port: ${port}`);
});
