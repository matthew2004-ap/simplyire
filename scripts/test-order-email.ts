import "dotenv/config";
import { sendOrderNotificationEmail } from "../lib/order-notifications";

async function main() {
  await sendOrderNotificationEmail({
    orderId: "TEST-ORDER-12345678",
    customerName: "Simplyire Customer",
    email: "adewalematthew2004@gmail.com",
    total: 25000,
    event: "PAYMENT_CONFIRMED",
  });

  console.log("Email test completed. Check your terminal and inbox.");
}

main().catch((error) => {
  console.error("Email test failed:", error);
  process.exitCode = 1;
});