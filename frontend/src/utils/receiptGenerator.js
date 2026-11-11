import jsPDF from 'jspdf';
import { numberToWords } from './helpers';

/**
 * Generate ADIT / CVM Official University Payment Receipt matching the exact sample layout.
 */
export async function generateReceiptPDF(receiptData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 22;
  const contentWidth = pageWidth - marginX * 2; // 166mm

  // Format dates & times
  const paidAt = receiptData.paid_at || receiptData.payment_date || receiptData.created_at || new Date().toISOString();
  const dateObj = new Date(paidAt);
  const pad = (n) => String(n).padStart(2, '0');

  const paidDateStr = `${pad(dateObj.getDate())}-${pad(dateObj.getMonth() + 1)}-${dateObj.getFullYear()}`;
  let hours = dateObj.getHours();
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const paidTimeStr = `${pad(hours)}:${minutes}:${seconds} ${ampm}`;
  const generatedTimestamp = `${paidDateStr} ${paidTimeStr}`;

  // Student name
  const studentName = `${receiptData.first_name || ''} ${receiptData.last_name || ''}`.trim() || 'Student';
  const email = receiptData.email || '-';
  const mobileNumber = receiptData.phone ? `+91-${receiptData.phone}` : '-';
  const erNo = receiptData.roll_number || receiptData.enrollment_no || '-';

  // Fee Type & Template
  const feeType = receiptData.fee_type || 'Tuition Fees';
  const year = dateObj.getFullYear();
  const nextYearShort = String(year + 1).slice(-2);
  const isExam = feeType.toLowerCase().includes('exam');

  const paymentTemplate = isExam
    ? `Examination Fee - Engineering & Technology - UG - AY ${year}-${nextYearShort} - Regular`
    : `ADIT B.Tech ${year}-${nextYearShort} TUTION/COLLEGE FEE`;

  const program = receiptData.course_name
    ? receiptData.course_name.toUpperCase()
    : receiptData.department_name
    ? `BACHELOR OF TECHNOLOGY (${receiptData.department_name.toUpperCase()})`
    : 'BACHELOR OF TECHNOLOGY (COMPUTER ENGINEERING)';

  const college = 'A D PATEL INSTITUTE OF TECHNOLOGY (ADIT)';
  const semester = receiptData.semester ? `SEMESTER ${receiptData.semester}` : 'SEMESTER 3';
  const amountNum = parseFloat(receiptData.amount || 0);
  const amountStr = `${amountNum.toFixed(1)} /-`;
  const amountWords = numberToWords(amountNum);

  const rawMode = (receiptData.payment_method || 'Online').toUpperCase();
  const paymentMode = rawMode === 'CHEQUE'
    ? 'Cheque'
    : rawMode === 'RAZORPAY'
    ? 'Razorpay'
    : rawMode === 'CASHFREE'
    ? 'Cashfree'
    : (receiptData.payment_method || 'Online');

  const txnId = receiptData.receipt_no || receiptData.razorpay_payment_id || receiptData.transaction_id || `REC-${receiptData.id}`;
  const narration = `Amount Received Via ${paymentMode} Ref (${txnId}) dt ${paidDateStr} for Application No/ ER No:${erNo}`;

  // Helper to load image as HTMLImageElement
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  // Pre-load images
  const [cvmLogo, aditLogo] = await Promise.all([
    loadImage('/CVM.png'),
    loadImage('/adit.png'),
  ]);

  // 1. Watermark in the background
  const watermarkImg = cvmLogo || aditLogo;
  if (watermarkImg) {
    try {
      doc.saveGraphicsState();
      // jsPDF support for transparent watermark
      if (doc.setGState && typeof doc.GState === 'function') {
        doc.setGState(new doc.GState({ opacity: 0.06 }));
      }
      const wmWidth = 110;
      const wmHeight = 85;
      doc.addImage(watermarkImg, 'PNG', (pageWidth - wmWidth) / 2, 75, wmWidth, wmHeight);
      doc.restoreGraphicsState();
    } catch {
      // ignore watermark error if not supported
    }
  }

  // 2. Top Header Logo: CVM or ADIT
  const headerLogo = isExam && cvmLogo ? cvmLogo : (aditLogo || cvmLogo);
  if (headerLogo) {
    try {
      const logoW = 32;
      const logoH = 17;
      doc.addImage(headerLogo, 'PNG', (pageWidth - logoW) / 2, 14, logoW, logoH);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('ADIT / CVM UNIVERSITY', pageWidth / 2, 22, { align: 'center' });
    }
  }

  // 3. Receipt Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 116, 144); // #0e7490 blue
  doc.text(`Payment Receipt for ${feeType}`, pageWidth / 2, 36.5, { align: 'center' });

  // 4. Blue Dividing Line
  doc.setDrawColor(2, 132, 199); // #0284c7
  doc.setLineWidth(0.65);
  doc.line(marginX, 39.5, pageWidth - marginX, 39.5);

  // 5. Data Rows
  const rows = [
    ['Paid Date:', paidDateStr],
    ['Paid Time:', paidTimeStr],
    ['Student Name:', studentName],
    ['Email:', email],
    ['Mobile Number:', mobileNumber],
    ['Application / ER No:', erNo],
    ['Payment Type:', feeType],
    ['Payment Template:', paymentTemplate],
    ['Program:', program],
    ['College:', college],
    ['Program Term:', semester],
    ['Amount Paid:', amountStr],
    ['Amount in Words:', amountWords],
    ['Payment Mode:', paymentMode],
    ['Narration:', narration],
  ];

  let currentY = 43;
  const col1Width = 54;
  const col2Width = contentWidth - col1Width; // 112mm

  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.25);

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const splitValue = doc.splitTextToSize(value, col2Width - 6);
    const textHeight = splitValue.length * 4.3;
    const rowHeight = Math.max(7.2, textHeight + 2.8);

    // Row outer boundary
    doc.rect(marginX, currentY, contentWidth, rowHeight);
    // Vertical column separator
    doc.line(marginX + col1Width, currentY, marginX + col1Width, currentY + rowHeight);

    // Left cell label
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(label, marginX + 3.5, currentY + 4.8);

    // Right cell value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(splitValue, marginX + col1Width + 3.5, currentY + 4.8);

    currentY += rowHeight;
  });

  // 6. Security & Verification Section (QR Code & Digital Hash)
  const footerY = currentY + 7;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${generatedTimestamp}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text('All disputes subject to Anand, Gujarat jurisdiction only.', pageWidth / 2, footerY + 3.8, { align: 'center' });
  doc.text('Fees/Charges are subject to refund as per applicable policies. E. and O.E.', pageWidth / 2, footerY + 7.6, { align: 'center' });

  // 7. Official University Footer Address
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('The Charutar Vidya Mandal (CVM) University', pageWidth / 2, footerY + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Shastri Maidan Walkway, Mota Bazaar,', pageWidth / 2, footerY + 17.8, { align: 'center' });
  doc.text('Vallabh Vidyanagar, Anand, Gujarat 388120', pageWidth / 2, footerY + 21.6, { align: 'center' });

  // Save PDF directly to user's device
  const filename = `receipt-${erNo || txnId}.pdf`;
  doc.save(filename);
}
