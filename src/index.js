const express = require("express");
var sessions = require("express-session");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
const port = 9000;
const functions = require("firebase-functions");
// import { getPerformance } from "firebase/performance";
var ssn;
// CS5356 TODO #2
// Uncomment this next line after you've created
// serviceAccountKey.json
const serviceAccount = require("./../config/serviceAccountKey.json");
const userFeed = require("./app/user-feed");
const authMiddleware = require("./app/auth-middleware");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://cs5356-57848-default-rtdb.firebaseio.com"
// ..});
function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

// write post to DB
const db = admin.firestore();

async function createUser(email, username, topics) {
  await db.collection("users").doc(email).set({
    email: email,
    username: username,
    numPosts: 0,
    topics: topics,
  });
}

async function getUser(email) {
  const user = await db
    .collection("users")
    .doc(email)
    .get()
    .then((value) => value.data());
  return user;
}

async function createRant(username, rant, timestamp) {
  return await db.collection("rants").add({
    username: username,
    rant: rant,
    timestamp: timestamp,
  });
}

async function getNumPosts(email) {
  const numPosts = await db
    .collection("users")
    .doc(email)
    .get()
    .then((value) => value.data()["numPosts"]);
  return numPosts;
}

async function getUserTopics(email) {
  const topics = await db
    .collection("users")
    .doc(email)
    .get()
    .then((value) => value.data()["topics"]);
  return topics ?? "";
}

async function updateUser(email, username, num, topics) {
  await db.collection("users").doc(email).set({
    email: email,
    username: username,
    numPosts: num,
    topics: topics,
  });
}

// images folder
app.use(express.static("img"));
app.use(require('express-status-monitor')());
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
//const perf = getPerformance(app);
// use res.render to load up an ejs view file
// index page

// Home Page
app.get("/homepage", (req, res) => {
  res.render("pages/homepage");
});

app.get("/", function (req, res) {
  ssn = req;
  let user = ssn?.cookies?.loggedInUser;

  let user_id = user?.user_id ?? false;

  if (user_id) {
    res.redirect("/dashboard");
  } else {
    res.render("pages/index", {
      user: req.user,
      isLoggedIn: req.isLogged,
    });
  }
});

app.get("/sign-in", async function (req, res) {
  ssn = req;
  let user = ssn?.cookies?.loggedInUser;
  let user_id = user?.user_id ?? false;
  if (user_id) {
    res.redirect("/dashboard");
  } else {
    res.render("pages/sign-in",{user:false,isSignUp:false});
  }
});

app.get("/sign-up", function (req, res) {
  ssn = req;
  let user = ssn?.cookies?.loggedInUser;
  let user_id = user?.user_id ?? false;
  if (user_id) {
    res.redirect("/dashboard");
  } else {
    res.render("pages/sign-up",{user:false,isSignUp:true});
  }
});

app.get("/dashboard", authMiddleware, async function (req, res) {
  ssn = req;
  let user = ssn?.cookies?.loggedInUser;
  let user_id = user?.user_id ?? false;
  if (user_id) {
    const feed = await userFeed.get();
    res.render("pages/dashboard", { user: req.user, feed });
  } else {
    res.redirect("/sign-in");
  }
});

app.get("/profile", authMiddleware, async function (req, res) {
  ssn = req;
  let user = ssn?.cookies?.loggedInUser;
  let user_id = user?.user_id ?? false;
  if (user_id) {
    const feed = await userFeed.get();
    const email = req.user.email;
    const user = await getUser(email);
    // console.log(user)
    res.render("pages/profile", { user: user, feed });
  } else {
    res.redirect("/sign-in");
  }
});

app.post("/sessionLogin", async (req, res) => {
  // Get the ID token from the request body
  // Create a session cookie using the Firebase Admin SDK
  // Set that cookie with the name 'session'
  // And then return a 200 status code instead of a 501
  const idToken = req.body.idToken;
  const isSignUp = req.body.isSignUp;
  const topics = req.body.topics;

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  // method 2
  try {
    const session = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn });

    const options = { maxAge: expiresIn, httpOnly: true };
    const user = parseJwt(idToken);
    res.cookie("__session", session, options);

    res.cookie("loggedInUser", user, options);
    // add into firestore if signin =true
    if (isSignUp) {
      const email = user.email;
      const username = "user" + user.user_id;
      await createUser(email, username, topics);
    }

    res.status(200).send(JSON.stringify({ status: "success" }));
  } catch (err) {
    res.status(401).send("UNAUTHORIZED REQUEST");
  }
});

app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.clearCookie("__session");
  res.clearCookie("loggedInUser");
  res.redirect("/");
});

app.post("/update-user", authMiddleware, async (req, res) => {
var email = req.body.email;
var username = req.body.username;
var numPosts = req.body.numPosts;
var topics = req.body.topics;
await updateUser(email, username, parseInt(numPosts), topics);
res.redirect("/profile");
})

app.post("/dog-messages", authMiddleware, async (req, res) => {
  // Get the message that was submitted from the request body
  const message = req.body.message;
  // Get the user object from the request body
  const user = req.user;
  // Add to Firestore Database
  const email = user.email;
  const username = "user" + user.user_id;
  const rant = await createRant(username, message, Date.now());
  const topics = await getUserTopics(email);
  // Update numPosts
  const numPosts = await getNumPosts(email);
  await updateUser(email, username, parseInt(numPosts) + 1, topics);

  // Add the message to the userFeed so its associated with the user
  await userFeed.add(rant);
  // Reload and redirect to dashboard

  res.redirect("/dashboard");
});

app.listen(port);
exports.app = functions.https.onRequest(app);
console.log("Server started at http://localhost:" + port);
