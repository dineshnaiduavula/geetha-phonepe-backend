import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import {
  StandardCheckoutPayRequest,
  Env,
  StandardCheckoutClient,
} from "pg-sdk-node";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const clientVersion = 1;
// const env = Env.SANDBOX;
const env = Env.PRODUCTION;

const client = StandardCheckoutClient.getInstance(
  clientId,
  clientSecret,
  clientVersion,
  env
);

app.post("/create-order", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !data.amount) {
      return res
        .status(400)
        .json({ error: "Amount is required in the 'data' object" });
    }
    const finalamount = data.amount * 100;
    const merchantOrderId = randomUUID();
    const redirectUrl = `https://theater-food.life/order-confirmation?merchantOrderId=${merchantOrderId}`;

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(finalamount)
      .redirectUrl(redirectUrl)
      .build();

    const response = await client.pay(request);

    return res.json({
      checkoutPageUrl: response.redirectUrl,
      merchantOrderId,
      success: true,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Error creating order", success: false });
  }
});

app.get("/check-status", async (req, res) => {
  try {
    const { merchantOrderId } = req.query;

    if (!merchantOrderId) {
      return res.status(400).send("MerchantOrderId is required");
    }

    const response = await client.getOrderStatus(merchantOrderId);
    const status = response.state;

    if (status === "COMPLETED") {
      return res.redirect("https://theater-food.life/order-confirmation");
    } else {
      return res.redirect("https://theater-food.life/menu");
    }
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).send("Error getting status");
  }
});

app.get("/", (req, res) => {
  res.send("PhonePe Payment Gateway Backend is running.");
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
