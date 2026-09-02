import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dev-key";

// Simple JSON-based database for prototype persistence
const DB_FILE = path.join(process.cwd(), "db.json");
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }));
}

function getDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/register", async (req, res) => {
    const { 
      salutation, 
      fullName, 
      address, 
      city, 
      username, 
      password, 
      remarks, 
      directDebit 
    } = req.body;

    const db = getDb();
    
    // Check if user exists
    if (db.users.find((u: any) => u.username === username)) {
      res.status(400).json({ error: "Gebruikersnaam is al in gebruik." });
      return;
    }

    // Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      salutation,
      fullName,
      address,
      city,
      username,
      password: hashedPassword,
      remarks,
      directDebit,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);

    res.status(201).json({ message: "Registratie succesvol", user: { id: newUser.id, username: newUser.username } });
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const db = getDb();
    
    const user = db.users.find((u: any) => u.username === username);
    
    if (!user) {
      res.status(401).json({ error: "Ongeldige inloggegevens" });
      return;
    }

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Generate a JSON Web Token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(200).json({ 
        message: "Succesvol ingelogd", 
        user: { 
          id: user.id, 
          username: user.username, 
          fullName: user.fullName 
        },
        token
      });
    } else {
      res.status(401).json({ error: "Ongeldige inloggegevens" });
    }
  });

  // Get user profile (Protected route example)
  app.get("/api/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Niet geautoriseerd" });
      return;
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const db = getDb();
      const user = db.users.find((u: any) => u.id === decoded.id);
      
      if (!user) {
        res.status(404).json({ error: "Gebruiker niet gevonden" });
        return;
      }

      // Return user data without password
      const { password, ...userProfile } = user;
      res.status(200).json({ user: userProfile });
    } catch (error) {
      res.status(401).json({ error: "Ongeldige token" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
