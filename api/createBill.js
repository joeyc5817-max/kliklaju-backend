// /api/createBill.js
// Vercel serverless function that creates a Billplz bill
// and returns the payment URL to the frontend.

export default async function handler(req, res) {
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
      order_number,
    } = orderData;

    if (!buyer_name || !buyer_email || !total_amount) {
      return res.status(400).json({
        error: "buyer_name, buyer_email and total_amount are required",
      });
    }

    // Read Billplz config from Vercel environment variables
    const apiKey = process.env.BILLPLZ_API_KEY;
    const collectionId = process.env.BILLPLZ_COLLECTION_ID;
    const isSandbox = process.env.BILLPLZ_SANDBOX === "true";

    if (!apiKey || !collectionId) {
      return res
        .status(500)
        .json({ error: "Billplz is not configured on the server" });
    }

    // Base URL – sandbox vs live
    const baseUrl = isSandbox
      ? "https://www.billplz-sandbox.com/api/v3"
      : "https://www.billplz.com/api/v3";

    // This is your Vercel backend base URL
    // You can override it with BACKEND_BASE_URL env if you want.
    const backendBaseUrl =
      process.env.BACKEND_BASE_URL || "https://kliklaju-backend.vercel.app";

    const callbackUrl = `${backendBaseUrl}/api/billplzCallback`;
    const redirectUrl = `${backendBaseUrl}/api/billplzRedirect`;

    // Billplz expects amount in sen (RM * 100)
    const amountInSen = Math.round(Number(total_amount) * 100);

    const params = new URLSearchParams({
      collection_id: collectionId,
      email: buyer_email,
      name: buyer_name,
      amount: String(amountInSen),
      description: "Order " + (order_number || ""),
      callback_url: callbackUrl,
      redirect_url: redirectUrl,
      reference_1_label: "Order Number",
      reference_1: order_number || "",
    });

    if (buyer_phone) {
      params.append("mobile", buyer_phone);
    }

    // Call Billplz
    const response = await fetch(`${baseUrl}/bills`, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(apiKey + ":").toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Billplz API error:", response.status, text);
      return res
        .status(500)
        .json({ error: "Failed to create Billplz bill" });
    }

    const bill = JSON.parse(text);

    // Send the payment URL back to the frontend
    return res.status(200).json({
      url: bill.url,
      bill_id: bill.id,
    });
  } catch (err) {
    console.error("createBill error:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
