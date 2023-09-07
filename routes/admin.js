const express = require("express");
const router = express.Router();
const csrf = require("csurf");
const Product = require("../models/product");
const Cart = require("../models/cart");
const User = require("../models/user");
const Order = require("../models/order");
const Category = require("../models/category");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
const middleware = require("../middleware");
var moment = require("moment");
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2
const axios = require('axios');
var MailChimpAPI = require('mailchimp').MailChimpAPI;
const { promisify } = require('util');
const fs = require("fs");
const PDFDocument = require("pdfkit");



const csrfProtection = csrf();
router.use(csrfProtection);  
router.use(
  middleware.isLoggedIn,
  middleware.isAdmin
  )


router.get("/dashboard", middleware.isLoggedIn, async(req, res) => {
  // var Msg = req.flash("error")[0];
  try{
    // console.log(req.user);
    res.render("admin/dashboard", {
      pageName: "Dashboard",
      message: req.flash('message')
    })
  }catch(error){
    console.log(error);
    req.flash('message', error.msg)
    res.redirect("/admin/dashboard");
  }
});




router.get("/all_products", async (req, res) => {
  try {
    const perPage = 2;
    let page = parseInt(req.query.page) || 1;
    const products = await Product.find({})
      .sort("-createdAt")
      .populate("category");


    res.render("admin/admin_products", {
      pageName: "All Products",
      products,
      message: req.flash("message"),
      csrfToken: req.csrfToken(),
      moment: moment
    });
  } catch (error) {
    console.log(error);
    req.flash('message', error.msg)
    res.redirect("/admin/dashboard");
  }
});

router.get("/add_products", async(req, res) => {
  const categories = await Category.find().sort("-createdAt");
  
  res.render("admin_partials/admin_create", {
    pageName: "All Products",
    editing: false,
    message: req.flash("message"),
    csrfToken: req.csrfToken(),
    categories,
  });    
});
//create product
router.post("/add_products", 
  body('title').not().isEmpty().trim().escape(),
  body('productCode').not().isEmpty().trim().escape(),
  body('description').not().isEmpty().trim().escape(),
  body('category').not().isEmpty(),
  body('manufacturer').not().isEmpty().trim().escape(),
  body('price').isNumeric(),
  body('quantity').isNumeric(),
  async(req, res) => {
    try{
      const errorMsg = validationResult(req);
      if(errorMsg.array().length != 0){
        const emsg = errorMsg.array()[0].msg + " for " + errorMsg.array()[0].param;
        console.log(emsg)
        req.flash('message', emsg)
        res.redirect("/admin/add_products");
      }

      if(await Product.find({ productCode: req.body.productCode })){
        req.flash('message', `Product with this product code ( ${req.body.productCode} ) already exist`)
        res.redirect("/admin/add_products");
      }

      req.body.available = (req.body.available=="on")?true:false;
      const {title, productCode, description, price, category, manufacturer, quantity, available, createdAt} = req.body

      if(req.files){      //if not empty
          let file = req.files.imagefile     //name given to input tag in html
          result = await cloudinary.uploader.upload(file.tempFilePath, {
              folder: 'users'
          })
      }

      let product;
      if(createdAt){
        product = await Product.create({
          productCode, title, imagePath:{
            id: result.public_id,
            secure_url: result.secure_url
          },
          description, price, 
          category, manufacturer, quantity, available, createdAt
        })
      }else{
        product = await Product.create({
          productCode, title, imagePath:{
            id: result.public_id,
            secure_url: result.secure_url
          },
          description, price, 
          category, manufacturer, quantity, available
        })
      }

      if(product)
        req.flash('message', "Product Successfully created")
      return res.redirect("/admin/all_products")
    }catch (error) {
      console.log(error);
      req.flash('message', error.message)
      return res.redirect('/admin/all_products');
    }
});


