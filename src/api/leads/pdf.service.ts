import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateApplicationPdf(data: {
    branchName: string;
    leadName: string;
    phoneNumber: string;
    fileNumber?: string;
    email?: string;
    motherName?: string;
    dob?: string;
    companyName?: string;
    addresses?: {
      current?: string;
      permanent?: string;
      office?: string;
    };
    financials?: {
      netSalaryInr?: string;
      loanAmountInr?: string;
      obligationInr?: string;
    };
    product?: string;
    residentType?: string;
    leadBy?: string;
    references?: Array<{ name: string; phoneNumber: string }>;
    coApplicants?: Array<{
      name: string;
      phoneNumber: string;
      email?: string;
      motherName?: string;
    }>;
  }): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
      headless: true,
    });

    try {
      const page = await browser.newPage();

      const htmlContent = this.getHtmlTemplate(data);
      await page.setContent(htmlContent, { waitUntil: 'load', timeout: 60000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `PDF Generation Detailed Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      if (error instanceof Error) {
        this.logger.error(`Error Stack: ${error.stack}`);
      }
      throw new InternalServerErrorException(
        `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      await browser.close();
    }
  }

  private getHtmlHeader(data: any): string {
    return `
      <div class="header-container">
        <div class="header-left">${data.companyName || ''}</div> 
        <div class="header-right">FILE NO: ${data.fileNumber || ''}</div>
      </div>
      <div class="header-line"></div>
    `;
  }

  private getHtmlTemplate(data: any): string {
    const referencesHtml = (data.references || [])
      .map((ref: any) => `${ref.name} - ${ref.phoneNumber}`)
      .join('<br/>');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .page {
            padding: 20mm;
            page-break-after: always;
            position: relative;
            min-height: 257mm; /* Approximate A4 height minus some margin */
          }
          .page:last-child {
            page-break-after: auto;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }
          .header-left {
            width: 70%;
            font-size: 24px;
            font-weight: 800;
            text-transform: uppercase;
            color: #000;
            line-height: 1;
          }
          .header-right {
            width: 30%;
            font-size: 14px;
            font-weight: bold;
            color: #666;
            text-align: right;
            align-self: flex-end;
            padding-bottom: 2px;
          }
          .header-line {
            border-bottom: 2px solid #000;
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            background: #f4f4f4;
            padding: 5px 10px;
            margin-bottom: 20px;
            border-left: 4px solid #000;
          }
          .row {
            display: flex;
            margin-bottom: 12px;
            align-items: flex-start;
          }
          .label {
            width: 220px;
            font-weight: bold;
            text-transform: uppercase;
            flex-shrink: 0;
            font-size: 13px;
          }
          .value {
            flex-grow: 1;
            border-bottom: 1px solid #eee;
            min-height: 18px;
            word-wrap: break-word;
            color: #111;
          }
          .bullet {
            width: 20px;
            flex-shrink: 0;
            color: #888;
          }
        </style>
      </head>
      <body>
        <!-- PAGE 1: MAIN APPLICANT -->
        <div class="page">
          ${this.getHtmlHeader(data)}
          
          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">NAME :</div>
            <div class="value">${data.leadName || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">NUMBER :</div>
            <div class="value">${data.phoneNumber || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">MAIL ID :</div>
            <div class="value">${data.email || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">CURRENT ADDRESS :</div>
            <div class="value">${data.addresses?.current || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">PERMANENT ADDRESS :</div>
            <div class="value">${data.addresses?.permanent || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">OFFICE ADDRESS :</div>
            <div class="value">${data.addresses?.office || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">MOTHER NAME :</div>
            <div class="value">${data.motherName || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">DATE OF BIRTH :</div>
            <div class="value">${data.dob || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">NET SALARY :</div>
            <div class="value">${data.financials?.netSalaryInr || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">LOAN AMOUNT :</div>
            <div class="value">${data.financials?.loanAmountInr || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">PRODUCT :</div>
            <div class="value">${data.product || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">TWO REFERENCE WITH NUMBER :</div>
            <div class="value">${referencesHtml}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">OBLIGATION :</div>
            <div class="value">${data.financials?.obligationInr || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">RESIDENT TYPE :</div>
            <div class="value">${data.residentType || ''}</div>
          </div>

          <div class="row">
            <div class="bullet">&bull;</div>
            <div class="label">LEAD BY :</div>
            <div class="value">${data.leadBy || ''}</div>
          </div>
        </div>
    `;

    // ADD PAGES FOR CO-APPLICANTS
    if (data.coApplicants && data.coApplicants.length > 0) {
      data.coApplicants.forEach((co: any, index: number) => {
        html += `
          <div class="page">
            ${this.getHtmlHeader(data)}
            <div class="section-title">Co-Applicant ${index + 1} Details</div>

            <div class="row">
              <div class="bullet">&bull;</div>
              <div class="label">NAME :</div>
              <div class="value">${co.name || ''}</div>
            </div>

            <div class="row">
              <div class="bullet">&bull;</div>
              <div class="label">NUMBER :</div>
              <div class="value">${co.phoneNumber || ''}</div>
            </div>

            <div class="row">
              <div class="bullet">&bull;</div>
              <div class="label">MAIL ID :</div>
              <div class="value">${co.email || ''}</div>
            </div>

            <div class="row">
              <div class="bullet">&bull;</div>
              <div class="label">MOTHER NAME :</div>
              <div class="value">${co.motherName || ''}</div>
            </div>

          </div>
        `;
      });
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }
}
