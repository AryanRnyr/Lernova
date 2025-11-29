import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const { to, subject, html, text }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // Create email content with proper MIME formatting
    const boundary = "boundary_" + Date.now();
    const emailContent = [
      `From: Lernova <${gmailUser}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      text || html.replace(/<[^>]*>/g, ""),
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    // Encode the email content in base64
    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Use Gmail SMTP via fetch to Google's API
    // For Gmail SMTP, we'll use the basic auth approach
    const smtpEndpoint = "https://smtp-relay.gmail.com";
    
    // Alternative: Use nodemailer-like approach with SMTP
    // Since Deno doesn't have native SMTP, we'll use a workaround
    // by sending via Gmail's API-like endpoint
    
    // For simplicity, let's use a direct SMTP connection approach
    const response = await sendViaSmtp(gmailUser, gmailPassword, to, subject, html, text);
    
    console.log("Email sent successfully to:", to);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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
  html: string,
  text?: string
): Promise<void> {
  // Use Deno's TCP connection for SMTP
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
    // Read greeting
    await read();

    // EHLO
    await write(`EHLO localhost`);
    await read();

    // AUTH LOGIN
    await write("AUTH LOGIN");
    await read();

    // Username (base64)
    await write(btoa(gmailUser));
    await read();

    // Password (base64)
    await write(btoa(gmailPassword));
    const authResponse = await read();
    
    if (!authResponse.includes("235")) {
      throw new Error("SMTP authentication failed");
    }

    // MAIL FROM
    await write(`MAIL FROM:<${gmailUser}>`);
    await read();

    // RCPT TO
    await write(`RCPT TO:<${to}>`);
    await read();

    // DATA
    await write("DATA");
    await read();

    // Email content
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

    // QUIT
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