import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactReplyRequest {
  to: string;
  name: string;
  originalMessage: string;
  reply: string;
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

    const { to, name, originalMessage, reply }: ContactReplyRequest = await req.json();

    if (!to || !name || !originalMessage || !reply) {
      throw new Error("Missing required fields");
    }

    const subject = "Re: Your message to Lernova";
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .original-message { background: #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9ca3af; }
            .reply-message { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Lernova</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Response to Your Message</p>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Thank you for contacting us. Here is our response to your message:</p>
              
              <div class="original-message">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #6b7280;">Your original message:</p>
                <p style="margin: 0; white-space: pre-wrap;">${originalMessage}</p>
              </div>
              
              <div class="reply-message">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #667eea;">Our response:</p>
                <p style="margin: 0; white-space: pre-wrap;">${reply}</p>
              </div>
              
              <p>If you have any further questions, feel free to reply to this email or contact us again through our website.</p>
              
              <p>Best regards,<br>The Lernova Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Lernova. All rights reserved.</p>
              <p>This email was sent in response to your contact form submission.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send via SMTP
    await sendViaSmtp(gmailUser, gmailPassword, to, subject, html);
    
    console.log("Contact reply email sent successfully to:", to);

    return new Response(
      JSON.stringify({ success: true, message: "Reply sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-reply function:", error);
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