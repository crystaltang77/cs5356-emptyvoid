const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 8080;
const functions = require("firebase-functions")

// CS5356 TODO #2
// Uncomment this next line after you've created
// serviceAccountKey.json
const serviceAccount = require("./../config/serviceAccountKey.json");
const userFeed = require("./app/user-feed");
const authMiddleware = require("./app/auth-middleware");

// CS5356 TODO #2
// Uncomment this next block after you've created serviceAccountKey.json
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// write post to DB
const db = admin.firestore();

async function createUser(email, username) {
  await db.collection("rants").add({
    email: email, 
    username: username,
    numPosts: 0
  })
}

async function createRant(username, rant, timestamp) {
  await db.collection("rants").add({
    username: username,
    rant: rant,
    timestamp: timestamp,
  })
}

async function getNumPosts(email) {
  const numPosts = await db.collection("users").doc("email").get().then((value) =>
    value.data()["numPosts"]
  )
  return numPosts
}

async function updateNumPosts(email, username, num) {
  await db.collection("users").doc("email").set({
    email: email, 
    username: username,
    numPosts: num
  })
}

// use cookies
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// set the view engine to ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/static", express.static("static/"));

// use res.render to load up an ejs view file
// index page

// Home Page
app.get('/homepage', (req, res) => {
  res.render('pages/homepage')
})

app.get("/", function (req, res) {
  res.render("pages/index");
});

app.get("/sign-in", function (req, res) {
  res.render("pages/sign-in");
});

app.get("/sign-up", function (req, res) {
  res.render("pages/sign-up");
});

app.get("/dashboard", authMiddleware, async function (req, res) {
  const feed = await userFeed.get();
  res.render("pages/dashboard", { user: req.user, feed });
});

app.get("/profile", authMiddleware, async function (req, res) {
  const feed = await userFeed.get();
  res.render("pages/profile", { user: req.user, feed });
});

app.post("/sessionLogin", async (req, res) => {
  // Get the ID token from the request body
  // Create a session cookie using the Firebase Admin SDK
  // Set that cookie with the name 'session'
  // And then return a 200 status code instead of a 501
  const idToken = req.body.idToken;

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      session => {
        const options = { maxAge: expiresIn, httpOnly: true };
        res.cookie("__session", session, options);
        res.status(200).send(JSON.stringify({ status: "success" }));
      },
      error => {
        res.status(401).send("UNAUTHORIZED REQUEST");
      }
    )
  
  const user = req.user;
  const email = user.email;
  const username = "user" + user.uid;
  // await createUser(email, username);
    
});

app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/sign-in");
});

app.post("/dog-messages", authMiddleware, async (req, res) => {
  // Get the message that was submitted from the request body
  const message = req.body.message
  // Get the user object from the request body
  const user = req.user
  // Add to Firestore Database
  const username = "user" + user.uid;
  await createRant(username, message, 'time');
  // Update numPosts
  const numPosts = getNumPosts(email) + 1
  await updateNumPosts(email, username, numPosts)

  // Add the message to the userFeed so its associated with the user
  await userFeed.add(user, message)
  // Reload and redirect to dashboard
  res.redirect('/dashboard')
});

// app.listen(port);
exports.app = functions.https.onRequest(app);
console.log("Server started at http://localhost:" + port);
