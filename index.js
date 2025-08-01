const express = require('express');
const multer  = require('multer');
const path = require('path');
const discovery = require('./discovery');
const app = express()



const fs = require('fs');

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: function(req,file,cb){
        return cb(null,"./uploads");
    },
    filename :function  (req,file,cb){
        return cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({storage});

// const upload = multer({ dest: 'uploads/' })

let userNickname = "Unknown";

app.use(express.urlencoded({extended: false}));
app.set("view engine","ejs");
app.set("views",path.resolve("./views"));


app.post("/nickname", (req, res) => {
  userNickname = req.body.nickname;
  console.log("✅ Nickname set to:", userNickname);
  res.redirect("/");
});



app.get('/peers', (req, res) => {
  return res.json(discovery.getPeers());
});


app.get("/", (req, res) => {
  const peers = discovery.getPeers();
  res.render("homepage", { peers, nickname: userNickname });
});


app.listen(3000,'0.0.0.0', () => {
    console.log("the server is running on port 3000")
})

app.post("/upload",upload.single("profileImage"),(req,res) => {
    console.log(req.body);
    console.log(req.file);

    return res.redirect("/")
})

