const admin = require("firebase-admin");
const serviceAccount = require("./../../config/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


async function getAllPosts() {
  const markers = [];
  await db.collection("rants").orderBy("timestamp").get()
    .then(querySnapshot => {
      querySnapshot.docs.forEach(doc => {
      markers.push(doc.data());
    });
  });
  // const sorted = markers.orderBy("time")
  return markers.reverse();
}

// function sortPosts(posts) {
  
// }

const casual = require("casual");
const fetch = require("node-fetch");

const userFeed = [];

const get = async () => {
  const posts = await getAllPosts();
  console.log(posts);
  return posts;
}

const add = async (rant) => {
  userFeed.push(rant);
};

module.exports = {
  get,
  add,
};
