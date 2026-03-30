/**
 * SMS Simulator — Test the ingest-sms Edge Function locally
 * 
 * Usage: node tools/simulate-sms.js
 *
 * Sends realistic test SMS payloads to your local Supabase Edge Function
 * so you can develop/test the dashboard without needing real hardware.
 */

const FUNCTION_URL = process.env.FUNCTION_URL ||
  "http://localhost:54321/functions/v1/ingest-sms";

const TEST_MESSAGES = [
  // Trap caught — minimal
  {
    label: "Trap caught (minimal)",
    body: { text: "TRAP #TRAP_001 | CAUGHT | 14/03/26 06:42", from: "+61400111001" }
  },
  // Trap caught with GPS (unit moved)
  {
    label: "Trap caught + GPS",
    body: { text: "TRAP #TRAP_002 | CAUGHT | 14/03/26 07:15 | GPS -12.4567,130.8901", from: "+61400111002" }
  },
  // Daily health check
  {
    label: "Daily health check",
    body: { text: "HEALTH #TRAP_001 | 14/03/26 06:00 | Bt:78% Sol:OK FW:1.0 | EMPTY", from: "+61400111001" }
  },
  // Health with solar fault
  {
    label: "Health — solar fault",
    body: { text: "HEALTH #TRAP_003 | 14/03/26 06:00 | Bt:45% Sol:FAULT FW:1.0 | EMPTY", from: "+61400111003" }
  },
  // Low battery alert
  {
    label: "Low battery alert",
    body: { text: "ALERT #TRAP_001 | LOW BATT 18% | Solar:OK | 14/03/26 14:22", from: "+61400111001" }
  },
  // Critical battery
  {
    label: "Critical battery shutdown",
    body: { text: "ALERT #TRAP_002 | CRIT BATT 8% SHUTTING DOWN | Solar:FAULT | 14/03/26 15:00", from: "+61400111002" }
  },
];

async function sendTestSMS(label, body) {
  console.log(`\n▶ ${label}`);
  console.log(`  SMS: "${body.text}"`);
  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`  Response [${res.status}]:`, JSON.stringify(data));
  } catch (err) {
    console.error(`  Error:`, err.message);
  }
}

async function runAll() {
  console.log("=".repeat(60));
  console.log("  Trap Monitor SMS Simulator");
  console.log(`  Target: ${FUNCTION_URL}`);
  console.log("=".repeat(60));

  for (const test of TEST_MESSAGES) {
    await sendTestSMS(test.label, test.body);
    await new Promise(r => setTimeout(r, 500)); // Small delay between messages
  }

  console.log("\n✅ All test messages sent");
}

runAll();