router.get("/edit_product/:id", async(req, res) => {
  try{
    let product = await Product.findById(req.params.id).populate("category")
    
    res.render("admin_partials/admin_create", {
      pageName: "Edit Product",
      product: product,
      message: req.flash("message"),
      editing: req.query.edit,
      csrfToken: req.csrfToken(),
      user: "admin",
    });
  }catch(err){
    console.log(err);
    req.flash('message', error.message)
    res.redirect("/admin/all_products")
  }
});
router.post("/edit_product", 
  body('title').not().isEmpty().trim().escape(),
  body('productCode').not().isEmpty().trim().escape(),
  body('description').not().isEmpty().trim().escape(),
  body('category').not().isEmpty(),
  body('manufacturer').not().isEmpty().trim().escape(),
  body('price').isNumeric(),
  body('quantity').isNumeric(),
  async(req, res) => {
    try{

      const errorMsg = validationResult(req);
      if(errorMsg.array().length != 0){
        const emsg = errorMsg.array()[0].msg + " for " + errorMsg.array()[0].param;
        console.log(emsg)
        req.flash('message', emsg)
        return res.redirect(`/admin/edit_product/${req.body.productID}`);
      }

      let product = await Product.findById(req.body.productID)

      if((product.productCode != req.body.productCode) && await Product.find({ productCode: req.body.productCode })){
        req.flash('message', `Product with this product code ${req.body.productCode} already exist`)
        return res.redirect(`/admin/edit_product/${req.body.productID}`);
      }

      req.body.available = (req.body.available=="on")?true:false;
      
      if(req.body.createdAt=="") req.body.createdAt = product.createdAt;

      let result;
      if(req.files){      //if not empty
          let file = req.files.imagefile     //name given to input tag in html
          result = await cloudinary.uploader.upload(file.tempFilePath, {
              folder: 'users'
          })
          deletedOld = await cloudinary.uploader.destroy(product.imagePath.id, {
            invalidate: true,
          })
      }else {
        result = {
            public_id: product.imagePath.id,
            secure_url: product.imagePath.secure_url
          };
        }

      product.productCode = req.body.productCode
      product.title = req.body.title
      product.imagePath.id = result.public_id
      product.imagePath.secure_url = result.secure_url
      product.description = req.body.description
      product.price = req.body.price
      product.category = req.body.category
      product.manufacturer = req.body.manufacturer
      product.available = req.body.available
      product.createdAt = req.body.createdAt
      await product.save()
      

      //TODO: if available false then call remove all function
      if(req.body.available == false){
        try {
          const response = await axios.get(`http://localhost:3000/removeAll/${req.body.productID}`);
          console.log(response.data);
        } catch (error) {
          console.error(error);
        }
      }

      req.flash('message', "Product Updated successfully!")
      return res.redirect("/admin/all_products")
    }catch(error){
      req.flash('message', error.message)
      res.redirect("/admin/all_products");
    }
});

router.post("/delete_product", async(req, res) =>{
  try{
      //first delete the image from cloudinary
      let findProduct = await Product.findById(req.body.productID)
      deletedOld = await cloudinary.uploader.destroy(findProduct.imagePath.id, {
        invalidate: true,
      })
      
      //if product is deleted then remove from cart as well
      try {
        const response = await axios.post('http://localhost:3000/delete_product');
        console.log(response.data);
      } catch (error) {
        console.error(error);
      }

      //then delete the image link from the dataabse & everything else
      let result = await Product.findByIdAndRemove(req.body.productID);
      if(result){
        req.flash('message', "Successfully deleted")
  
        //TODO: if available false then call remove all function
        if(req.body.available == false){
          try {
            const response = await axios.get(`http://localhost:3000/removeAll/${req.body.productID}`);
            console.log(response.data);
          } catch (error) {
            console.error(error);
          }
        }
      } 
      res.redirect("/admin/all_products");
    }catch(error){
      console.log(error)
      req.flash('message', error.message)
      res.redirect(`/admin/all_products?error=${error.msg}`);
    }
});



