const express = require("express");
const app = express();
app.use(express.json());

// dotenv 모듈
const dotenv = require("dotenv");
dotenv.config();

app.listen(process.env.PORT);


const userRouter = require("./routes/users");
const bookRouter = require("./routes/books");
const cartRouter = require("./routes/carts");
const likeRouter = require("./routes/likes");
const orderRouter = require("./routes/orders");

app.use("/users", userRouter);  
app.use("/books", bookRouter);  
app.use("/carts", cartRouter);  
app.use("/likes", likeRouter);  
app.use("/orders", orderRouter);
  
