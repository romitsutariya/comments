const express = require('express');
const { randomBytes } = require("crypto")
const bp = require("body-parser")
var cors = require('cors');
const { default: axios } = require('axios');
require('dotenv').config()


const PORT = 5000;
const app = express();

app.use(cors())  //this configurationm for the pre-filigh request
app.use(bp.json());

const EVNET=process.env.EVENT_HOST || '127.0.0.1:7000';  // please add IP + post name

const commentsByPostIds = {};

app.get("/posts/:id/comments", (req, res) => {
    res.send(commentsByPostIds[req.params.id] || []);
});

app.post("/posts/:id/comments", async (req, res) => {
    const commentid = randomBytes(4).toString("hex");
    const { content } = req.body;
    const comments = commentsByPostIds[req.params.id] || []; //if undefined then give us enmety error
    comments.push({ id: commentid, content, status: "pending" });
    commentsByPostIds[req.params.id] = comments;
    await axios.post(`http://${EVNET}/events`, {
        type: "CommentCreated",
        data: {
            id: commentid,
            content,
            postId: req.params.id,
            status: "pending"
        }
    }).catch((err => console.log(err)));
    res.status(201).send(comments);
});

app.post("/events", async (req, res) => {
    const { type, data } = req.body;
    if (type === 'CommentModerated') {
        const { id, content, postId, status } = data;
        const comments=commentsByPostIds[postId];
        const comment=comments.find(comment=>{ 
            return comment.id=id;
        });

        comment.status=status;
        await axios.post(`http://${EVNET}/events`, {
            type: "CommentUpdated",
            data: {
                id: id,
                content,
                postId: postId,
                status: status
            }
        }).catch((err => console.log(err)));
    }
    res.status(200).send({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`)
    console.log(`EVNET ip address is ${EVNET}`)
});