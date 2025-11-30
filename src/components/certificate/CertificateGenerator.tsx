import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Award, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  course_title: string;
  student_name: string;
}

interface CertificateGeneratorProps {
  certificate: Certificate;
}

export function CertificateGenerator({ certificate }: CertificateGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background
      doc.setFillColor(250, 250, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Border
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Inner border
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Decorative corners
      doc.setFillColor(99, 102, 241);
      const cornerSize = 8;
      doc.triangle(10, 10, 10 + cornerSize, 10, 10, 10 + cornerSize, 'F');
      doc.triangle(pageWidth - 10, 10, pageWidth - 10 - cornerSize, 10, pageWidth - 10, 10 + cornerSize, 'F');
      doc.triangle(10, pageHeight - 10, 10 + cornerSize, pageHeight - 10, 10, pageHeight - 10 - cornerSize, 'F');
      doc.triangle(pageWidth - 10, pageHeight - 10, pageWidth - 10 - cornerSize, pageHeight - 10, pageWidth - 10, pageHeight - 10 - cornerSize, 'F');

      // Draw Lernova Logo (Graduation Cap + Text)
      const logoX = pageWidth / 2;
      const logoY = 35;
      
      // Draw graduation cap icon using shapes
      doc.setFillColor(99, 102, 241);
      // Cap top (diamond/rhombus shape)
      doc.triangle(logoX - 12, logoY - 5, logoX, logoY - 12, logoX + 12, logoY - 5, 'F');
      doc.triangle(logoX - 12, logoY - 5, logoX, logoY + 2, logoX + 12, logoY - 5, 'F');
      // Cap base
      doc.setFillColor(79, 82, 221);
      doc.rect(logoX - 8, logoY, 16, 4, 'F');
      // Tassel
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(1);
      doc.line(logoX + 10, logoY - 3, logoX + 15, logoY + 8);
      doc.setFillColor(99, 102, 241);
      doc.circle(logoX + 15, logoY + 10, 2, 'F');
      
      // Lernova text under cap
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(99, 102, 241);
      doc.text('Lernova', logoX, logoY + 18, { align: 'center' });

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(30, 41, 59);
      doc.text('CERTIFICATE', pageWidth / 2, 60, { align: 'center' });

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(18);
      doc.setTextColor(100, 116, 139);
      doc.text('OF COMPLETION', pageWidth / 2, 72, { align: 'center' });

      // Divider line
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(1);
      doc.line(pageWidth / 2 - 50, 80, pageWidth / 2 + 50, 80);

      // This is to certify
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text('This is to certify that', pageWidth / 2, 95, { align: 'center' });

      // Student name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(30, 41, 59);
      doc.text(certificate.student_name || 'Student', pageWidth / 2, 112, { align: 'center' });

      // Underline for name
      const nameWidth = doc.getTextWidth(certificate.student_name || 'Student');
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - nameWidth / 2, 115, pageWidth / 2 + nameWidth / 2, 115);

      // Has successfully completed
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text('has successfully completed the course', pageWidth / 2, 128, { align: 'center' });

      // Course title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(99, 102, 241);
      
      // Handle long course titles
      const maxWidth = pageWidth - 60;
      const courseTitle = certificate.course_title;
      if (doc.getTextWidth(courseTitle) > maxWidth) {
        doc.setFontSize(18);
      }
      doc.text(courseTitle, pageWidth / 2, 145, { align: 'center', maxWidth: maxWidth });

      // Date and certificate number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      
      const issueDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      doc.text(`Issued on: ${issueDate}`, 40, pageHeight - 35);
      doc.text(`Certificate ID: ${certificate.certificate_number}`, pageWidth - 40, pageHeight - 35, { align: 'right' });

      // Platform name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.text('Lernova', pageWidth / 2, pageHeight - 25, { align: 'center' });

      // Save the PDF
      doc.save(`certificate-${certificate.certificate_number}.pdf`);
      
      toast({
        title: 'Certificate Downloaded',
        description: 'Your certificate has been saved as a PDF.',
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate certificate PDF.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {certificate.course_title}
          </CardTitle>
          <Badge variant="default">Completed</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date(certificate.issued_at).toLocaleDateString()}
            </p>
            <p className="font-mono text-xs">ID: {certificate.certificate_number}</p>
          </div>
          <Button onClick={generatePDF} disabled={generating}>
            <Download className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
