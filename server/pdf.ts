export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  let puppeteer: any;
  try {
    // Lazy-load so the API can boot even when Puppeteer is absent.
    const module = await import("puppeteer");
    puppeteer = module.default;
  } catch {
    throw new Error("PDF generation dependency missing: install `puppeteer` to enable document PDF endpoints.");
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "25mm", left: "20mm", right: "20mm" }
  });

  await browser.close();
  return pdf;
}

