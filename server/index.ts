import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { jobWorker } from "./jobWorker";

// Clean up old video files on startup
function cleanupOldVideos() {
  const tempDirs = [
    path.join(process.cwd(), 'temp'),
    path.join(process.cwd(), 'temp', 'uploads')
  ];
  
  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      let deletedCount = 0;
      files.forEach(file => {
        if (file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mov')) {
          try {
            fs.unlinkSync(path.join(dir, file));
            deletedCount++;
          } catch (err) {
            console.error(`Failed to delete ${file}:`, err);
          }
        }
      });
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old video(s) from ${dir}`);
      }
    }
  });
}

// Run cleanup on startup
cleanupOldVideos();

const app = express();
// Apply body parsers to all routes EXCEPT video upload (Multer handles that)
app.use((req, res, next) => {
  if (req.path === '/api/analysis/video') {
    // Skip body parsers for video upload route - Multer handles multipart
    next();
  } else {
    express.json()(req, res, () => {
      express.urlencoded({ extended: false })(req, res, next);
    });
  }
});

// Serve static files from attached_assets
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Serve static files from public directory (for images, etc.)
app.use('/images', express.static(path.join(process.cwd(), 'public/images')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add API-only JSON 404 fallback to prevent HTML responses on /api routes
  app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found' }));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the job worker for background processing
    jobWorker.start();
  });
})();
