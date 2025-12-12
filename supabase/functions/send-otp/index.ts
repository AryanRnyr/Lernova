import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  fullName: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, fullName }: OTPRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", email);

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      throw new Error(`Failed to store OTP: ${insertError.message}`);
    }

    // Send OTP email
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: #4f46e5; color: white; font-size: 32px; font-weight: bold; padding: 20px 40px; border-radius: 8px; letter-spacing: 8px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Lernova</h1>
            </div>
            <div class="content">
              <h2>Hello${fullName ? ` ${fullName}` : ''}!</h2>
              <p>Thank you for signing up with Lernova. To complete your registration, please use the following verification code:</p>
              <div style="text-align: center;">
                <div class="otp-code">${otpCode}</div>
              </div>
              <p><strong>This code will expire in 10 minutes.</strong></p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Lernova. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendViaSmtp(gmailUser, gmailPassword, email, "Your Lernova Verification Code", html);

    console.log("OTP sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function sendViaSmtp(
  gmailUser: string,
  gmailPassword: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connectTls({
    hostname: "smtp.gmail.com",
    port: 465,
  });

  const reader = conn.readable.getReader();
  const writer = conn.writable.getWriter();

  async function read(): Promise<string> {
    const { value } = await reader.read();
    return value ? decoder.decode(value) : "";
  }

  async function write(cmd: string): Promise<void> {
    await writer.write(encoder.encode(cmd + "\r\n"));
  }

  try {
    await read();
    await write(`EHLO localhost`);
    await read();
    await write("AUTH LOGIN");
    await read();
    await write(btoa(gmailUser));
    await read();
    await write(btoa(gmailPassword));
    const authResponse = await read();
    
    if (!authResponse.includes("235")) {
      throw new Error("SMTP authentication failed");
    }

    await write(`MAIL FROM:<${gmailUser}>`);
    await read();
    await write(`RCPT TO:<${to}>`);
    await read();
    await write("DATA");
    await read();

    const emailBody = [
      `From: Lernova <${gmailUser}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      "",
      html,
      ".",
    ].join("\r\n");

    await write(emailBody);
    await read();
    await write("QUIT");
  } finally {
    try {
      reader.releaseLock();
      writer.releaseLock();
      conn.close();
    } catch {
      // Ignore close errors
    }
  }
}

serve(handler);
