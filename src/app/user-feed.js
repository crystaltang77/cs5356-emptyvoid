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

// const get = async () => {
//   if (userFeed.length === 0) {
//     const response = await fetch("https://dog.ceo/api/breeds/image/random/5");
//     const body = await response.json();
//     for (const dogUrl of body.message) {
//       userFeed.push({
//         name: casual.full_name,
//         nameHandle: `@${casual.username}`,
//         message: `${casual.sentence}. ${casual.sentence}`,
//         imageSource: dogUrl,
//       });
//     }
//   } else {
//     return userFeed;
//   }

//   return userFeed;
// };

const get = async () => {
  // const response = await fetch("https://dog.ceo/api/breeds/image/random/5");
  // const body = await response.json();
  const posts = await getAllPosts();
  console.log(posts);
  return posts;
}

const add = async (rant) => {
  // const response = await fetch("https://dog.ceo/api/breeds/image/random/1");
  // const body = await response.json();
  userFeed.push(rant);
};

module.exports = {
  get,
  add,
};
