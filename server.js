const express = require("express");
const cookieParser = require("cookie-parser");

const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = "mykey";

const fs = require("fs").promises;
const path = require("path");

const PORT = 3000;
const app = express();

app.set("view engine", "ejs");
app.set("views", path.resolve("views"));

// Middleware to parse form data
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Custom Middleware
const authenticationToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    res.redirect("/login");
  }
};

let users = [];

// Load users from JSON file
async function loadUsers() {
  try {
    const data = await fs.readFile(path.resolve("users.json"), "utf8");
    users = JSON.parse(data);
  } catch (error) {
    console.error("Error reading users.json:", error);
    // Initialize to an empty array if reading fails
  }
}

// Save users to JSON file
async function saveUsers() {
  try {
    await fs.writeFile(
      path.resolve("users.json"),
      JSON.stringify(users, null, 2)
    );
  } catch (error) {
    console.error("Error writing to users.json:", error);
  }
}

// Load users when the server starts
loadUsers();

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/dashboard", authenticationToken, (req, res) => {
  res.render("dashboard", { users });
});

app.post("/users", async (req, res) => {
  const { fullName, email, password } = req.body;
  const newUser = { id: users.length, fullName, email, password };

  users.push(newUser);
  await saveUsers(); // Save users asynchronously after adding a new one

  res.redirect("/dashboard");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);

  if (!user || user.password !== password) {
    return res.render("login", { error: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.cookie("token", token);

  res.redirect("/dashboard");
});

app.get("/users/:id", async (req, res) => {
  await loadUsers();
  const id = Number(req.params.id);

  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).send("User not found");
  }

  res.render("profile", { user });
});

app.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { fullName, email, password } = req.body;

  const userIndex = users.findIndex((u) => u.id === id);

  users[userIndex] = {
    ...users[userIndex],
    fullName,
    email,
    password,
  };

  await saveUsers();

  res.redirect("/dashboard");
});

app.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);

  const user = users.find((u) => u.id === id);

  users = users.filter((user) => user.id !== id);
  await saveUsers(); // Save the updated users list to the file

  res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.listen(PORT, () =>
  console.log(`Server started at http://localhost:${PORT}`)
);
