require('dotenv').config();
const express= require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
 //Level-3 Hash function
// const md5=require("md5");
//Level 2:- Using encryption
// const encrypt=require("mongoose-encryption");
//Level 4:- hashing and Salting - using bcrypt
// const bcrypt=require("bcrypt");
// const saltRounds=10;  //To specify the number of salting rounds for the same.
//Level 5 Cookies and sessions
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const { use } = require('passport');
//Level 6:Google oauth verification
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");

const app=express();
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(express.static("public"));
app.set("view engine","ejs");
//Level 5 security
app.use(session({
    secret:"Our Secret Life",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://aastha:aastha16@cluster0-iivkq.mongodb.net/secretsDB?retryWrites=true&w=majority",{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);

const userSchema=new mongoose.Schema({
   email: String,
    password: String,
    //for google authentication
    googleId:String,
    secret:String
});
//Level 5
userSchema.plugin(passportLocalMongoose)
//l6
userSchema.plugin(findOrCreate);
//console.log(process.env.API_KEY);
//Level 2 Step
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields : ["password"]})
const User=new mongoose.model("User",userSchema);
//level:5
passport.use(User.createStrategy());
//serialize and deserialize the passport local
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//level 6 serialize and deserialize the passport function not only locally but all platforms
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


//L6:- Statorgizing google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home")
})

app.get("/register",function(req,res){
    res.render("register")
})

app.get("/login",function(req,res){
    res.render("login")
})
//level 5 autentication
app.get("/secrets",function(req,res){
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.render("login")
    // }
    //make it a post page to see all secrets
    User.find({"secret":{$ne:null}},function(err,foundusers) {
        if(err){
            console.log(err);
        }else{
            if(foundusers){
                res.render("secrets",{userswithsecrets:foundusers});
            }
        }
 
})
});
app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
})
//level 6 google authentication
app.get("/auth/google",
    passport.authenticate("google",{scope:["profile"]})
);
app.get("/auth/google/secrets",
passport.authenticate("google",{failureRedirect:"/login"}),
function(req,res){
      res.redirect("/secrets");
});
app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

//code till: level 4 
// app.post("/register",function(req,res){
//      //Using hashing and salting :Level 4
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         // Store hash in your password DB.
//         const newUser = new User({
//             email:req.body.username ,
//             //instead of saving password in normal way we use hash function to save password
//             //password:req.body.password:Level 2 step
//             //Level 3 step:storing as md5 hash pass
//             //password:md5(req.body.password)
//            password:hash   //the hash generated using the hash func is the new password
//           });
         
//           newUser.save(function(err){
//                  if(err){
//                      console.log(err);
//                  }else{
//                      res.render("secrets");
//                  }
//           })
//     });
   
// })

//Code till level:4
// app.post("/login",function(req,res){
//     const username=req.body.username;
//     //Remove L2 step and add hash func and L3 step instead
//     //L3 step
//    const password=req.body.password;
//    //L2 step: const password=req.body.password;
//     User.findOne({email:username},function(err,founduser){
//         if(err){
//             console.log(err)
//         }else{
//             //L4: compare the hash with the password using bcrypt.compare
//             if(founduser){
//                 bcrypt.compare(password,founduser.password,function(err,result){
//                     if(result){
//                        res.render("secrets");
//                     }
//                 })
//             // if(founduser.password==password){
//             //     res.render("secrets");
//             // }
//         }
//     }
//     })
// })

//Level 5 :post requests using passport and cookies
app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login",function(req,res){

    const user=new User({
      username:req.body.username,
      password:req.body.password
    });

   req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/submit",function(req,res){
       const secret=req.body.secret;
        User.findById(req.user.id,function(err,founduser){
            if(err){
                console.log(err);
            }else{
                if(founduser){
                    founduser.secret=secret;
                    founduser.save();
                }
            }
        })
});
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,function(){
    console.log("Server is running at port 3000");
});
