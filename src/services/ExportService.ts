import JSZip from 'jszip';
import { FolderTreeService } from './FolderTreeService';
import type { MemoryTree, Memory, Person } from '../types';

/**
 * ARCHIVE EXPORT SERVICE
 * Handles exporting the cascading folder structure as ZIP files
 * Supports multiple themes and offline preservation
 */

interface ExportOptions {
  includeMedia?: boolean;
  theme?: 'CLASSIC' | 'MODERN' | 'MINIMAL';
  compressionLevel?: number;
}

class ExportServiceImpl {
  /**
   * Export memory tree as ZIP archive with folder structure
   */
  async exportAsZip(
    tree: MemoryTree,
    familyBio: string,
    options: ExportOptions = {}
  ): Promise<Blob> {
    const {
      includeMedia = true,
      theme = 'CLASSIC',
      compressionLevel = 6,
    } = options;

    const folderService = FolderTreeService.getInstance();
    const archiveStructure = folderService.buildArchiveStructure(tree, familyBio);

    const zip = new JSZip();

    // Add all files to ZIP
    const files = folderService.flattenToFiles(archiveStructure.root);
    
    for (const file of files) {
      if (file.path.includes('media.') && !includeMedia) {
        continue; // Skip media files if not included
      }

      // Add README for easy navigation
      if (file.path.endsWith('family_bio.txt')) {
        this.addREADMEToZip(zip, theme);
      }

      // Handle different content types
      if (typeof file.content === 'string') {
        if (file.path.includes('http') || file.path.includes('data:')) {
          // URL - will be stored as reference
          zip.file(file.path.replace(/^.*\//, ''), file.content);
        } else {
          // Text content
          zip.file(file.path, file.content);
        }
      } else if (file.content instanceof Blob) {
        zip.file(file.path, file.content);
      }
    }

    // Add theme-specific styling
    this.addThemeStyling(zip, theme);

    // Generate ZIP
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: compressionLevel },
    });

