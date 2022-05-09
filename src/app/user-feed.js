const admin = require("firebase-admin");
const serviceAccount = require("./../../config/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cs5356-57848-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function getUserTopics() {
  const topics = [];
  await db
    .collection("users")
    .get()
    .then((querySnapshot) => {
      querySnapshot.docs.forEach(async (doc) => {
        topics.push(doc.data());
      })
    });
   
  return topics;
}

async function getAllPosts() {
  const markers = [];
  let topics = await getUserTopics();
  await db
    .collection("rants")
    .orderBy("timestamp")
    .get()
    .then((querySnapshot) => {
      querySnapshot.docs.forEach(async (doc) => {
        let rantDetails = doc.data();
        let userName = rantDetails.username;
        
        topics.forEach(async (value)=>{
          if(value.username == userName )
          {
            rantDetails.topics = value.topics ?? "";
          }
        })
        console.log(rantDetails);
        markers.push(rantDetails);
      });
    });
  // const sorted = markers.orderBy("time")
  return markers.reverse();
}


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
  // console.log(posts);
  return posts;
};

const add = async (rant) => {
  // const response = await fetch("https://dog.ceo/api/breeds/image/random/1");
  // const body = await response.json();
  userFeed.push(rant);
};

module.exports = {
  get,
  add,
};