//category routes
router.get("/all_categories", async (req, res) => {
  try {
    const categories = await Category.find({})

    res.render("admin/admin_categories", {
      pageName: "All Categories",
      categories,
      message: req.flash("message"),
      csrfToken: req.csrfToken(),
      moment: moment,
    });
  } catch (error) {
    req.flash('message', error.msg)
    res.redirect("/admin/dashboard");
  }
});

router.get("/add_category", async(req, res) => {  

  res.render("admin_partials/admin_create_category", {
    pageName: "All Products",
    editing: false,
    message: req.flash("message"),
    csrfToken: req.csrfToken(),
  });    
});
//create category
router.post("/add_category", 
  body('title').not().isEmpty().trim().escape(),
  body('categoryCode').not().isEmpty().trim().escape(),
  async(req, res) => {
    try{
      const errorMsg = validationResult(req);
      if(errorMsg.array().length != 0){
        const emsg = errorMsg.array()[0].msg + " for " + errorMsg.array()[0].param;
        console.log(emsg)
        req.flash('message', emsg)
        res.redirect("/admin/add_category");
      }
      
      const categoryCheck = await Category.find({ categoryCode: req.body.categoryCode });

      if(categoryCheck.length > 0){
        req.flash('message', `Category with this category code ( ${req.body.categoryCode} ) already exist`)
        return res.redirect("/admin/add_category");
      }

      const { title, createdAt, categoryCode } = req.body

      if(req.files){      //if not empty
        let file = req.files.imagefile     //name given to input tag in html
        result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'categories'
        })
      }

      let category;
      if(createdAt){
        category = await Category.create({
          categoryCode, title, imagePath:{
            id: result.public_id,
            secure_url: result.secure_url
          }, createdAt
        })
      }else{
        category = await Category.create({
          categoryCode, title, imagePath:{
            id: result.public_id,
            secure_url: result.secure_url
          }
        })
      }

      if(category){
        req.flash('message', "Category created successfully")
      }
      return res.redirect("/admin/all_categories")
    }catch (error) {
      console.log(error);
      req.flash('message', error.message)
      res.redirect('/admin/all_categories');
    }
});

router.get("/edit_category/:id", async(req, res) => {
  try{
    let category = await Category.findById(req.params.id)
    
    res.render("admin_partials/admin_create_category", {
      pageName: "Edit Category",
      category: category,
      message: req.flash("message"),
      editing: req.query.edit,
      csrfToken: req.csrfToken(),
      user: "admin",
    });
  }catch(err){
    console.log(err);
    req.flash('message', error.message)
    res.redirect("/admin/all_categories")
  }
});

