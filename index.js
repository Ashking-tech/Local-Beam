const express = require('express')
const multer  = require('multer')
const path = require('path');

const app = express()

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

app.use(express.urlencoded({extended: false}));
app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.get('/', (req, res) => {
  return res.render("homepage");
});

app.listen(3000,'0.0.0.0.', () => {
    console.log("the server is running on port 3000")
})

app.post("/upload",upload.single("profileImage"),(req,res) => {
    console.log(req.body);
    console.log(req.file);

    return res.redirect("/")
})

