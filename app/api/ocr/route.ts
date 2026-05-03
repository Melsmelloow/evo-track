import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { logger } from "@/lib/axiom/server";

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!);
  return new GoogleAuth({
    credentials: {
      ...creds,
      private_key: creds.private_key.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/cloud-vision"],
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const content = Buffer.from(bytes).toString("base64");

    // Get access token
    const auth = getAuth();
    const token = await auth.getAccessToken();

    // Call Vision REST API directly (no gRPC)
    const response = await fetch(
      "https://vision.googleapis.com/v1/images:annotate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      },
    );

    const result = await response.json();
    console.log("Vision API result:", JSON.stringify(result).substring(0, 200));

    if (result.error) {
      throw new Error(result.error.message);
    }

    const text = result.responses?.[0]?.fullTextAnnotation?.text || "";
    logger.info("OCR completed", {
      fileSize: file.size,
      textLength: text.length,
    });
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("FULL ERROR:", error);
    logger.error("OCR failed", { error: error.message });
    return NextResponse.json(
      { error: "OCR failed", message: error?.message },
      { status: 500 },
    );
  }
}