router.post("/edit_category", 
  body('title').not().isEmpty().trim().escape(),
  body('categoryCode').not().isEmpty().trim().escape(),
  async(req, res) => {
    try{
      
      const errorMsg = validationResult(req);
      if(errorMsg.array().length != 0){
        const emsg = errorMsg.array()[0].msg + " for " + errorMsg.array()[0].param;
        console.log(emsg)
        req.flash('message', emsg)
        return res.redirect(`/admin/edit_category/${req.body.categoryID}`);
      }

      let category = await Category.findById(req.body.categoryID)
      
      if((category.categoryCode != req.body.categoryCode) && await Category.find({ productCode: req.body.categoryCode })){
        req.flash('message', `Category with this category code ${req.body.categoryCode} already exist`)
        // return res.redirect("/admin/edit_category");
        return res.redirect(`/admin/edit_category/${req.body.categoryID}`);
      }

      
      if(req.body.createdAt=="") req.body.createdAt = category.createdAt;
      
      let result;
      if(req.files){      //if not empty
        let file = req.files.imagefile     //name given to input tag in html
        result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'categories'
        })
        if(category.imagePath.id){
          deletedOld = await cloudinary.uploader.destroy(category.imagePath.id, {
            invalidate: true,
          })
        }
      }else {
        result = {
          public_id: category.imagePath.id,
          secure_url: category.imagePath.secure_url
        };
      }
      console.log(result)
      category.categoryCode = req.body.categoryCode
      category.title = req.body.title
      category.imagePath.id = result.public_id
      category.imagePath.secure_url = result.secure_url
      category.createdAt = req.body.createdAt
      await category.save()
      
      req.flash('message', "Category Updated successfully!")
      return res.redirect("/admin/all_categories")

    }catch(error){
      req.flash('message', error.message)
      res.redirect("/admin/all_categories");
    }
});
router.post("/delete_category", async(req, res) =>{
  try{
      //first delete the image from cloudinary
      let findCategory = await Category.findById(req.body.categoryID)

      // Delete the image from Cloudinary
      deletedOld = await cloudinary.uploader.destroy(findCategory.imagePath.id, {
        invalidate: true,
      })

      //then delete the image link from the databse & everything else
      let result = await Category.findByIdAndRemove(req.body.categoryID);
      if(result){
        req.flash('message', "Successfully deleted")
      } 
      res.redirect("/admin/all_categories");
    }catch(error){
      console.log(error)
      req.flash('message', error.message)
      res.redirect(`/admin/all_categories?error=${error.msg}`);
    }
});


