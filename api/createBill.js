// api/createBill.js

export default async function handler(req, res) {
  // --- FIX CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { orderData } = req.body || {};
    if (!orderData) {
      return res.status(400).json({ error: "orderData is required" });
    }

    const {
      buyer_name,
      buyer_email,
      buyer_phone,
      total_amount,
      order_number
    } = orderData;

    if (!buyer_name || !buyer_email || !total_amount) {
      return res.status(400).json({
        error: "buyer_name, buyer_email and total_amount are required",
      });
    }

    // Load environment variables
    const apiKey = process.env.BILLPLZ_API_KEY;
    const collectionId = process.env.BILLPLZ_COLLECTION_ID;
    const isSandbox = process.env.BILLPLZ_SANDBOX === "true";

    if (!apiKey || !collectionId) {
      return res.status(500).json({
        error: "Billplz keys are not configured on the server",
      });
    }

    // Base URL
    const baseUrl = isSandbox
      ? "https://www.billplz-sandbox.com/api/v3"
      : "https://www.billplz.com/api/v3";

    // Create Bill
    const response = await fetch(`${baseUrl}/bills`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collection_id: collectionId,
        email: buyer_email,
        name: buyer_name,
        amount: Math.round(total_amount * 100), // Convert to cents
        description: `Order ${order_number}`,
        callback_url: `${req.headers.origin}/api/billplzCallback`,
        redirect_url: `${req.headers.origin}/api/billplzRedirect`,
      }),
    });

    const bill = await response.json();

    if (!bill || !bill.url) {
      return res.status(500).json({
        error: "Billplz did not return a URL",
        details: bill,
      });
    }

    return res.status(200).json({ url: bill.url });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
}