    return blob;
  }

  /**
   * Export as interactive HTML archive (self-contained)
   */
  async exportAsHTML(
    tree: MemoryTree
  ): Promise<Blob> {
    const html = this.generateHTMLArchive(tree);
    return new Blob([html], { type: 'text/html' });
  }

  /**
   * Generate self-contained HTML archive
   */
  private generateHTMLArchive(tree: MemoryTree): string {
    const memorysByType = this.groupMemoriesByType(tree.memories);
    const memorysByPerson = this.groupMemoriesByPerson(tree.memories, tree.people);
    const bio = tree.memories.length > 0 ? 'Heritage preserved' : 'Archive begun';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tree.familyName} Memory Archive</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      background: white;
      padding: 3rem 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      margin-bottom: 3rem;
      border-left: 6px solid #1e1b4b;
    }
    h1 {
      color: #1e1b4b;
      font-size: 2.5em;
      margin-bottom: 0.5rem;
      font-weight: 300;
      letter-spacing: 0.02em;
    }
    .subtitle {
      color: #666;
      font-size: 1.1em;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.75rem;
    }
    .bio {
      background: #f9f9f9;
      padding: 2rem;
      border-radius: 8px;
      margin-top: 2rem;
      font-style: italic;
      border-left: 4px solid #b45309;
      line-height: 1.8;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 30px rgba(0,0,0,0.15);
    }
    .card h3 {
      color: #1e1b4b;
      margin-bottom: 1rem;
      font-size: 1.4em;
      font-weight: 600;
    }
    .card p {
      color: #666;
      margin-bottom: 0.5rem;
    }
    .stat {
      font-weight: bold;
      color: #1e1b4b;
      font-size: 1.5em;
    }
    .person-section {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }
    .person-section h2 {
      color: #1e1b4b;
      border-bottom: 2px solid #b45309;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    .memories-list {
      display: grid;
      gap: 1rem;
    }
    .memory-item {
      padding: 1rem;
      background: #f9f9f9;
      border-left: 4px solid #1e1b4b;
      border-radius: 4px;
    }
    .memory-date {
      font-size: 0.85em;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .memory-text {
      margin-top: 0.5rem;
      color: #333;
    }
    footer {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      color: #666;
      margin-top: 3rem;
      border-top: 2px solid #f0f0f0;
    }
    .generated {
      font-size: 0.9em;
      color: #999;
    }
    @media (max-width: 768px) {
      h1 { font-size: 1.8em; }
      .grid { grid-template-columns: 1fr; }
      .container { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${tree.familyName}</h1>
      <p class="subtitle">Memory Archive • Heritage Preservation</p>
      <div class="bio">${this.escapeHtml(bio)}</div>
    </header>

    <div class="grid">
      <div class="card">
        <h3>📊 Archive Overview</h3>
        <p>Family Members: <span class="stat">${tree.people.length}</span></p>
        <p>Total Memories: <span class="stat">${tree.memories.length}</span></p>
        <p>Generated: <span class="stat">${new Date().toLocaleDateString()}</span></p>
      </div>

      <div class="card">
        <h3>📂 Collection Types</h3>
        ${Object.entries(memorysByType)
          .map(
            ([type, count]) =>
              `<p>${this.getTypeEmoji(type)} ${this.capitalize(type)}: <span class="stat">${count}</span></p>`
          )
          .join('')}
      </div>

      <div class="card">
        <h3>👥 Family Statistics</h3>
        <p>Birth Years: ${this.getYearRange(tree.people)}</p>
        <p>Archive Size: <span class="stat">${this.formatSize(new Blob([JSON.stringify(tree)]).size * 10)}</span></p>
      </div>
    </div>

    ${Object.entries(memorysByPerson)
      .map(
        ([personId, memories]) => {
          const person = tree.people.find((p) => p.id === personId);
          if (!person) return '';
          return `
            <div class="person-section">
              <h2>👤 ${this.escapeHtml(person.name)} (b. ${person.birthYear})</h2>
              ${person.bio ? `<p>${this.escapeHtml(person.bio)}</p>` : ''}
              <div class="memories-list">
                ${memories
                  .slice(0, 20)
                  .map(
                    (m) =>
                      `<div class="memory-item">
                  <div class="memory-date">${new Date(m.timestamp).toLocaleDateString()}</div>
                  <div class="memory-text">${this.escapeHtml(m.content.split('|DELIM|')[0] || 'Memory')}</div>
                </div>`
                  )
                  .join('')}
              </div>
            </div>
          `;
        }
      )
      .join('')}

    <footer>
      <p class="generated">Archive generated on ${new Date().toLocaleString()}</p>
      <p>This archive preserves family heritage in perpetuity.</p>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Add README to ZIP for navigation
   */
  private addREADMEToZip(zip: JSZip, theme: string): void {
    const readme = `# Family Memory Archive

This is a cascading folder archive of family memories and heritage.

## Structure

- **Family_Info/**: Family biography and metadata
- **Members/**: Individual family member folders with their memories
  - Each member folder contains:
    - profile.json: Personal information
    - memories/: Organized memory folders with metadata and media
- **Collections/**: Thematic groupings (Photos, Videos, Milestones, etc.)
- **ARCHIVE_INDEX.json**: Comprehensive index of all contents

## Opening This Archive

### On Windows/Mac/Linux
Simply extract the ZIP file using your file manager.

### Viewing Metadata
All metadata is stored in JSON files for easy integration with:
- Document management systems
- Genealogy software
- Digital asset management platforms

### Accessing as Database
Convert the folder structure to:
- CSV for spreadsheet applications
- JSON for web applications
- SQLite for database applications

## Format
Theme: ${theme}
Version: 1.0.0
Generated: ${new Date().toISOString()}

## Preservation
This archive is designed for long-term preservation with:
- Human-readable folder structure
- Self-documenting JSON metadata
- No proprietary formats
- Cross-platform compatibility`;

    zip.file('README.md', readme);
  }

  /**
   * Add theme styling guide
   */
  private addThemeStyling(zip: JSZip, theme: string): void {
    const themes: Record<string, Record<string, string>> = {
      CLASSIC: {
        primary: '#1e1b4b',
        accent: '#b45309',
        description: 'Traditional navy and gold institutional styling',
      },
      MODERN: {
        primary: '#0f172a',
        accent: '#4f46e5',
        description: 'Contemporary indigo with modern accents',
      },
      MINIMAL: {
        primary: '#1a1a1a',
        accent: '#666666',
        description: 'Clean minimal grayscale',
      },
    };

    const themeData = themes[theme] || themes.CLASSIC;

    const styleGuide = `# Archive Style Guide

## Theme: ${theme}

${themeData.description}

Primary Color: ${themeData.primary}
Accent Color: ${themeData.accent}

## CSS Variables

:root {
  --primary: ${themeData.primary};
  --accent: ${themeData.accent};
  --bg: #ffffff;
  --text: #1a1a1a;
  --text-muted: #666666;
}

## Typography

Font Family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
Line Height: 1.6
Letter Spacing: 0.02em (headings)

## Layout

Max Width: 1200px
Padding: 2rem (desktop), 1rem (mobile)
Gap: 2rem
Border Radius: 12px (major), 4px (minor)`;

    zip.file('STYLE_GUIDE.md', styleGuide);
  }

  /**
   * Group memories by type
   */
  private groupMemoriesByType(memories: Memory[]): Record<string, number> {
    const groups: Record<string, number> = {};
    memories.forEach((m) => {
      groups[m.type] = (groups[m.type] || 0) + 1;
    });
    return groups;
  }

  /**
   * Group memories by person
   */
  private groupMemoriesByPerson(memories: Memory[], people: Person[]): Record<string, Memory[]> {
    const groups: Record<string, Memory[]> = {};
    people.forEach((p) => {
      groups[p.id] = memories.filter((m) => m.tags.personIds.includes(p.id));
    });
    return groups;
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get emoji for memory type
   */
  private getTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      image: '📷',
      video: '🎬',
      audio: '🎵',
      document: '📄',
      pdf: '📕',
      text: '✍️',
    };
    return emojis[type] || '📎';
  }

  /**
   * Get year range from people
   */
  private getYearRange(people: Person[]): string {
    const years = people.map((p) => p.birthYear).filter((y) => y);
    if (years.length === 0) return 'N/A';
    return `${Math.min(...years)} - ${Math.max(...years)}`;
  }

  /**
   * Capitalize string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format bytes to readable size
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Singleton instance
let instance: ExportServiceImpl | null = null;

export const ExportService = {
  getInstance(): ExportServiceImpl {
    if (!instance) {
      instance = new ExportServiceImpl();
    }
    return instance;
  },
};
