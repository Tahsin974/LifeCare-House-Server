const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3lwmdbh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// middlewares
app.use(express.json());
app.use(cors());

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

    // Services Collection Related APIs
    // Get APIs
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find({}).toArray();
      res.json(result);
    });
    // Doctors Collection Related APIs
    // Get APIs
    app.get("/doctors", async (req, res) => {
      const result = await doctorCollection.find({}).toArray();
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
      const result = await availableServiceCollection.find({}).toArray();
      res.json(result);
    });
    // My Appointments Collection Related Apis
    // Get APIs
    app.get("/appointment-dates", async (req, res) => {
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const options = {
        projection: { _id: 0, date: 1 },
      };
      console.log(query);

      const result = await myAppoinmentsCollection
        .find(query, options)
        .toArray();
      res.json(result);
    });
    app.get("/my-appointments", async (req, res) => {
      const userEmail = req.query.email;
      const appoinmentDate = req.query.date;

      const query = { email: userEmail, date: appoinmentDate };
      console.log(query);

      const result = await myAppoinmentsCollection.find(query).toArray();
      res.json(result);
    });
    // Post APIs
    app.post("/my-appoinment", async (req, res) => {
      const appoinmentInfo = req.body;

      const result = await myAppoinmentsCollection.insertOne(appoinmentInfo);
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
