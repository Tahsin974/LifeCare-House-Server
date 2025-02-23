// import libraries/package
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Mongodb URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3lwmdbh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      // "https://tahsin-lifecare-house01.web.app",
      // "https://tahsin-lifecare-house01.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(cookieParser());

//Set  MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const database = client.db("Lifecare_DB");
    const doctorCollection = database.collection("doctors");
    const serviceCollection = database.collection("services");
    const feedbackCollection = database.collection("feedbacks");
    const availableServiceCollection =
      database.collection("available-services");
    const myAppoinmentsCollection = database.collection("my-appointments");
    const allUsersCollection = database.collection("all-users");

    // custom middlewares
    const verifyToken = (req, res, next) => {
      const token = req.cookies.Token;
      if (!token) {
        return res.status(403).send({ message: "Forbidden Access" });
      } else {
        return jwt.verify(
          token,
          process.env.PRIVATEKEY,
          function (err, decoded) {
            if (err) {
              return res.status(401).send({ message: "Unauthorized Access" });
            } else {
              req.user = decoded;
              return next();
            }
          }
        );
      }
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      console.log(!isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // JWT related APIs
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.PRIVATEKEY, {
        expiresIn: 60 * 60,
      });

      res
        .cookie("Token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
        })
        .send({ message: "Success" });
    });
    app.post("/logout", (req, res) => {
      res
        .clearCookie("Token", { maxAge: 0 })
        .send({ message: "logout success" });
    });

    // Services Collection Related APIs
    // Get APIs
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find({}).toArray();
      res.json(result);
    });
    // Doctors Collection Related APIs
    // Get APIs
    app.get("/doctors", async (req, res) => {
      const options = { sort: { name: 1 } };
      const result = await doctorCollection.find({}, options).toArray();
      res.json(result);
    });
    app.get("/doctors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await doctorCollection.findOne(query);
      res.json(result);
    });

    // Feedbacks Collection Related APIs
    // Get APIs
    app.get("/feedbacks", async (req, res) => {
      const result = await feedbackCollection.find({}).toArray();
      res.json(result);
    });

    // Available Service Collection Related Apis
    // Get APIs
    app.get("/available-services", async (req, res) => {
      const options = { sort: { name: 1 } };
      const result = await availableServiceCollection
        .find({}, options)
        .toArray();
      res.json(result);
    });
    // My Appointments Collection Related Apis
    // Get APIs
    app.get("/appointment-dates", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const options = {
        projection: { _id: 0, date: 1 },
      };

      if (userEmail === req.user.email) {
        const result = await myAppoinmentsCollection
          .find(query, options)
          .toArray();
        return res.json(result);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    app.get("/my-appointments", verifyToken, async (req, res) => {
      const userEmail = req.query.email;
      const appoinmentDate = req.query.date;
      let query = {};
      if (appoinmentDate) {
        query = { email: userEmail, date: appoinmentDate };
      } else {
        query = { email: userEmail };
      }

      const options = { sort: { date: 1 } };

      if (userEmail === req.user.email) {
        const result = await myAppoinmentsCollection
          .find(query, options)
          .toArray();
        return res.json(result);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    // Post APIs
    app.post("/my-appoinment", async (req, res) => {
      const appoinmentInfo = req.body;

      const result = await myAppoinmentsCollection.insertOne(appoinmentInfo);
      res.json(result);
    });

    // Admin APIs
    // All Users Related API's
    // GET APIs
    app.get("/all-users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await allUsersCollection.find({}).toArray();
      res.json(result);
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      if (email === req.user.email) {
        const user = await allUsersCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        return res.json({ admin });
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });
    // POST APIs
    app.post("/all-users", async (req, res) => {
      const userInfo = req.body;
      const User = req.query.email;
      const query = { email: User };
      const existingUser = await allUsersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      } else {
        const result = await allUsersCollection.insertOne(userInfo);
        return res.send(result);
      }
    });

    // Patch APIs
    app.patch("/make-admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await allUsersCollection.updateOne(query, updateDoc);
      res.json(result);
    });
    // Delete APIs
    app.delete("/delete-user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allUsersCollection.deleteOne(query);
      res.json(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome To LifeCare House Server");
});

app.listen(port, () => {
  console.log("listening to the port", port);
});
