import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import puppeteer, { type Browser } from "puppeteer-core";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { CertificateRepository } from "../repositories/certificates.repository.js";
import type {
  CertificateData,
  CertificateFilters,
  CertificateWithHolding,
  PaginatedCertificates,
} from "../types/index.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const CERTIFICATES_DIR = path.join(UPLOADS_DIR, "certificates");

const LOGO_PATH = path.resolve(process.cwd(), "..", "public", "logo.jpg");

async function getLogoDataUri(): Promise<string> {
  const buf = await fs.readFile(LOGO_PATH);
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

function findChromePath(): string {
  for (const p of CHROME_PATHS) {
    if (p) return p;
  }
  throw new Error("Chrome not found. Set CHROME_PATH environment variable.");
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    executablePath: findChromePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  return browserInstance;
}

export class CertificateService {
  constructor(private readonly certificateRepository: CertificateRepository) {}

  async findAll(filters: CertificateFilters): Promise<PaginatedCertificates> {
    return this.certificateRepository.findAll(filters);
  }

  async findById(id: string): Promise<CertificateWithHolding> {
    const certificate = await this.certificateRepository.findById(id);
    if (!certificate) throw new NotFoundError("Certificate not found");
    return certificate;
  }

  async findByUserIdAndHoldingId(
    userId: string,
    holdingId: string,
  ): Promise<CertificateData | null> {
    return this.certificateRepository.findByUserIdAndHoldingId(userId, holdingId);
  }

  async generate(
    userId: string,
    holdingId: string,
    userData: { firstName: string; lastName: string },
    holdingData: {
      sakOwned: number;
      purchasePricePerSakUsd: number;
      purchaseDate: Date;
      land: { titleEn: string; titleAr: string; country: string; city: string };
    },
  ): Promise<CertificateData> {
    const existing = await this.certificateRepository.findByUserIdAndHoldingId(userId, holdingId);
    if (existing) {
      throw new ConflictError("Certificate already exists for this holding");
    }

    await fs.mkdir(CERTIFICATES_DIR, { recursive: true });

    const pdfBytes = await this.generatePdf(userData, holdingData);
    const filename = `${crypto.randomUUID()}.pdf`;
    const filePath = path.join(CERTIFICATES_DIR, filename);

    await fs.writeFile(filePath, pdfBytes);

    const relativePath = `certificates/${filename}`;

    return this.certificateRepository.create({
      userId,
      holdingId,
      filePath: relativePath,
    });
  }

  async count(): Promise<number> {
    return this.certificateRepository.count();
  }

  getFilePath(relativePath: string): string {
    return path.join(UPLOADS_DIR, relativePath);
  }

  async shutdown(): Promise<void> {
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
  }

  private async generatePdf(
    userData: { firstName: string; lastName: string },
    holdingData: {
      sakOwned: number;
      purchasePricePerSakUsd: number;
      purchaseDate: Date;
      land: { titleEn: string; titleAr: string; country: string; city: string };
    },
  ): Promise<Buffer> {
    const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;

    // Data validation to prevent undefined, null, or NaN values
    const finalCertNumber = certNumber || "-";

    const investorName =
      [userData?.firstName, userData?.lastName]
        .filter(Boolean)
        .map((s) => s.trim())
        .join(" ")
        .trim() || "-";

    const landNameAr = holdingData?.land?.titleAr || "-";
    const landNameEn = holdingData?.land?.titleEn || "-";

    const locationCity = holdingData?.land?.city?.trim() || "";
    const locationCountry = holdingData?.land?.country?.trim() || "";
    const location = [locationCity, locationCountry].filter(Boolean).join(", ") || "-";

    const sakOwnedVal = holdingData?.sakOwned;
    const sakOwnedStr =
      sakOwnedVal !== undefined && sakOwnedVal !== null && !isNaN(Number(sakOwnedVal))
        ? `${Number(sakOwnedVal).toLocaleString("en-US")} SAK`
        : "-";

    const pricePerSakVal = holdingData?.purchasePricePerSakUsd;
    const pricePerSakStr =
      pricePerSakVal !== undefined && pricePerSakVal !== null && !isNaN(Number(pricePerSakVal))
        ? `$${Number(pricePerSakVal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "-";

    let totalInvestmentStr = "-";
    if (
      sakOwnedVal !== undefined &&
      sakOwnedVal !== null &&
      !isNaN(Number(sakOwnedVal)) &&
      pricePerSakVal !== undefined &&
      pricePerSakVal !== null &&
      !isNaN(Number(pricePerSakVal))
    ) {
      const totalInvestment = Number(sakOwnedVal) * Number(pricePerSakVal);
      totalInvestmentStr = `$${totalInvestment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const purchaseDateVal = holdingData?.purchaseDate;
    let purchaseDateStr = "-";
    if (purchaseDateVal instanceof Date && !isNaN(purchaseDateVal.getTime())) {
      purchaseDateStr = purchaseDateVal.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } else if (purchaseDateVal) {
      const parsedDate = new Date(purchaseDateVal);
      if (!isNaN(parsedDate.getTime())) {
        purchaseDateStr = parsedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      }
    }

    const logoDataUri = await getLogoDataUri();

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 595px; height: 842px; color: #0A0E1A; background: #FFFFFF;
    position: relative;
    padding: 0;
    overflow: hidden;
  }
  
  /* Luxury gold outer frame */
  .cert-border {
    position: absolute;
    top: 20px; left: 20px; right: 20px; bottom: 16px;
    border: 2.5px solid #C9A84C;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
  }

  .header {
    background: #0A0E1A;
    color: #FFFFFF;
    padding: 24px 24px;
    text-align: center;
    border-bottom: 2px solid #C9A84C;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  
  .logo-box {
    margin-bottom: 2px;
  }
  
  .header-en {
    font-family: 'Marcellus', 'Times New Roman', serif;
    font-size: 25px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #C9A84C;
  }
  
  .header-ar {
    font-family: 'Noto Sans Arabic', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #FFFFFF;
    letter-spacing: 0.5px;
  }

  .cert-badge-container {
    display: flex;
    justify-content: center;
    margin-top: 18px;
  }
  .cert-badge {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 4px;
    padding: 7px 20px;
    font-size: 12px;
    color: #64748B;
    display: flex;
    gap: 10px;
    align-items: center;
    direction: ltr;
    justify-content: center;
  }
  .cert-num-val {
    font-weight: 700;
    color: #0A0E1A;
    font-family: 'Courier New', Courier, monospace;
    letter-spacing: 0.5px;
  }

  .gold-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, #C9A84C, transparent);
    margin: 14px auto;
    width: 70%;
  }

  .content {
    padding: 12px 40px 0 40px;
  }

  /* Grid Field Row styling */
  .field-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  
  .field-col-en {
    width: 46%;
    text-align: left;
    direction: ltr;
  }
  
  .field-col-ar {
    width: 46%;
    text-align: right;
    direction: rtl;
  }
  
  .field-label-en {
    font-family: 'Marcellus', serif;
    font-size: 11px;
    color: #64748B;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .field-label-ar {
    font-family: 'Noto Sans Arabic', sans-serif;
    font-size: 11px;
    color: #64748B;
    font-weight: 500;
  }
  
  .field-value-en {
    font-family: 'Marcellus', 'Segoe UI', sans-serif;
    font-size: 17px;
    font-weight: 600;
    color: #0A0E1A;
    margin-top: 3px;
  }
  
  .field-value-ar {
    font-family: 'Noto Sans Arabic', sans-serif;
    font-size: 17px;
    font-weight: 600;
    color: #0A0E1A;
    margin-top: 3px;
  }

  /* Improved Information Table */
  .details-table {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    margin-top: 14px;
    margin-bottom: 0;
    overflow: hidden;
  }
  
  .table-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 42px;
    padding: 0 20px;
    border-bottom: 1px solid #E2E8F0;
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-cell-en {
    width: 46%;
    display: flex;
    direction: ltr;
  }
  
  .table-cell-ar {
    width: 46%;
    display: flex;
    direction: rtl;
  }
  
  .table-label-en {
    width: 50%;
    font-family: 'Marcellus', serif;
    font-size: 11.5px;
    color: #64748B;
    text-transform: uppercase;
    text-align: left;
  }
  
  .table-value-en {
    width: 50%;
    font-family: 'Marcellus', 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #0A0E1A;
    font-weight: 600;
    text-align: left;
  }
  
  .table-value-ar {
    width: 50%;
    font-family: 'Noto Sans Arabic', sans-serif;
    font-size: 13px;
    color: #0A0E1A;
    font-weight: 600;
    text-align: right;
  }
  
  .table-label-ar {
    width: 50%;
    font-family: 'Noto Sans Arabic', sans-serif;
    font-size: 11.5px;
    color: #64748B;
    font-weight: 500;
    text-align: right;
  }

  .footer {
    margin-top: auto;
    padding: 0 40px 18px 40px;
    text-align: center;
  }
  
  .footer-line {
    height: 1px;
    background: #E2E8F0;
    margin-bottom: 6px;
  }
  
  .footer-en {
    font-family: 'Marcellus', serif;
    font-size: 11px;
    color: #64748B;
    margin-bottom: 3px;
    direction: ltr;
  }
  
  .footer-ar {
    font-family: 'Noto Sans Arabic', sans-serif;
    font-size: 11px;
    color: #64748B;
    margin-bottom: 4px;
  }
  
  .footer-brand {
    font-family: 'Marcellus', serif;
    font-size: 10px;
    color: #C9A84C;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
</style>
</head>
<body>
  <div class="cert-border">
    <div class="header">
      <div class="logo-box">
        <img src="${logoDataUri}" alt="SAK100" style="height: 48px; width: auto;" />
      </div>
      <div class="header-en">SAK100 INVESTMENT CERTIFICATE</div>
      <div class="header-ar">شهادة استثمار ساك ١٠٠</div>
    </div>
    
    <div class="cert-badge-container">
      <div class="cert-badge">
        <span>Certificate No:</span>
        <span class="cert-num-val">${finalCertNumber}</span>
        <span>/ رقم الشهادة</span>
      </div>
    </div>
    
    <div class="gold-line"></div>
    
    <div class="content">
      <!-- Field: Investor Name -->
      <div class="field-row">
        <div class="field-col-en">
          <span class="field-label-en">Investor Name</span>
          <div class="field-value-en">${investorName}</div>
        </div>
        <div class="field-col-ar">
          <span class="field-label-ar">اسم المستثمر</span>
          <div class="field-value-ar">${investorName}</div>
        </div>
      </div>
      
      <!-- Field: Land Property -->
      <div class="field-row">
        <div class="field-col-en">
          <span class="field-label-en">Land Property</span>
          <div class="field-value-en">${landNameEn}</div>
        </div>
        <div class="field-col-ar">
          <span class="field-label-ar">العقار</span>
          <div class="field-value-ar">${landNameAr}</div>
        </div>
      </div>
      
      <!-- Field: Location -->
      <div class="field-row">
        <div class="field-col-en">
          <span class="field-label-en">Location</span>
          <div class="field-value-en">${location}</div>
        </div>
        <div class="field-col-ar">
          <span class="field-label-ar">الموقع</span>
          <div class="field-value-ar">${location}</div>
        </div>
      </div>

      <!-- Information Table -->
      <div class="details-table">
        <!-- Row: SAK Owned -->
        <div class="table-row">
          <div class="table-cell-en">
            <span class="table-label-en">SAK Owned</span>
            <span class="table-value-en">${sakOwnedStr}</span>
          </div>
          <div class="table-cell-ar">
            <span class="table-value-ar">${sakOwnedStr}</span>
            <span class="table-label-ar">الساك المملوك</span>
          </div>
        </div>
        
        <!-- Row: Price per SAK -->
        <div class="table-row">
          <div class="table-cell-en">
            <span class="table-label-en">Price per SAK</span>
            <span class="table-value-en">${pricePerSakStr}</span>
          </div>
          <div class="table-cell-ar">
            <span class="table-value-ar">${pricePerSakStr}</span>
            <span class="table-label-ar">سعر الساك</span>
          </div>
        </div>
        
        <!-- Row: Total Investment -->
        <div class="table-row">
          <div class="table-cell-en">
            <span class="table-label-en">Total Investment</span>
            <span class="table-value-en">${totalInvestmentStr}</span>
          </div>
          <div class="table-cell-ar">
            <span class="table-value-ar">${totalInvestmentStr}</span>
            <span class="table-label-ar">الاستثمار الكلي</span>
          </div>
        </div>
        
        <!-- Row: Purchase Date -->
        <div class="table-row">
          <div class="table-cell-en">
            <span class="table-label-en">Purchase Date</span>
            <span class="table-value-en">${purchaseDateStr}</span>
          </div>
          <div class="table-cell-ar">
            <span class="table-value-ar">${purchaseDateStr}</span>
            <span class="table-label-ar">تاريخ الشراء</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-line"></div>
      <div class="footer-en">This certificate confirms your fractional ownership of the above property.</div>
      <div class="footer-ar">هذه الشهادة تؤكد ملكيتك الجزئية للعقار المذكور أعلاه.</div>
      <div class="footer-brand">SAK100 Platform | sak100.com</div>
    </div>
  </div>
</body>
</html>`;

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0" as any, timeout: 15000 });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }
}