//User Routes
router.get("/all_users", async (req, res) => {
  try {
    // const users = await User.find({}).sort("-createdAt").select(['-isSuperAdmin']);
    const users = await User.find({ isSuperAdmin: { $not: { $eq: true } } }).sort("-createdAt");
    console.log(users)
    res.render("admin/admin_users", {
      pageName: "All Users",
      users,
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.log(error);
    req.flash('message', error.msg)
    res.redirect("/admin/dashboard");
  }
});

router.get("/edit_user/:id", async(req, res) => {
  const user = await User.findById(req.params.id)
      .sort("-createdAt");
  
  if(user.isSuperAdmin == true){
    req.flash("message", "Cannot Edit Super Admin User")
    return res.redirect("/admin/all_users")
  }

  return res.render("admin_partials/admin_edit_user", {
    pageName: "All Users",
    editing: true,
    message: req.flash("message"),
    csrfToken: req.csrfToken(),
    user,
  });    
});

router.post("/edit_user", async(req, res) => {
  try{
    let user = await User.findById(req.body.userID)

    req.body.isAdmin = (req.body.isAdmin=="on")?true:false;
    user.isAdmin = req.body.isAdmin
    await user.save()


    req.flash('message', "User Updated successfully!")
    res.redirect("/admin/all_users")
  }catch(error){
    req.flash('message', error.message)
    res.redirect("/admin/all_users");
  }
});



//GET: select order date
router.get("/all_orders", async (req, res) => {
  try {

    return res.render("admin/admin_orders", {
      pageName: "All Orders",
      orders: "",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.log(error);
    req.flash('message', error.msg)
    return res.render("admin/dashboard", {
      pageName: "All Users",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });    
  }
});


//POST: selected date orders
router.post("/all_orders", async (req, res) => {
  try {
    if(req.query.all_orders === 'true'){
      const orders = await Order.find({}).sort("-createdAt").populate('user')
      return res.render("admin/admin_orders", {
        pageName: "All Orders",
        orders,
        moment,
        message: req.flash("message"),
        csrfToken: req.csrfToken()
      });
    }
    var selected_date = req.body.date;
    
    const date = new Date(selected_date);
    console.log(date);

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, -1);

    const orders = await Order.find({
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay,
      }
    }).populate('user')

    // console.log(orders);
    // const orders = await Order.find({})
    //   .sort("-createdAt")
    //   .populate('user')

    return res.render("admin/admin_orders", {
      pageName: "All Orders",
      orders,
      moment,
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.log(error);
    req.flash('message', error.msg)
    return res.render("admin/dashboard", {
      pageName: "All Users",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });    
  }
});

router.post("/download_receipt/:id", async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user')

  const username = order.user.username;
  try{
    await generatePDF(order, "order.pdf", res);

    // const filePath = `public/${username}_order.pdf`; 
    
    req.flash('message', "Receipt Downloaded Successfully!")
    return res.render("admin/dashboard", {
      pageName: "All Users",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });    
  } catch (error) {
    console.log(error);
    req.flash('message', error.msg)
    return res.render("admin/dashboard", {
      pageName: "All Users",
      message: req.flash("message"),
      csrfToken: req.csrfToken()
    });    
  }
})


async function generatePDF(order, path, res) {
  const doc = new PDFDocument({ size: "A4", margin: 50,bufferPages: true });

  generateHeader(doc);
  generateOrderInformation(doc, order);
  generateOrderTable(doc, order);
  generateFooter(doc);

  doc.end();
  doc.pipe(fs.createWriteStream(path));
}

function generateHeader(doc) {
  doc
    .image("public/images/whole_food.jpg", 50, 45, { width: 50 })
    .fillColor("#444444")
    .fontSize(20)
    .text("AapKiDukaan", 110, 57)
    .fontSize(10)
    .text("AapKiDukaan", 200, 50, { align: "right" })
    .text("M-12, Ana Sagar Link Road", 200, 65, { align: "right" })
    .text("Ajmer", 200, 80, { align: "right" })
    .fontSize(10)
    .text("Ashish - 9664002789", 200, 100, { align: "right" })
    .text("Cfbakvo@gmail.com", 200, 120, { align: "right" })
    .moveDown();
}

function generateOrderInformation(doc, order) {
  const { shippingInfo, totalAmount, createdAt } = order;
  const username = order.user.username;
  const options = { day: "2-digit", month: "2-digit", year: "2-digit" };
  const formattedDate = createdAt.toLocaleDateString("en-GB", options); 

  doc
    .fillColor("#333333")
    .fontSize(14)
    .text("Shipping Information", 50, 140);

  doc
    .fillColor("#888888")
    .fontSize(12)
    .text(`Username: ${username}`, 50, 160) // Display the username
    .text(`Street: ${shippingInfo.street}`, 50, 180)
    .text(`City: ${shippingInfo.city}`, 50, 200)
    .text(`Phone No: ${shippingInfo.phoneNo}`, 50, 220)
    .text(`Pin Code: ${shippingInfo.pinCode}`, 50, 240);
  doc
    .fillColor("#333333")
    .fontSize(14)
    .text("Order Summary", 50, 300);

  doc
    .fillColor("#888888")
    .fontSize(12)
    .text(`Total Amount: Rs ${totalAmount} `, 240, 300);
  
    doc
    .fillColor("#888888")
    .fontSize(12)
    .text(`Ordered On: ${formattedDate} `, 400, 300);
}

function generateOrderTable(doc, order) {
  const { items } = order.cart;
  const tableTop = 360;

  doc
    .fontSize(14)
    .text("Order Items", 50, tableTop);

  doc
    .fontSize(12)
    .text("Product", 50, tableTop + 30)
    .text("Quantity", 200, tableTop + 30)
    .text("Price", 300, tableTop + 30)
    .text("Sub Total", 400, tableTop + 30); // Added "Total" column

  let yPos = tableTop + 60;

  items.forEach((item, index) => {
    const { title, qty, price } = item;
    const total = qty * price; // Calculate the total by multiplying qty with price

    doc
      .fontSize(12)
      .text(title, 50, yPos)
      .text(qty.toString(), 200, yPos)
      .text(`Rs ${price}`, 300, yPos)
      .text(`Rs ${total}`, 400, yPos); 

    yPos += 20;
  });
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "Payment is due within 15 days. Thank you for your business.",
      50,
      780,
      { align: "center", width: 500 }
    );
}


module.exports = router;
