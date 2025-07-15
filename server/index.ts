import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Health check endpoints for deployment platforms

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "Credit Repair Dashboard",
    timestamp: new Date().toISOString(),
  });
});

app.head("/health", (_req, res) => res.status(200).end());



app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API running",
    timestamp: new Date().toISOString(),
  });
});

// Serve static files from data directory
app.use('/data', express.static(path.join(__dirname, '../data')));

// Reduced JSON payload limits for faster health check responses
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Simplified logging middleware - only for API routes, skip health checks
app.use((req, res, next) => {
  // Skip logging for health check routes to improve response time
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

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
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  log(`Error: ${message}`);
});

// Get port from environment variable with fallback
const port = parseInt(process.env.PORT as string, 10) || 5000;

async function initializeServer() {
  // Register routes synchronously BEFORE starting server
  try {
    registerRoutes(app);
    log("API routes registered successfully");
  } catch (routeError) {
    log(`Warning: Failed to register some routes: ${routeError}`);
  }

  // Start server FIRST to get server instance
  const serverInstance = app.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });

  // Setup Vite for development with server instance
  if (process.env.NODE_ENV === "development") {
    try {
      await setupVite(app, serverInstance);
      log("Vite setup completed");
    } catch (viteError) {
      log(`Vite setup failed, using fallback: ${viteError}`);
      // Fallback: serve static assets
      app.use('/assets', express.static(path.resolve(process.cwd(), 'client/src/assets')));
      app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));
      
      app.get('*', (req, res) => {
        res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Credit Repair Dashboard</title>
  </head>
  <body>
    <div id="root">
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
        <div style="text-align: center;">
          <h1>Credit Repair Dashboard</h1>
          <p>Vite setup failed - using fallback mode</p>
        </div>
      </div>
    </div>
  </body>
</html>
        `);
      });
    }
  } else {
    // Production mode - check for dist directory
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      log("Production static file serving enabled");
    } else {
      log("No build directory found, serving basic HTML");
      app.get('*', (req, res) => {
        res.send(`
          <!DOCTYPE html>
          <html><head><title>Credit Repair Dashboard</title></head>
          <body><h1>Credit Repair Dashboard</h1><p>Application ready</p></body></html>
        `);
      });
    }
  }

  return serverInstance;
}

initializeServer().then(serverInstance => {
  serverInstance.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${port} is already in use`);
    } else {
      log(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down gracefully");
    serverInstance.close(() => {
      log("Process terminated");
      process.exit(0);
    });
  });
}).catch(error => {
  log(`Failed to initialize server: ${error.message}`);
  process.exit(1);
});
