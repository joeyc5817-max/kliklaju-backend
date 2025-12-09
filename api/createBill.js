export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      orderId,
      buyer_name,
      buyer_email,
      buyer_phone,
      total_amount,
      order_number
    } = req.body;

    if (!orderId || !buyer_email || !buyer_name || !total_amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apiKey = process.env.BILLPLZ_API_KEY;
    const collectionId = process.env.BILLPLZ_COLLECTION_ID;

    if (!apiKey || !collectionId) {
      return res.status(500).json({ error: "Billplz is not configured" });
    }

    // amount in sen
    const amountInSen = Math.round(Number(total_amount) * 100);

    // ✅ Directly redirect back to your Base44 confirmation page
    const redirectUrl = `https://kliklaju.my/#/BillplzConfirmation?orderId=${encodeURIComponent(
      orderId
    )}`;

    const params = new URLSearchParams({
      collection_id: collectionId,
      email: buyer_email,
      name: buyer_name,
      amount: String(amountInSen),
      description: `Order ${order_number || orderId}`,
      redirect_url: redirectUrl,
      reference_1_label: "Order Number",
      reference_1: order_number || "",
      reference_2_label: "Order ID",
      reference_2: orderId
    });

    if (buyer_phone) {
      params.append("mobile", buyer_phone);
    }

    const response = await fetch("https://www.billplz.com/api/v3/bills", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(apiKey + ":").toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!data.url) {
      console.error("Billplz error:", data);
      return res.status(500).json({ error: "Failed to create Billplz bill" });
    }

    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error("createBill error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
