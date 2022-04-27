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
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

function parseJwt (token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

// write post to DB
const db = admin.firestore();

async function createUser(email, username) {
  await db.collection("users").doc(email).set({
    email: email, 
    username: username,
    numPosts: 0
  })
}

async function getUser(email) {
  const user = await db.collection("users").doc(email).get().then((value) => 
    value.data()
  )
  return user
}

async function createRant(username, rant, timestamp) {
  return await db.collection("rants").add({
    username: username,
    rant: rant,
    timestamp: timestamp,
  })
}

async function getNumPosts(email) {
  const numPosts = await db.collection("users").doc(email).get().then((value) => 
    value.data()["numPosts"]
  )
  return numPosts
}

async function updateNumPosts(email, username, num) {
  await db.collection("users").doc(email).set({
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
  const email = req.user.email
  const user = await getUser(email)
  res.render("pages/profile", { user: user, feed });
});

app.post("/sessionLogin", async (req, res) => {
  // Get the ID token from the request body
  // Create a session cookie using the Firebase Admin SDK
  // Set that cookie with the name 'session'
  // And then return a 200 status code instead of a 501
  const idToken = req.body.idToken;
  const isSignUp = req.body.isSignUp;

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  // method 2
  try {
    const session = await admin.auth().createSessionCookie(idToken, { expiresIn })
    
    const options = { maxAge: expiresIn, httpOnly: true };
    res.cookie("__session", session, options);
    // add into firestore if signin =true
    if (isSignUp) {
      const user = parseJwt(idToken)
      const email = user.email;
      const username = "user" + user.user_id;
      await createUser(email, username);
    }
    res.status(200).send(JSON.stringify({ status: "success" }));
  } catch(err) {
    res.status(401).send("UNAUTHORIZED REQUEST");
  }
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
  const email = user.email
  const username = "user" + user.user_id;
  const rant = await createRant(username, message, Date.now());
  // Update numPosts
  const numPosts = await getNumPosts(email)
  await updateNumPosts(email, username, parseInt(numPosts) + 1)

  // Add the message to the userFeed so its associated with the user
  await userFeed.add(rant)
  // Reload and redirect to dashboard

  res.redirect('/dashboard')
});

// app.listen(port);
exports.app = functions.https.onRequest(app);
console.log("Server started at http://localhost:" + port);
