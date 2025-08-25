import express, { Express } from "express";
import config from "./config/config";
import morgan from "morgan";
import { connectToDatabase } from "./config/database";

const app: Express = express();
const port = config.port;

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));

app.use("/api", (req, res) => {
    res.send("Hello World!");
})

// Connect to database
connectToDatabase();


app.listen(port, async () => {
  console.log(`⚡️Server is running on port: ${port}`);
});


