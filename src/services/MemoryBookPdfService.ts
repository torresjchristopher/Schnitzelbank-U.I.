import jsPDF from 'jspdf';
import type { MemoryTree, Memory, Person } from '../types';

/**
 * MEMORY BOOK PDF SERVICE
 * Generates professional memory book PDFs based on template
 * Displays artifacts chronologically with person photos and metadata
 */

class MemoryBookPdfServiceImpl {
  /**
   * Generate memory book PDF with artifacts organized chronologically
   */
  async generateMemoryBook(
    tree: MemoryTree,
    familyName: string = 'The Murray Family'
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Set up fonts
    doc.setFont('serif');

    // Cover page
    this.addCoverPage(doc, familyName, pageWidth, pageHeight);

    // Sort memories chronologically
    const sortedMemories = [...tree.memories].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Content pages - artifacts with metadata
    let currentY = 30;

    for (const memory of sortedMemories) {
      const itemHeight = this.getArtifactItemHeight(memory, pageWidth, margin);

      // Check if we need a new page
      if (currentY + itemHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      // Add artifact
      currentY = this.addArtifactItem(doc, memory, tree.people, currentY, pageWidth, margin);
      currentY += 5; // Spacing between items
    }

    // Add people index if needed
    const peopleWithoutArtifacts = tree.people.filter(person =>
      !sortedMemories.some(m => m.tags.personIds.includes(person.id))
    );

    if (peopleWithoutArtifacts.length > 0) {
      doc.addPage();
      this.addPeopleIndex(doc, peopleWithoutArtifacts, margin, pageWidth, pageHeight);
    }

    return new Promise((resolve) => {
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }

  private addCoverPage(
    doc: jsPDF,
    familyName: string,
    pageWidth: number,
    pageHeight: number
  ): void {
    // Title
    doc.setFontSize(32);
    doc.setFont('serif', 'bold');
    doc.text(familyName.toUpperCase(), pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(16);
    doc.setFont('serif', 'normal');
    doc.text('FAMILY BOOK', pageWidth / 2, pageHeight / 2 - 5, { align: 'center' });

    // Date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared on ${dateStr}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

    doc.setTextColor(0, 0, 0); // Reset color
  }

  private getArtifactItemHeight(memory: Memory, pageWidth: number, margin: number): number {
    // Estimate height: title + metadata + spacing
    const contentWidth = pageWidth - margin * 2;
    const estimatedLines = Math.ceil((memory.content.length) / (contentWidth / 4)) + 3;
    return estimatedLines * 5 + 10; // ~5mm per line + padding
  }

  private addArtifactItem(
    doc: jsPDF,
    memory: Memory,
    people: Person[],
    startY: number,
    pageWidth: number,
    margin: number
  ): number {
    let currentY = startY;
    const contentWidth = pageWidth - margin * 2;

    // Date and title
    doc.setFontSize(10);
    doc.setFont('serif', 'bold');
    const dateStr = new Date(memory.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.text(`${dateStr}`, margin, currentY);
    currentY += 6;

    // Associated people
    doc.setFontSize(9);
    doc.setFont('serif', 'normal');
    const personNames = people
      .filter(p => memory.tags.personIds.includes(p.id))
      .map(p => p.name)
      .join(', ');
    
    if (personNames) {
      doc.text(`By: ${personNames}`, margin, currentY);
      currentY += 4;
    }

    // Description/content
    doc.setFontSize(9);
    const description = memory.content.split('|DELIM|')[0] || 'Artifact';
    const wrappedText = doc.splitTextToSize(description, contentWidth);
    doc.text(wrappedText, margin, currentY);
    currentY += wrappedText.length * 4 + 2;

    // Divider
    currentY += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 2;

    return currentY;
  }

  private addPeopleIndex(
    doc: jsPDF,
    people: Person[],
    margin: number,
    pageWidth: number,
    pageHeight: number
  ): void {
    doc.setFontSize(14);
    doc.setFont('serif', 'bold');
    doc.text('Family Members', margin, margin + 10);

    doc.setFontSize(10);
    doc.setFont('serif', 'normal');
    let currentY = margin + 25;
    let col = 0;
    const columnWidth = (pageWidth - margin * 2) / 2.5;
    const pageBottom = pageHeight - margin;

    for (const person of people) {
      const x = margin + col * columnWidth;

      if (currentY > pageBottom - 20) {
        doc.addPage();
        currentY = margin + 10;
        col = 0;
      }

      // Name
      doc.setFont('serif', 'bold');
      doc.text(person.name, x, currentY);
      currentY += 5;

      // Birth date
      if (person.birthDate) {
        doc.setFont('serif', 'normal');
        doc.setFontSize(8);
        doc.text(`b. ${person.birthDate}`, x, currentY);
        currentY += 3;
      }

      currentY += 4;
      col = (col + 1) % 3;

      if (col === 0) {
        currentY += 5;
      }
    }
  }
}

// Singleton export
export const MemoryBookPdfService = new MemoryBookPdfServiceImpl();
