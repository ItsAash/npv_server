const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid"); // Using uuid library for generating unique keys
const AWS = require("aws-sdk");
const checkTagExists = require("./utils/checkTagExists.js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Endpoint to create a station
app.post("/createStation", async (req, res) => {
  console.log("response arrived");
  const { title, address, location, station_tag } = req.body;

  if (!title || !address || !location || !station_tag) {
    return res.status(400).json({ message: "Required data not provided!" });
  }

  // Check if the tag already exists in DynamoDB
  const tagExists = await checkTagExists(station_tag, dynamoDB);

  if (tagExists) {
    return res.status(400).json({ message: "The tag is already taken." });
  }

  // Assuming stationLocation is an object with latitude and longitude properties
  const { latitude, longitude } = location;
  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({ message: "Latitude or Longitude not provided." });
  }

  // Generate a unique API key for the station
  const apiKey = uuidv4();

  // Create station object
  const newStation = {
    apiKey, // Adding the generated API key to the station details
    title,
    address,
    location: {
      latitude,
      longitude,
    },
    station_tag,
    installed_date: Date.now(),
    uptime: Date.now(),
  };

  // Add the station details to DynamoDB
  const params = {
    TableName: "StationInfo",
    Item: newStation,
  };

  try {
    await dynamoDB.put(params).promise();
    res.json({ message: "Station created successfully", station: newStation });
  } catch (error) {
    console.error("Error creating station in DynamoDB", error);
    res.status(500).json({ message: "Failed to create station" });
  }
});

app.get("/stations", async (req, res) => {
  try {
    const params = {
      TableName: "StationInfo",
      ProjectionExpression:
        "title, address, #loc, station_tag, installed_date, uptime", // Excluding apiKey and using #loc as a placeholder for 'location'
      ExpressionAttributeNames: {
        "#loc": "location", // Mapping the reserved keyword 'location' to the placeholder '#loc'
      },
    };

    const data = await dynamoDB.scan(params).promise();

    res.json(data.Items);
  } catch (error) {
    console.error("Error fetching stations:", error);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

app.get("/vehicleDatas", async (req, res) => {
  try {
    const params = {
      TableName: "VehicleData",
    };

    const data = await dynamoDB.scan(params).promise();
    res.json(data.Items);
  } catch (error) {
    console.error("Error fetching stations: ", error);
    res.status(500).json({ error: "failed to fetch stations" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
