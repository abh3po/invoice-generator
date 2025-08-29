import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceData } from "../types";

function wrapText(text: string, maxChars = 90): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

export async function generateInvoicePDF(
  inv: InvoiceData
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const draw = (text: string, x: number, y: number, size = 11) => {
    if (!text) return;
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  };

  // Header
  draw("INVOICE", 260, 800, 20);

  // Freelancer (issuer)
  draw("From:", 50, 770, 12);
  draw(inv.freelancerName || "-", 50, 755);
  if (inv.freelancerEmail) draw(inv.freelancerEmail, 50, 740);
  if (inv.freelancerAddress) draw(inv.freelancerAddress, 50, 725);

  // Invoice meta
  draw(`Invoice #: ${inv.invoiceNumber}`, 350, 770);
  draw(`Invoice Date: ${inv.invoiceDate}`, 350, 755);
  draw(`Due Date: ${inv.dueDate || "-"}`, 350, 740);

  // Bill To (client)
  draw("Bill To:", 50, 700, 12);
  draw(inv.clientName || "-", 50, 685);
  if (inv.company) draw(inv.company, 50, 670);
  if (inv.clientEmail) draw(inv.clientEmail, 50, 655);
  if (inv.clientAddress) draw(inv.clientAddress, 50, 640);

  // Services
  let y = 610;
  if (inv.serviceDescription) {
    draw("Services:", 50, y, 12);
    y -= 18;
    for (const line of wrapText(inv.serviceDescription, 100)) {
      draw(line, 50, y);
      y -= 14;
      if (y < 120) break;
    }
  }

  // Total
  y -= 10;
  draw("Total Due:", 50, y, 12);
  const totalWithCurrency = `$ ${inv.totalAmount}`;
  draw(totalWithCurrency, 120, y, 12);

  // Payment info
  y -= 30;
  draw("Payment Info:", 50, y, 12);
  const payLines = wrapText(inv.paymentInfo || "", 90);
  let py = y - 16;
  for (const line of payLines) {
    draw(line, 50, py);
    py -= 14;
    if (py < 80) break;
  }

  // Footer
  draw(
    `Submitted: ${new Date(inv.submittedAtISO).toLocaleString()}`,
    50,
    60,
    9
  );
  draw(`Author (npub/pubkey): ${inv.authorPubkey}`, 50, 46, 9);

  const bytes = await pdf.save();
  return bytes;
}
