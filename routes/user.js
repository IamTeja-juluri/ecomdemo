const express = require("express");
const router = express.Router();
const csrf = require("csurf");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
const Product = require("../models/product");
const Order = require("../models/order");
const Cart = require("../models/cart");
const middleware = require("../middleware");
const User = require('../models/user');
const nodemailer = require('nodemailer');
var MailChimpAPI = require('mailchimp').MailChimpAPI;
const speakeasy = require('speakeasy');
const bcrypt = require("bcrypt-nodejs");

const {
  userSignUpValidationRules,
  userSignInValidationRules,
  validateSignup,
  validateSignin,
} = require("../config/validator");

const csrfProtection = csrf();
router.use(csrfProtection);

// GET: display the signup form with csrf token
router.get("/signup", middleware.isNotLoggedIn, (req, res) => {
  var errorMsg = req.flash("error")[0];
  res.render("user/signup", {
    csrfToken: req.csrfToken(),
    errorMsg,
    pageName: "Sign Up",
  });
});
// POST: handle the signup logic
router.post("/signup",            //handled by passport
  [
    middleware.isNotLoggedIn,
    userSignUpValidationRules(),
    validateSignup,
    passport.authenticate("local.signup", {
      successRedirect: "/user/profile",
      failureRedirect: "/user/signup",
      failureFlash: true,
    }),
  ],
  async (req, res) => {
    try {
      //if there is cart session, save it to the user's cart in db
      if (req.session.cart) {
        const cart = await new Cart(req.session.cart);
        cart.user = req.user._id;
        await cart.save();
      }
      // redirect to the previous URL
      if (req.session.oldUrl) {
        var oldUrl = req.session.oldUrl;
        req.session.oldUrl = null;
        res.redirect(oldUrl);
      } else {
        res.redirect("/user/profile");
      }
    } catch (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/");
    }
  }
);

// GET: display the signin form with csrf token
router.get("/signin", middleware.isNotLoggedIn, async (req, res) => {
  var errorMsg = req.flash("error")[0];
  res.render("user/signin", {
    csrfToken: req.csrfToken(),
    errorMsg,
    message:"",
    pageName: "Sign In",
  });
});

// POST: handle the signin logic
router.post("/signin",          //handled by passport
  [
    middleware.isNotLoggedIn,
    userSignInValidationRules(),
    validateSignin,
    passport.authenticate("local.signin", {
      failureRedirect: "/user/signin",
      failureFlash: true,
    }),
  ],
  async (req, res) => {
    console.log(req.session.oldUrl);
    try {
      // cart logic when the user logs in
      let cart = await Cart.findOne({ user: req.user._id });
      // if there is a cart session and user has no cart, save it to the user's cart in db
      if (req.session.cart && !cart) {
        const cart = await new Cart(req.session.cart);
        cart.user = req.user._id;
        await cart.save();
      }
      // if user has a cart in db, load it to session
      if (cart) {
        req.session.cart = cart;
      }
      // redirect to old URL before signing in
      if (req.session.oldUrl) {
        var oldUrl = req.session.oldUrl;
        req.session.oldUrl = null;
        res.redirect(oldUrl);
      } else {
        res.redirect("/user/profile");
      }
    } catch (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect("/");
    }
  }
);

// GET: display user's profile
router.get("/profile", middleware.isLoggedIn, async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  try {
    // find all orders of this user
    allOrders = await Order.find({ user: req.user });
    res.render("user/profile", {
      orders: allOrders,
      errorMsg,
      successMsg,
      pageName: "User Profile",
    });
  } catch (err) {
    console.log(err);
    return res.redirect("/");
  }
});

// GET: logout
router.get("/logout", middleware.isLoggedIn, (req, res) => {
  req.logout();
  req.session.cart = null;
  res.redirect("/");
});


//GET: user click forget password
router.get("/forget_password", async(req, res) => {
  try{
    res.render("user/forget_password", {
      pageName: "Reset Password",
      csrfToken: req.csrfToken(),
      message: req.flash('message')
    })
  }catch(error){
    console.log(error);
    req.flash('message', error.msg)
    res.redirect("/user/signup");
  }
});


//POST: post email & generate OTP
router.post('/forget_password', async(req, res) => {
  const { email } = req.body; 

  // Generate a new secret for the OTP
  const secret = speakeasy.generateSecret({ length: 20 });

  // Store the secret in the user's document in the database
  User.findOneAndUpdate({ email }, { otpSecret: secret.base32 }, { new: true })
    .then(async user => {
      // If the user doesn't exist, return an error
      if (!user) {
        req.flash('message', "Have you been  ordering your food from Swiggy, cause we can't find you in out Database ?")
        res.redirect("/user/forget_password"); 
      }

      // Generate the OTP for the user
      const otp = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
      });
      console.log(otp);

      let testAccount = await nodemailer.createTestAccount(MailChimpAPI(apiKey, { version : '2.0' }));

      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });

      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: '"Fred Foo 👻" <listensongs2202@gmail.com>', // sender address
        to: email, // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: `<p>Your reset code is: ${otp}</p>`
      });

      console.log(info);

      // // Create the email message
      // const mailOptions = {
      //   from: 'listensongs2202@gmail.com',
      //   to: email,
      //   subject: 'Reset Password Request',
      //   html: `<p>Your reset code is: ${otp}</p>`
      // };
      // console.log(transporter, otp, mailOptions);

      // Send the email to the user
      // transporter.sendMail(mailOptions, (error, info) => {
      //   console.log("hi");
      //   if (error) {
      //     console.log(error);
      //     req.flash('message', error.msg)
      //     res.redirect("/user/forget_password"); 
      //   } else {
      //     console.log(`Email sent: ${info.response}`);
      //     req.flash('message', "Email Sent")
      //     res.redirect("/user/forget_password"); 
      //   }
      // });

      // Return a success message
      req.flash('message', "Email Sent")
      res.render("user/reset_password", {
        pageName: "Reset Password",
        message: req.flash("message"),
        csrfToken: req.csrfToken()
      });
    })
    .catch(error => {
      console.log(error);
      req.flash('message', error.msg)
      res.redirect("/user/forget_password");
    });
});


//POST: OTP verify
router.post('/reset_password', (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Find the user in the database
  User.findOne({ email }).then(user => {
    // If the user doesn't exist, return an error
    if (!user) {
      req.flash('message', 'User not found');
      return res.redirect("/user/reset_password");
    }

    // Verify the OTP entered by the user
    const verified = speakeasy.totp.verify({
      secret: user.otpSecret,
      encoding: 'base32',
      token: otp
    });

    // If the OTP is not valid, return an error
    if (!verified) {
      req.flash('message', 'Invalid OTP');
      return res.redirect("/user/forget_password"); 
    }

    // Update the user's password in the database
    user.password = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(5), null);
    user.save();

    // Return a success message
    req.flash('message', "Password reset successfully")
    return res.render("/user/signin", {
      pageName: "Reset Password",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });
  })
  .catch(error => {
    console.log(error);
    req.flash('message', "Server error")
    return res.render("/user/forget_password", {
      pageName: "Forget Password",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });
  })
})


module.exports = router;
