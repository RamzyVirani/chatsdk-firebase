const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
exports.newMessage = functions.database
    .ref('/19_04/threads/{thread}/messages/{msgid}')
    // Write includes create, update, delete
    // .onWrite((snapshot, context) => {
    .onCreate((snapshot, context) => {

        const original = snapshot.val();
        let uid, pushPromises = [];
        // Get the Sender Name Once
        admin.database()
            .ref("/19_04/users/" + original["user-firebase-id"] + "/meta/name")
            .once("value", function (senderSnap) {
                let sender = senderSnap.val();

                // Loop through all the keys in original.read object,
                for (uid in original.read) {
                    // Check if the user is online, if he/she is online, no need to send push notification.
                    admin.database()
                        .ref("/19_04/online/" + uid)
                        .once("value", function (receiverSnap) {
                            if (receiverSnap.val() != null) {
                                console.log("User is online: ", uid, " since ", receiverSnap.val().time);
                            } else {
                                // use the key in /19_04/users/{key}/meta/token to get the user token,
                                // use the token to send push notification.
                                pushPromises
                                    .push(admin.database()
                                        .ref("/19_04/users/" + uid + "/meta/token")
                                        .once("value", function (snap) {
                                            let token = snap.val();
                                            const payload = {
                                                // notification: {
                                                //     title: 'Tell Rehman',
                                                //     body: 'Cloud Functions Notification, Please tell rehman.'
                                                // }
                                                data: {
                                                    // ...original,
                                                    text: original.json_v2.text,
                                                    thread_id: context.params.thread,
                                                    msg_id: context.params.msgid,
                                                    action_type: "offline_message",
                                                    username: sender
                                                }
                                            };
                                            admin.messaging().sendToDevice(token, payload)

                                        }), function (err) {
                                        console.error("Cannot find Recipient Token: ", err);
                                    });
                            }
                        }, function (err) {

                        });
                }
            }, function (err) {
                console.error("Cannot find Sender Name: ", err);
            });
        return Promise.all(pushPromises).then(function (values) {
            console.log("ALL VALUES: ", values);
        }).catch(function (err) {
            console.error("Promise Failed: ", err)
        });
    });


