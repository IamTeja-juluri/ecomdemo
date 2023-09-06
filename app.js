require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
var flash = require('connect-flash');
const Category = require("./models/category");
var MongoStore = require("connect-mongo")(session);
const connectDB = require("./config/db");
const {secret} = require('./config/retrieveSecrets')


const app = express();
require("./config/passport");


const fileUpload = require('express-fileupload')
const cloudinary = require('cloudinary').v2
cloudinary.config({
  // cloud_name: process.env.CLOUD_NAME,       // can use env variables like this
  // api_key: process.env.CLOUDINARY_API_KEY,
  // api_secret: process.env.CLOUDINARY_SECRET_KEY,
  cloud_name: 'dialkq4hj' ,       // can use env variables like this
  api_key: '944785622397673' ,
  api_secret: 'rM0VcOvm2Mq6N6zo2Jg5v4rDvjo'
})
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
    useTempFiles: true, 
    tempFileDir: "/temp/",
}))

// mongodb configuration
// mongodb configuration - new
const connectPromise = new Promise((resolve, reject) => {
  connectDB()
    .then(() => {
      console.log('secret=',secret)
      console.log("Connected to the database");
      resolve();
    })
    .catch((error) => {
      console.log("Failed to connect to the database:", error);
      reject(error);
    });
});
// connectDB();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
    //session expires after 3 hours
    cookie: { maxAge: 60 * 1000 * 60 * 3 },
  })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// global variables across routes
app.use(async (req, res, next) => {
  try {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    res.locals.currentUser = req.user;

    await connectPromise;
    
    const categories = await Category.find({}).sort({ title: 1 }).exec();
    res.locals.categories = categories;
    next();
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});


//routes config
const indexRouter = require("./routes/index");
const productsRouter = require("./routes/products");
const usersRouter = require("./routes/user");
const pagesRouter = require("./routes/pages");
const adminRouter = require("./routes/admin");

app.use("/admin", adminRouter);
app.use("/products", productsRouter);
app.use("/user", usersRouter);
app.use("/pages", pagesRouter);
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

var port = process.env.SERVER_PORT || 3000;
app.set("port", port);
app.listen(port, () => {
  console.log("Server running at port " + port);
});

module.exports = app;
