import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// app.options("*", cors(corsOptions));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import { seedDatabase } from "./data/seedDatabase.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import followRouter from "./routes/follow.routes.js";
import bookmarkRouter from "./routes/bookmark.routes.js";
import scraperRouter from "./routes/scraper.routes.js";
import postsRouter from "./routes/post.routes.js";
import userRouter from "./routes/user.routes.js";
import communityRouter from "./routes/community.routes.js";
import userScrapingRouter from "./routes/userScraping.routes.js";
import commentGenerationRouter from "./routes/commentGeneration.routes.js";
import { seedUsers } from "./data/seedUsers.js";

app.get("/api/v1/seed", seedDatabase);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postsRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/follows", followRouter);
app.use("/api/v1/bookmarks", bookmarkRouter);
app.use("/api/v1/scraper", scraperRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/user-scraping", userScrapingRouter);
app.use("/api/v1/comment-generation", commentGenerationRouter);

export { app };
